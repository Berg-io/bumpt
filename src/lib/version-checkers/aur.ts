import type { VersionCheckResult } from "./types";

export async function checkAur(packageName: string): Promise<VersionCheckResult> {
  if (!packageName) return { version: null };
  try {
    const res = await fetch(`https://aur.archlinux.org/rpc/v5/info/${encodeURIComponent(packageName)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const results = data.results as { Version?: string; Description?: string; LastModified?: number; URL?: string }[] | undefined;
    if (!results || results.length === 0) return { version: null };
    const pkg = results[0];
    return {
      version: pkg.Version || null,
      description: pkg.Description || null,
      releaseDate: pkg.LastModified ? new Date(pkg.LastModified * 1000).toISOString() : null,
      releaseUrl: pkg.URL || `https://aur.archlinux.org/packages/${encodeURIComponent(packageName)}`,
    };
  } catch {
    return { version: null };
  }
}
