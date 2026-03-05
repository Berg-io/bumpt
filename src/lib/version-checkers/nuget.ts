import type { VersionCheckResult } from "./types";

interface NugetVersionRef {
  version?: string;
  "@id"?: string;
}

interface NugetSearchPackage {
  version?: string;
  description?: string;
  summary?: string;
  authors?: string[];
  totalDownloads?: number;
  verified?: boolean;
  tags?: string[] | string;
  versions?: NugetVersionRef[];
}

interface NugetLeaf {
  published?: string;
  packageContent?: string;
}

export async function checkNuGet(packageName: string): Promise<VersionCheckResult> {
  if (!packageName) return { version: null };

  try {
    const url = `https://azuresearch-usnc.nuget.org/query?q=packageid:${encodeURIComponent(packageName)}&take=1&prerelease=false`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();
    const pkg = data?.data?.[0] as NugetSearchPackage | undefined;
    if (!pkg) return { version: null };

    const version = pkg.version || null;
    if (!version) return { version: null };

    let releaseDate: string | null = null;
    let downloadUrl: string | null = `https://api.nuget.org/v3-flatcontainer/${packageName.toLowerCase()}/${version}/${packageName.toLowerCase()}.${version}.nupkg`;
    const versionRef = pkg.versions?.find((v) => v.version === version);
    const versionLeafUrl = versionRef?.["@id"];
    if (versionLeafUrl) {
      try {
        const leafRes = await fetch(versionLeafUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(7000),
        });
        if (leafRes.ok) {
          const leaf = (await leafRes.json()) as NugetLeaf;
          releaseDate = leaf.published || null;
          if (leaf.packageContent) {
            downloadUrl = leaf.packageContent;
          }
        }
      } catch {
        // Non critical: keep default URLs when leaf request fails.
      }
    }

    return {
      version,
      description: pkg.description || null,
      releaseNotes: pkg.summary || null,
      releaseDate,
      releaseUrl: `https://www.nuget.org/packages/${packageName}/${version}`,
      downloadUrl,
      rawMetadata: {
        authors: pkg.authors,
        totalDownloads: pkg.totalDownloads,
        verified: pkg.verified,
        tags: pkg.tags,
      },
    };
  } catch {
    return { version: null };
  }
}
