import type { VersionCheckResult } from "./types";

export async function checkQuay(repository: string): Promise<VersionCheckResult> {
  if (!repository) return { version: null };
  try {
    const res = await fetch(`https://quay.io/api/v1/repository/${repository}/tag/?limit=50&onlyActiveTags=true`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const tags = data.tags as { name: string; last_modified?: string }[] | undefined;
    if (!tags || tags.length === 0) return { version: null };
    const semverTag = tags.find((t) => /^\d+\.\d+/.test(t.name) && !t.name.includes("rc") && !t.name.includes("alpha") && !t.name.includes("beta"));
    const best = semverTag || tags[0];
    return {
      version: best.name,
      releaseDate: best.last_modified || null,
      releaseUrl: `https://quay.io/repository/${repository}`,
    };
  } catch {
    return { version: null };
  }
}
