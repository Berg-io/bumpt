import type { VersionCheckResult } from "./types";

export async function checkOpenVsx(extensionId: string): Promise<VersionCheckResult> {
  if (!extensionId) return { version: null };
  const parts = extensionId.split(".");
  if (parts.length < 2) return { version: null };
  const [publisher, name] = [parts[0], parts.slice(1).join(".")];
  try {
    const res = await fetch(`https://open-vsx.org/api/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const version = data.version || null;
    if (!version) return { version: null };
    return {
      version,
      description: data.description || null,
      releaseDate: data.timestamp || null,
      releaseUrl: data.url || `https://open-vsx.org/extension/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}`,
    };
  } catch {
    return { version: null };
  }
}
