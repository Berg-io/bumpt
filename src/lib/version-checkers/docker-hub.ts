import type { VersionCheckResult } from "./types";
import { compareNormalizedVersions } from "@/lib/version-utils";

interface DockerTag {
  name: string;
  last_updated?: string;
}

interface DockerRepoInfo {
  description?: string;
  full_description?: string;
  star_count?: number;
  pull_count?: number;
}

interface TagCandidate {
  tag: DockerTag;
  tier: number;
  version: string;
}

const SKIP_EXACT = new Set([
  "latest", "develop", "edge", "nightly", "beta", "alpha",
  "rc", "test", "main", "master", "next",
]);

const CLEAN_SEMVER = /^v?\d+(\.\d+){1,3}$/;
const LOOSE_SEMVER = /^v?\d+(\.\d+){1,3}(-[a-zA-Z0-9._-]+)?$/;

function isDistroVariant(name: string): boolean {
  return /-(?:alpine|slim|bookworm|bullseye|buster|jammy|focal|trixie|noble|perl|ubuntu|debian)/i.test(name) ||
    name.includes("-latest");
}

function classifyTag(tag: DockerTag): TagCandidate | null {
  if (SKIP_EXACT.has(tag.name)) return null;

  if (CLEAN_SEMVER.test(tag.name)) {
    return {
      tag,
      tier: 0,
      version: tag.name.replace(/^v/, ""),
    };
  }

  if (LOOSE_SEMVER.test(tag.name) && !isDistroVariant(tag.name)) {
    return {
      tag,
      tier: 1,
      version: tag.name.replace(/^v/, "").replace(/-[a-zA-Z].*$/, ""),
    };
  }

  if (LOOSE_SEMVER.test(tag.name)) {
    return {
      tag,
      tier: 2,
      version: tag.name.replace(/^v/, "").replace(/-[a-zA-Z].*$/, ""),
    };
  }

  if (/^\d+/.test(tag.name)) {
    return {
      tag,
      tier: 3,
      version: tag.name.replace(/^v/, "").replace(/-[a-zA-Z].*$/, ""),
    };
  }

  return null;
}

function pickHighestVersionTag(candidates: TagCandidate[]): TagCandidate | null {
  if (candidates.length === 0) return null;

  const bestTier = Math.min(...candidates.map((candidate) => candidate.tier));
  const tierCandidates = candidates.filter((candidate) => candidate.tier === bestTier);

  tierCandidates.sort((a, b) => compareNormalizedVersions(b.version, a.version));
  return tierCandidates[0] ?? null;
}

export async function checkDockerHub(image: string): Promise<VersionCheckResult> {
  try {
    const url = `https://hub.docker.com/v2/repositories/${image}/tags/?page_size=100&ordering=last_updated`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };

    const data = await res.json();
    const tags = data.results as DockerTag[];
    if (!tags || tags.length === 0) return { version: null };

    const candidates = tags
      .map(classifyTag)
      .filter((candidate): candidate is TagCandidate => candidate !== null);

    const selected = pickHighestVersionTag(candidates);
    if (!selected) return { version: null };

    const version = selected.version || null;

    let description: string | null = null;
    let releaseNotes: string | null = null;
    let starCount: number | null = null;
    let pullCount: number | null = null;
    try {
      const repoRes = await fetch(`https://hub.docker.com/v2/repositories/${image}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (repoRes.ok) {
        const repoData = (await repoRes.json()) as DockerRepoInfo;
        description = repoData.description || null;
        releaseNotes = repoData.full_description || null;
        starCount = repoData.star_count ?? null;
        pullCount = repoData.pull_count ?? null;
      }
    } catch { /* non-critical */ }

    return {
      version,
      description,
      releaseNotes,
      releaseDate: selected.tag.last_updated || null,
      releaseUrl: `https://hub.docker.com/r/${image}/tags?name=${encodeURIComponent(selected.tag.name)}`,
      downloadUrl: `https://hub.docker.com/r/${image}`,
      rawMetadata: {
        tagName: selected.tag.name,
        totalTags: tags.length,
        starCount,
        pullCount,
      },
    };
  } catch {
    return { version: null };
  }
}
