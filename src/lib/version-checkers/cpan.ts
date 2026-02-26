import type { VersionCheckResult } from "./types";

export async function checkCpan(distribution: string): Promise<VersionCheckResult> {
  if (!distribution) return { version: null };
  try {
    const res = await fetch(`https://fastapi.metacpan.org/v1/release/${encodeURIComponent(distribution)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const version = data.version || null;
    if (!version) return { version: null };
    return {
      version,
      description: data.abstract || null,
      releaseDate: data.date || null,
      releaseUrl: `https://metacpan.org/release/${encodeURIComponent(distribution)}`,
    };
  } catch {
    return { version: null };
  }
}
