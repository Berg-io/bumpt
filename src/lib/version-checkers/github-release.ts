import { getAppSetting } from "@/lib/settings";
import type { VersionCheckResult } from "./types";
import { extractCves } from "./types";
import { compareNormalizedVersions, isPrereleaseVersion, matchesBranch } from "@/lib/version-utils";

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

function isStableRelease(release: GitHubReleasePayload): boolean {
  if (release.draft || release.prerelease) return false;
  return !isPrereleaseVersion(release.tag_name) && !isPrereleaseVersion(release.name);
}

function matchesRepoFlavor(release: GitHubReleasePayload, repoType: string): boolean {
  const needle = repoType.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${release.tag_name ?? ""} ${release.name ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

export async function checkGitHubRelease(repo: string, repoType?: string, branch?: string): Promise<VersionCheckResult> {
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
    const trimmedBranch = branch?.trim();
    if (trimmedBranch) {
      // Latest stable release of the tracked branch (e.g. "16" → newest 16.x).
      // Releases are listed newest first; an older branch (e.g. an LTS line) can sit
      // behind many newer releases, so look through up to 3 pages.
      const matching: GitHubReleasePayload[] = [];
      for (let page = 1; page <= 3 && matching.length === 0; page++) {
        const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`, {
          headers,
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) break;
        const releases = (await res.json()) as GitHubReleasePayload[];
        matching.push(
          ...releases.filter(
            (release) =>
              isStableRelease(release) &&
              (!trimmedRepoType || matchesRepoFlavor(release, trimmedRepoType)) &&
              matchesBranch(release.tag_name, trimmedBranch)
          )
        );
        if (releases.length < 100) break;
      }
      matching.sort((a, b) => compareNormalizedVersions(b.tag_name, a.tag_name));
      return matching[0] ? toResult(matching[0]) : { version: null };
    }

    if (trimmedRepoType) {
      const releasesUrl = `https://api.github.com/repos/${repo}/releases?per_page=30`;
      const releasesRes = await fetch(releasesUrl, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!releasesRes.ok) return { version: null };

      const releases = (await releasesRes.json()) as GitHubReleasePayload[];
      const flavored = releases.filter((release) => !release.draft && matchesRepoFlavor(release, trimmedRepoType));
      // Prefer a stable release; fall back to a pre-release only when the repo has nothing else.
      const match = flavored.find(isStableRelease) ?? flavored[0];
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
    if (isStableRelease(data)) return toResult(data);

    // Some projects flag pre-releases (alpha, rc...) as "latest". Look for the newest stable one.
    const listRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (listRes.ok) {
      const releases = (await listRes.json()) as GitHubReleasePayload[];
      const stable = releases.find(isStableRelease);
      if (stable) return toResult(stable);
    }
    return toResult(data);
  } catch {
    return { version: null };
  }
}
