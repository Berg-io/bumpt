import type { VersionCheckResult } from "./types";

export async function checkRubyGems(gemName: string): Promise<VersionCheckResult> {
  if (!gemName) return { version: null };

  try {
    const url = `https://rubygems.org/api/v1/gems/${encodeURIComponent(gemName)}.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();
    const version = data.version || null;
    if (!version) return { version: null };

    const changelogUrl =
      data.changelog_uri ||
      data.metadata?.changelog_uri ||
      data.source_code_uri ||
      data.project_uri ||
      null;

    return {
      version,
      description: data.info || null,
      releaseDate: data.version_created_at || null,
      releaseUrl: changelogUrl,
      downloadUrl: data.gem_uri || null,
      rawMetadata: {
        authors: data.authors,
        licenses: data.licenses,
        downloads: data.downloads,
        homepage: data.homepage_uri,
        sourceCode: data.source_code_uri,
      },
    };
  } catch {
    return { version: null };
  }
}
