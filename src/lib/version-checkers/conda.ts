import type { VersionCheckResult } from "./types";

export async function checkConda(identifier: string): Promise<VersionCheckResult> {
  if (!identifier) return { version: null };
  const parts = identifier.split("/");
  const channel = parts.length > 1 ? parts[0] : "conda-forge";
  const pkg = parts.length > 1 ? parts[1] : parts[0];
  try {
    const res = await fetch(`https://api.anaconda.org/package/${encodeURIComponent(channel)}/${encodeURIComponent(pkg)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const latestVersion = data.latest_version || null;
    if (!latestVersion) return { version: null };
    return {
      version: latestVersion,
      description: data.summary || null,
      releaseUrl: `https://anaconda.org/${encodeURIComponent(channel)}/${encodeURIComponent(pkg)}`,
    };
  } catch {
    return { version: null };
  }
}
