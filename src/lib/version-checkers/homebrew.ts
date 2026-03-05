import type { VersionCheckResult } from "./types";

interface HomebrewFormula {
  versions: { stable: string };
  desc?: string;
  homepage?: string;
  license?: string;
}

export async function checkHomebrew(formula: string): Promise<VersionCheckResult> {
  if (!formula) return { version: null };

  try {
    const url = `https://formulae.brew.sh/api/formula/${encodeURIComponent(formula)}.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };

    const data = (await res.json()) as HomebrewFormula;
    const version = data.versions?.stable || null;

    return {
      version,
      description: data.desc || null,
      releaseUrl: data.homepage || null,
      rawMetadata: {
        license: data.license,
      },
    };
  } catch {
    return { version: null };
  }
}
