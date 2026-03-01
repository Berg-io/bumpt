import { z } from "zod";
import { buildPrompt } from "./prompt";
import type {
  AIEnrichmentInput,
  AIEnrichmentResult,
  AIEnrichmentServiceConfig,
  AIProvider,
} from "./types";

const GeneratedDataSchema = z.object({
  risk_summary: z.string().min(1).max(3000).default(""),
  exploitability_assessment: z.string().min(1).max(3000).default(""),
  business_impact: z.string().min(1).max(3000).default(""),
  remediation_priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  recommended_actions: z.array(z.string().min(1).max(500)).max(12).default([]),
});

const ProviderResponseSchema = z.object({
  ai_generated_data: GeneratedDataSchema.default({
    risk_summary: "",
    exploitability_assessment: "",
    business_impact: "",
    remediation_priority: "medium",
    recommended_actions: [],
  }),
  confidence_level: z.union([z.number(), z.string()]).optional(),
  sources: z.array(z.string().min(1).max(120)).optional(),
  notes: z.union([z.array(z.string().min(1).max(500)), z.string().min(1).max(500)]).optional(),
});

export interface AIEnrichmentServiceDeps {
  logger?: Pick<Console, "warn" | "error" | "info">;
}

export class AIEnrichmentService {
  private readonly logger: Pick<Console, "warn" | "error" | "info">;
  private usedQuota = 0;

  constructor(deps: AIEnrichmentServiceDeps = {}) {
    this.logger = deps.logger ?? console;
  }

  async enrich(
    provider: AIProvider,
    config: AIEnrichmentServiceConfig,
    input: AIEnrichmentInput
  ): Promise<AIEnrichmentResult | null> {
    if (this.usedQuota >= config.quotaPerRun) {
      this.logger.warn(`[AI Enrichment] quota reached for provider=${provider.name}`);
      return null;
    }
    this.usedQuota += 1;

    const prompt = buildPrompt(input, config.promptTemplate);
    const raw = await this.withRetry(
      () => provider.analyze(prompt, { timeoutMs: config.timeoutMs }),
      config.maxRetries
    );
    if (!raw) return null;

    const parsed = this.parseProviderResponse(raw);
    if (!parsed) return null;

    const confidence = normalizeConfidence(parsed.confidence_level);
    const notes = normalizeNotes(parsed.notes);
    const sources = normalizeSources(parsed.sources, provider.name);

    return {
      verified_data: {
        item_id: input.itemId,
        item_name: input.itemName,
        item_type: input.itemType,
        current_version: input.currentVersion,
        latest_version: input.latestVersion,
        cve_count: input.cves.length,
        cves: input.cves,
        external_score: input.externalScore,
        external_severity: input.externalSeverity,
        internal_score: input.internalScore,
        internal_severity: input.internalSeverity,
      },
      ai_generated_data: parsed.ai_generated_data,
      confidence_level: confidence,
      sources,
      notes: [
        ...notes,
        "ai_generated_data_requires_human_validation",
      ],
    };
  }

  private async withRetry(run: () => Promise<string>, maxRetries: number): Promise<string | null> {
    let attempt = 0;
    let waitMs = 500;
    while (attempt <= maxRetries) {
      try {
        return await run();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const retryable = isRetryableError(message);
        if (!retryable || attempt === maxRetries) {
          this.logger.warn(`[AI Enrichment] provider call failed: ${redactError(message)}`);
          return null;
        }
        await sleep(waitMs);
        waitMs = Math.min(waitMs * 2, 4000);
        attempt += 1;
      }
    }
    return null;
  }

  private parseProviderResponse(raw: string): z.infer<typeof ProviderResponseSchema> | null {
    const jsonChunk = extractJsonChunk(raw);
    if (!jsonChunk) {
      this.logger.warn("[AI Enrichment] provider response is not valid JSON");
      return null;
    }
    try {
      const candidate = JSON.parse(jsonChunk) as unknown;
      const parsed = ProviderResponseSchema.safeParse(candidate);
      if (!parsed.success) {
        this.logger.warn("[AI Enrichment] provider response failed schema validation");
        return null;
      }
      return parsed.data;
    } catch {
      this.logger.warn("[AI Enrichment] provider response JSON parsing failed");
      return null;
    }
  }
}

function extractJsonChunk(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

function normalizeConfidence(value: string | number | undefined): number {
  const asNum = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(asNum)) return 50;
  return Math.max(0, Math.min(100, Math.round(asNum)));
}

function normalizeNotes(value: string[] | string | undefined): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return dedupe(list.map((v) => String(v).trim()).filter(Boolean).slice(0, 12));
}

function normalizeSources(value: string[] | undefined, providerName: string): string[] {
  const list = (value ?? []).map((v) => String(v).trim()).filter(Boolean);
  list.push(`provider:${providerName.toLowerCase()}`);
  return dedupe(list).slice(0, 20);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function isRetryableError(message: string): boolean {
  return (
    message.includes("429") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    /\b5\d\d\b/.test(message)
  );
}

function redactError(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer ***")
    .replace(/(api[-_ ]?key["'=:\s]+)[A-Za-z0-9._-]+/gi, "$1***")
    .slice(0, 240);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
