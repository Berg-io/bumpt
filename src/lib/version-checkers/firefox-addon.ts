import type { VersionCheckResult } from "./types";

export async function checkFirefoxAddon(slug: string): Promise<VersionCheckResult> {
  if (!slug) return { version: null };
  try {
    const res = await fetch(`https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(slug)}/`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const version = data.current_version?.version || null;
    if (!version) return { version: null };
    return {
      version,
      description: data.summary?.["en-US"] || data.summary?.["en"] || (typeof data.summary === "string" ? data.summary : null),
      releaseNotes: data.current_version?.release_notes?.["en-US"] || data.current_version?.release_notes?.["en"] || null,
      releaseUrl: data.url || `https://addons.mozilla.org/firefox/addon/${encodeURIComponent(slug)}/`,
    };
  } catch {
    return { version: null };
  }
}
