import { getAppSetting } from "@/lib/settings";
import type { VersionCheckResult } from "./types";
import { extractCves } from "./types";

export async function checkGitLabRelease(project: string): Promise<VersionCheckResult> {
  if (!project) return { version: null };

  try {
    const encoded = encodeURIComponent(project);
    const url = `https://gitlab.com/api/v4/projects/${encoded}/releases?per_page=1`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "bumpt/1.0",
    };

    const token = await getAppSetting("gitlab_token");
    if (token) {
      headers["PRIVATE-TOKEN"] = token;
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { version: null };

    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) return { version: null };

    const latest = releases[0];
    const tagName = latest.tag_name as string;
    const version = tagName?.replace(/^v/, "") || null;

    const assets = latest.assets?.links as Array<{ url: string }> | undefined;
    const firstAssetUrl = assets?.[0]?.url ?? null;

    return {
      version,
      releaseNotes: (latest.description as string) || null,
      releaseDate: (latest.released_at as string) || (latest.created_at as string) || null,
      releaseUrl: latest._links?.self ? `https://gitlab.com/${project}/-/releases/${tagName}` : null,
      downloadUrl: firstAssetUrl,
      cves: extractCves(latest.description as string),
      rawMetadata: {
        name: latest.name,
        author: latest.author?.username,
      },
    };
  } catch {
    return { version: null };
  }
}
