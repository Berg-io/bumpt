import type { VersionCheckResult } from "./types";

function parseCdate(cdate: unknown): string | null {
  if (!cdate) return null;
  const ts = typeof cdate === "number" ? cdate : Number(cdate);
  if (isNaN(ts)) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function checkJetbrains(pluginId: string): Promise<VersionCheckResult> {
  if (!pluginId) return { version: null };
  try {
    const res = await fetch(`https://plugins.jetbrains.com/api/plugins/${encodeURIComponent(pluginId)}/updates?size=1`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const updates = await res.json();
    if (!Array.isArray(updates) || updates.length === 0) return { version: null };
    const latest = updates[0];
    return {
      version: latest.version || null,
      releaseDate: parseCdate(latest.cdate),
      releaseNotes: latest.notes || null,
      releaseUrl: `https://plugins.jetbrains.com/plugin/${encodeURIComponent(pluginId)}`,
    };
  } catch {
    return { version: null };
  }
}
