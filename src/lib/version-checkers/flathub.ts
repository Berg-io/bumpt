import type { VersionCheckResult } from "./types";

export async function checkFlathub(appId: string): Promise<VersionCheckResult> {
  if (!appId) return { version: null };

  try {
    const url = `https://flathub.org/api/v2/appstream/${encodeURIComponent(appId)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();

    const releases = data.releases as Array<{
      version: string;
      timestamp?: number;
      description?: string;
    }> | undefined;

    const latest = releases?.[0];
    const version = latest?.version || null;
    if (!version) return { version: null };

    const defaultLocale = Object.keys(data.name || {})[0] || "C";

    return {
      version,
      description: data.summary?.[defaultLocale] || null,
      releaseNotes: latest?.description || null,
      releaseDate: latest?.timestamp
        ? new Date(latest.timestamp * 1000).toISOString()
        : null,
      releaseUrl: `https://flathub.org/apps/${appId}`,
      rawMetadata: {
        name: data.name?.[defaultLocale],
        developer: data.developer_name?.[defaultLocale],
        license: data.project_license,
      },
    };
  } catch {
    return { version: null };
  }
}
