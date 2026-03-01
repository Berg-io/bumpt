export type ExternalSeverity = "low" | "medium" | "high" | "critical";
export type InternalSeverity = "low" | "medium" | "high" | "critical";

export interface ItemRiskContext {
  assetCriticality?: number | null;
  environment?: string | null;
  networkExposure?: string | null;
  hostsSensitiveData?: boolean | null;
  hasPrivilegedAccess?: boolean | null;
  hasCompensatingControls?: boolean | null;
}

export interface ExternalMetricsInput {
  cvssV4?: number | null;
  cvssV3?: number | null;
  cvssV2?: number | null;
  vprScore?: number | null;
  epssPercent?: number | null;
  severityText?: string | null;
  vector?: string | null;
  source?: string | null;
  hasKnownCves?: boolean;
  cveCount?: number | null;
  hasKnownExploited?: boolean;
  isEolPast?: boolean;
}

export interface ExternalScoreResult {
  score: number | null;
  severity: ExternalSeverity | null;
  source: string | null;
  vector: string | null;
  epssPercent: number | null;
  vprScore: number | null;
}

export interface InternalScoreResult {
  score: number | null;
  severity: InternalSeverity | null;
  confidence: number;
}

const NEUTRAL_BUSINESS_SCORE = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function severityFromScore(score: number): ExternalSeverity {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function getCveVolumeBonus(cveCount: number): number {
  if (cveCount >= 40) return 15;
  if (cveCount >= 25) return 10;
  if (cveCount >= 10) return 6;
  if (cveCount >= 5) return 3;
  return 0;
}

function normalizeSeverityText(severityText: string | null | undefined): ExternalSeverity | null {
  if (!severityText) return null;
  const s = severityText.trim().toLowerCase();
  if (s.includes("critical") || s.includes("critique")) return "critical";
  if (s.includes("high") || s.includes("elev")) return "high";
  if (s.includes("medium") || s.includes("moder")) return "medium";
  if (s.includes("low") || s.includes("faible")) return "low";
  return null;
}

export function computeExternalScore(input: ExternalMetricsInput): ExternalScoreResult {
  const normalizedCveCount = Math.max(0, Math.floor(input.cveCount ?? 0));
  const hasKnownCves = input.hasKnownCves ?? normalizedCveCount > 0;
  const scoreFromCvss =
    input.cvssV4 ?? input.cvssV3 ?? input.cvssV2 ?? null;

  let score: number | null = null;
  let source = input.source ?? null;

  if (typeof scoreFromCvss === "number") {
    score = clamp(scoreFromCvss * 10, 0, 100);
  } else if (typeof input.vprScore === "number") {
    score = clamp(input.vprScore * 10, 0, 100);
    source = source ?? "vpr";
  } else {
    const normalizedSeverity = normalizeSeverityText(input.severityText);
    if (normalizedSeverity === "critical") score = 95;
    if (normalizedSeverity === "high") score = 80;
    if (normalizedSeverity === "medium") score = 55;
    if (normalizedSeverity === "low") score = 25;
  }

  if (score === null && hasKnownCves) {
    // If we only know CVEs exist but no score source is available,
    // keep a conservative high baseline.
    score = 75;
    source = source ?? "cve_presence";
  }

  if (score !== null && normalizedCveCount > 0) {
    score = clamp(score + getCveVolumeBonus(normalizedCveCount), 0, 100);
  }

  if (input.hasKnownExploited) {
    // Public exploit confirmation materially increases real-world risk.
    score = clamp(Math.max((score ?? 0) + 10, 90), 0, 100);
    source = source ? `${source}+kev` : "kev";
  }

  if (input.isEolPast) {
    // EOL with active vulnerabilities is always critical.
    if (hasKnownCves) {
      score = clamp(Math.max(score ?? 0, 90), 0, 100);
    } else {
      // EOL implies increased operational risk even with sparse CVE data.
      score = clamp(Math.max(score ?? 0, 85), 0, 100);
    }
    source = source ? `${source}+eol` : "eol";
  }

  if (score === null) {
    return {
      score: null,
      severity: null,
      source,
      vector: input.vector ?? null,
      epssPercent: input.epssPercent ?? null,
      vprScore: input.vprScore ?? null,
    };
  }

  return {
    score: round(score),
    severity: severityFromScore(score),
    source,
    vector: input.vector ?? null,
    epssPercent: input.epssPercent ?? null,
    vprScore: input.vprScore ?? null,
  };
}

function normalizeEnvironment(value: string | null | undefined): number | null {
  if (!value) return null;
  if (value === "prod") return 100;
  if (value === "preprod") return 75;
  if (value === "test") return 45;
  if (value === "dev") return 30;
  return null;
}

function normalizeExposure(value: string | null | undefined): number | null {
  if (!value) return null;
  if (value === "internet") return 100;
  if (value === "intranet") return 60;
  if (value === "isolated") return 25;
  return null;
}

function computeBusinessScore(context: ItemRiskContext): { score: number; filled: number; total: number } {
  const parts: number[] = [];
  let filled = 0;

  if (typeof context.assetCriticality === "number") {
    parts.push(clamp(context.assetCriticality, 0, 5) * 20);
    filled++;
  }

  const env = normalizeEnvironment(context.environment);
  if (env !== null) {
    parts.push(env);
    filled++;
  }

  const exposure = normalizeExposure(context.networkExposure);
  if (exposure !== null) {
    parts.push(exposure);
    filled++;
  }

  if (typeof context.hostsSensitiveData === "boolean") {
    parts.push(context.hostsSensitiveData ? 100 : 30);
    filled++;
  }

  if (typeof context.hasPrivilegedAccess === "boolean") {
    parts.push(context.hasPrivilegedAccess ? 100 : 40);
    filled++;
  }

  if (typeof context.hasCompensatingControls === "boolean") {
    parts.push(context.hasCompensatingControls ? 35 : 85);
    filled++;
  }

  const total = 6;
  if (parts.length === 0) {
    return { score: NEUTRAL_BUSINESS_SCORE, filled, total };
  }

  const sum = parts.reduce((acc, value) => acc + value, 0);
  return { score: round(sum / parts.length), filled, total };
}

function severityFromInternalScore(score: number): InternalSeverity {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function computeInternalScore(
  externalScore: number | null,
  context: ItemRiskContext,
  epssPercent?: number | null,
  isEolPast?: boolean,
  cveCount?: number | null
): InternalScoreResult {
  const normalizedCveCount = Math.max(0, Math.floor(cveCount ?? 0));
  const hasKnownCves = normalizedCveCount > 0;
  const technicalScore = externalScore ?? 50;
  const business = computeBusinessScore(context);

  let threatScore = 50;
  if (typeof epssPercent === "number") {
    threatScore = clamp(epssPercent * 100, 0, 100);
  }

  let score = round((0.5 * technicalScore) + (0.2 * threatScore) + (0.3 * business.score));
  if (normalizedCveCount > 0) {
    score = round(clamp(score + getCveVolumeBonus(normalizedCveCount), 0, 100));
  }
  if (isEolPast) {
    if (hasKnownCves) {
      // EOL with active vulnerabilities is always critical.
      score = round(clamp(Math.max(score, 90), 0, 100));
    } else {
      // EOL raises business urgency and remediation priority.
      score = round(clamp(Math.max(score + 10, 85), 0, 100));
    }
  }
  const confidence = clamp(Math.round((business.filled / business.total) * 100), 20, 100);

  return {
    score,
    severity: severityFromInternalScore(score),
    confidence,
  };
}
