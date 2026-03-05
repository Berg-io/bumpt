import { getAppSetting } from "@/lib/settings";
import type { VersionCheckResult } from "./types";
import { extractCves } from "./types";

export async function checkGitHubRelease(repo: string): Promise<VersionCheckResult> {
  try {
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "bumpt/1.0",
    };

    const token = await getAppSetting("github_token") || process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };

    const data = await res.json();
    const tagName = data.tag_name as string;
    const version = tagName?.replace(/^v/, "") || null;

    const assets = data.assets as Array<{ browser_download_url: string }> | undefined;
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
  } catch {
    return { version: null };
  }
}
