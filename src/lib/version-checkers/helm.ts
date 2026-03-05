import type { VersionCheckResult } from "./types";

export async function checkHelm(chart: string): Promise<VersionCheckResult> {
  if (!chart) return { version: null };

  const parts = chart.split("/");
  if (parts.length !== 2) return { version: null };
  const [repo, chartName] = parts;

  try {
    const url = `https://artifacthub.io/api/v1/packages/helm/${encodeURIComponent(repo)}/${encodeURIComponent(chartName)}`;
    const res = await fetch(url, {
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
      releaseDate: data.created_at
        ? new Date(data.created_at * 1000).toISOString()
        : data.ts
          ? new Date(data.ts * 1000).toISOString()
          : null,
      releaseUrl: `https://artifacthub.io/packages/helm/${repo}/${chartName}/${version}`,
      rawMetadata: {
        appVersion: data.app_version,
        repository: data.repository?.name,
        stars: data.stars,
        license: data.license,
      },
    };
  } catch {
    return { version: null };
  }
}
