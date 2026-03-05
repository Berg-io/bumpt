export interface VersionCheckResult {
  version: string | null;
  releaseNotes?: string | null;
  releaseDate?: string | null;
  releaseUrl?: string | null;
  cves?: string[] | null;
  description?: string | null;
  downloadUrl?: string | null;
  eolDate?: string | null;
  isLts?: boolean | null;
  rawMetadata?: Record<string, unknown> | null;
}

export function versionOnly(version: string | null): VersionCheckResult {
  return { version };
}

const CVE_PATTERN = /\bCVE-\d{4}-\d{4,}\b/gi;

function normalizeCve(cve: string): string {
  return cve.toUpperCase().replace(/[.,;:!?)]*$/, "");
}

export function extractCves(text: string | null | undefined): string[] | null {
  if (!text) return null;
  const matches = text.match(CVE_PATTERN);
  if (!matches || matches.length === 0) return null;
  return [...new Set(matches.map((m) => normalizeCve(m)))];
}
