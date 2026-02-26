import type { VersionCheckResult } from "./types";

interface VersionEntry {
  version: string;
}

interface ReleaseEntry {
  version: string;
  serving?: { startTime?: string };
}

interface VersionHistoryResponse {
  versions: VersionEntry[];
}

interface ReleaseHistoryResponse {
  releases: ReleaseEntry[];
}

export async function checkChromeVersion(
  platform: string = "win64",
  channel: string = "stable"
): Promise<VersionCheckResult> {
  try {
    const versionUrl = `https://versionhistory.googleapis.com/v1/chrome/platforms/${platform}/channels/${channel}/versions?pageSize=1`;
    const versionRes = await fetch(versionUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!versionRes.ok) return { version: null };

    const versionData = (await versionRes.json()) as VersionHistoryResponse;
    const version = versionData.versions?.[0]?.version || null;
    if (!version) return { version: null };

    let releaseDate: string | null = null;
    try {
      const releaseUrl = `https://versionhistory.googleapis.com/v1/chrome/platforms/${platform}/channels/${channel}/versions/${version}/releases?pageSize=1`;
      const releaseRes = await fetch(releaseUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (releaseRes.ok) {
        const releaseData = (await releaseRes.json()) as ReleaseHistoryResponse;
        releaseDate = releaseData.releases?.[0]?.serving?.startTime || null;
      }
    } catch { /* non-critical */ }

    const majorVersion = version.split(".")[0];

    return {
      version,
      releaseDate,
      releaseUrl: `https://chromereleases.googleblog.com/search/label/Stable%20updates`,
      rawMetadata: {
        platform,
        channel,
        majorVersion,
      },
    };
  } catch {
    return { version: null };
  }
}
