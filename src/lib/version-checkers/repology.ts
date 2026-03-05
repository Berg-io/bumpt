import type { VersionCheckResult } from "./types";

interface RepologyPackage {
  version: string;
  status: string;
  repo: string;
  summary?: string;
  srcname?: string;
  origversion?: string;
  www?: string[];
}

export async function checkRepology(project: string): Promise<VersionCheckResult> {
  if (!project) return { version: null };

  try {
    const url = `https://repology.org/api/v1/project/${encodeURIComponent(project)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "bumpt/1.0",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };

    const packages = (await res.json()) as RepologyPackage[];
    if (!packages || packages.length === 0) return { version: null };

    const newest = packages.find((p) => p.status === "newest");
    const selected = newest || packages[0];

    const wwwUrl = packages.find((p) => p.www && p.www.length > 0)?.www?.[0] ?? null;
    const description = selected.summary || packages.find((p) => p.summary)?.summary || null;
    const repologyProjectUrl = `https://repology.org/project/${encodeURIComponent(project)}/versions`;

    return {
      version: selected.version || null,
      description,
      releaseUrl: repologyProjectUrl,
      downloadUrl: wwwUrl,
      rawMetadata: {
        repo: selected.repo,
        status: selected.status,
        totalPackages: packages.length,
      },
    };
  } catch {
    return { version: null };
  }
}
