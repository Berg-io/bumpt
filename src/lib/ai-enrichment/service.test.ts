import test from "node:test";
import assert from "node:assert/strict";
import { AIEnrichmentService } from "./service";
import type { AIProvider } from "./types";

const input = {
  itemId: "item-1",
  itemName: "nginx",
  itemType: "dockerhub",
  currentVersion: "1.20",
  latestVersion: "1.25",
  cves: ["CVE-2024-0001", "CVE-2024-0002"],
  releaseNotes: "security fixes",
  description: "web server",
  rawMetadata: '{"source":"nvd"}',
  externalScore: 90,
  externalSeverity: "critical",
  internalScore: 88,
  internalSeverity: "high",
  language: "en",
};

test("AIEnrichmentService retries and normalizes provider response", async () => {
  let callCount = 0;
  const provider: AIProvider = {
    name: "OpenAI",
    async analyze() {
      callCount += 1;
      if (callCount === 1) throw new Error("OpenAI API error 429");
      return JSON.stringify({
        ai_generated_data: {
          risk_summary: "High risk due to known exploitable CVEs.",
          exploitability_assessment: "Public exploit signals present.",
          business_impact: "Potential service disruption.",
          remediation_priority: "critical",
          recommended_actions: ["Patch immediately", "Monitor exploit activity"],
        },
        confidence_level: "86",
        sources: ["NVD", "CISA KEV"],
        notes: ["Model inference based on public data"],
      });
    },
  };

  const service = new AIEnrichmentService();
  const result = await service.enrich(
    provider,
    {
      provider: "openai",
      apiKey: "secret",
      model: "gpt-test",
      timeoutMs: 3000,
      maxRetries: 1,
      quotaPerRun: 10,
    },
    input
  );

  assert.equal(callCount, 2);
  assert.ok(result);
  assert.equal(result?.verified_data.cve_count, 2);
  assert.equal(result?.ai_generated_data.remediation_priority, "critical");
  assert.equal(result?.confidence_level, 86);
  assert.ok(result?.notes.includes("ai_generated_data_requires_human_validation"));
});

test("AIEnrichmentService returns null on invalid provider payload", async () => {
  const provider: AIProvider = {
    name: "OpenAI",
    async analyze() {
      return "not-json";
    },
  };
  const service = new AIEnrichmentService();
  const result = await service.enrich(
    provider,
    {
      provider: "openai",
      timeoutMs: 2000,
      maxRetries: 0,
      quotaPerRun: 10,
    },
    input
  );
  assert.equal(result, null);
});

test("AIEnrichmentService fallback without AI when quota exhausted", async () => {
  const provider: AIProvider = {
    name: "OpenAI",
    async analyze() {
      return JSON.stringify({
        ai_generated_data: {
          risk_summary: "x",
          exploitability_assessment: "x",
          business_impact: "x",
          remediation_priority: "low",
          recommended_actions: ["x"],
        },
      });
    },
  };
  const service = new AIEnrichmentService();
  const first = await service.enrich(
    provider,
    {
      provider: "openai",
      timeoutMs: 2000,
      maxRetries: 0,
      quotaPerRun: 1,
    },
    input
  );
  const second = await service.enrich(
    provider,
    {
      provider: "openai",
      timeoutMs: 2000,
      maxRetries: 0,
      quotaPerRun: 1,
    },
    input
  );
  assert.ok(first);
  assert.equal(second, null);
});
