import { getAppSetting } from "@/lib/settings";
import type { VersionCheckResult } from "./types";
import { extractCves } from "./types";

interface GitHubReleasePayload {
  tag_name?: string;
  body?: string;
  published_at?: string;
  html_url?: string;
  name?: string;
  prerelease?: boolean;
  draft?: boolean;
  author?: { login?: string };
  assets?: Array<{ browser_download_url?: string }>;
}

function toResult(data: GitHubReleasePayload): VersionCheckResult {
  const tagName = data.tag_name as string | undefined;
  const version = tagName?.replace(/^v/, "") || null;
  const assets = data.assets as Array<{ browser_download_url?: string }> | undefined;
  const firstAssetUrl = assets?.[0]?.browser_download_url ?? null;

  return {
    version,
    releaseNotes: (data.body as string) || null,
    releaseDate: (data.published_at as string) || null,
    releaseUrl: (data.html_url as string) || null,
    downloadUrl: firstAssetUrl,
    cves: extractCves(data.body as string),
    rawMetadata: {
      name: data.name,
      prerelease: data.prerelease,
      draft: data.draft,
      author: data.author?.login,
      assetsCount: assets?.length ?? 0,
    },
  };
}

function matchesRepoFlavor(release: GitHubReleasePayload, repoType: string): boolean {
  const needle = repoType.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${release.tag_name ?? ""} ${release.name ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

export async function checkGitHubRelease(repo: string, repoType?: string): Promise<VersionCheckResult> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "bumpt/1.0",
    };

    const token = await getAppSetting("github_token") || process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const trimmedRepoType = repoType?.trim();
    if (trimmedRepoType) {
      const releasesUrl = `https://api.github.com/repos/${repo}/releases?per_page=30`;
      const releasesRes = await fetch(releasesUrl, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!releasesRes.ok) return { version: null };

      const releases = (await releasesRes.json()) as GitHubReleasePayload[];
      const match = releases.find((release) => !release.draft && matchesRepoFlavor(release, trimmedRepoType));
      if (!match) return { version: null };
      return toResult(match);
    }

    const latestUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    const latestRes = await fetch(latestUrl, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!latestRes.ok) return { version: null };

    const data = (await latestRes.json()) as GitHubReleasePayload;
    return toResult(data);
  } catch {
    return { version: null };
  }
}
