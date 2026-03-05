import type { VersionCheckResult } from "./types";

export async function checkCrates(crateName: string): Promise<VersionCheckResult> {
  if (!crateName) return { version: null };

  try {
    const url = `https://crates.io/api/v1/crates/${encodeURIComponent(crateName)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "bumpt/1.0 (https://github.com/nicollmusic/bumpt)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();
    const crate = data?.crate;
    if (!crate) return { version: null };

    const version = crate.max_stable_version || crate.max_version || crate.newest_version || null;
    if (!version) return { version: null };

    const versionInfo = data.versions?.find(
      (v: { num: string }) => v.num === version
    );

    return {
      version,
      description: crate.description || null,
      releaseDate: versionInfo?.created_at || crate.updated_at || null,
      releaseUrl: `https://crates.io/crates/${crateName}/${version}`,
      downloadUrl: versionInfo?.dl_path
        ? `https://crates.io${versionInfo.dl_path}`
        : null,
      rawMetadata: {
        downloads: crate.downloads,
        license: versionInfo?.license,
        homepage: crate.homepage,
        repository: crate.repository,
      },
    };
  } catch {
    return { version: null };
  }
}
