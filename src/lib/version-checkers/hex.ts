import type { VersionCheckResult } from "./types";

export async function checkHex(packageName: string): Promise<VersionCheckResult> {
  if (!packageName) return { version: null };
  try {
    const res = await fetch(`https://hex.pm/api/packages/${encodeURIComponent(packageName)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const releases = data.releases as { version: string; inserted_at?: string }[] | undefined;
    if (!releases || releases.length === 0) return { version: null };
    const latest = releases[0];
    return {
      version: latest.version,
      description: data.meta?.description || null,
      releaseDate: latest.inserted_at || null,
      releaseUrl: `https://hex.pm/packages/${encodeURIComponent(packageName)}`,
    };
  } catch {
    return { version: null };
  }
}
