import type { VersionCheckResult } from "./types";

export async function checkVscodeMarketplace(extensionId: string): Promise<VersionCheckResult> {
  if (!extensionId) return { version: null };
  try {
    const res = await fetch("https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;api-version=6.0-preview.1",
      },
      body: JSON.stringify({
        filters: [{ criteria: [{ filterType: 7, value: extensionId }] }],
        flags: 914,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const ext = data.results?.[0]?.extensions?.[0];
    if (!ext) return { version: null };
    const latestVersion = ext.versions?.[0]?.version || null;
    if (!latestVersion) return { version: null };
    return {
      version: latestVersion,
      description: ext.shortDescription || null,
      releaseDate: ext.versions?.[0]?.lastUpdated || null,
      releaseUrl: `https://marketplace.visualstudio.com/items?itemName=${encodeURIComponent(extensionId)}`,
    };
  } catch {
    return { version: null };
  }
}
