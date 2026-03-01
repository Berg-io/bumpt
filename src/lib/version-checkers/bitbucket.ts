import { getAppSetting } from "@/lib/settings";
import type { VersionCheckResult } from "./types";

interface BitbucketTag {
  name: string;
  message?: string;
  date?: string;
  target?: {
    date?: string;
    message?: string;
  };
  links?: {
    html?: {
      href?: string;
    };
  };
}

interface BitbucketRepoResponse {
  description?: string;
  website?: string;
}

function normalizeReleaseText(input: string | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(/\[skip ci]/gi, "").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

export async function checkBitbucket(repo: string): Promise<VersionCheckResult> {
  if (!repo) return { version: null };
  try {
    const token = await getAppSetting("bitbucket_token") || process.env.BITBUCKET_TOKEN;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
      headers.Authorization = `Basic ${Buffer.from(token).toString("base64")}`;
    }

    const res = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${repo}/refs/tags?sort=-target.date&pagelen=10`,
      { headers, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return { version: null };
    const data = await res.json();
    const tags = data.values as BitbucketTag[] | undefined;
    if (!tags || tags.length === 0) return { version: null };
    const semverTag = tags.find((t) => /^\d+\.\d+/.test(t.name.replace(/^v/, "")));
    const best = semverTag || tags[0];

    let description: string | null = null;
    let homepage: string | null = null;
    try {
      const repoRes = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${repo}`,
        { headers, signal: AbortSignal.timeout(7000) },
      );
      if (repoRes.ok) {
        const repoData = (await repoRes.json()) as BitbucketRepoResponse;
        description = repoData.description?.trim() || null;
        homepage = repoData.website?.trim() || null;
      }
    } catch {
      // Non critical: tag data already provides core version fields.
    }

    const releaseTagUrl = best.links?.html?.href || `https://bitbucket.org/${repo}/src/${encodeURIComponent(best.name)}/`;

    return {
      version: best.name.replace(/^v/, ""),
      description,
      releaseNotes: normalizeReleaseText(best.message) || normalizeReleaseText(best.target?.message),
      releaseDate: best.date || best.target?.date || null,
      releaseUrl: releaseTagUrl,
      downloadUrl: homepage || `https://bitbucket.org/${repo}/get/${encodeURIComponent(best.name)}.zip`,
    };
  } catch {
    return { version: null };
  }
}
