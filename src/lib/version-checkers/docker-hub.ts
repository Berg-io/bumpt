import type { VersionCheckResult } from "./types";

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

    const skipExact = new Set([
      "latest", "develop", "edge", "nightly", "beta", "alpha",
      "rc", "test", "main", "master", "next",
    ]);

    const cleanSemver = /^v?\d+(\.\d+){1,3}$/;
    const looseSemver = /^v?\d+(\.\d+){1,3}(-[a-zA-Z0-9._-]+)?$/;
    const isDistroVariant = (name: string) =>
      /-(?:alpine|slim|bookworm|bullseye|buster|jammy|focal|trixie|noble|perl|ubuntu|debian)/i.test(name) ||
      name.includes("-latest");

    let selectedTag: DockerTag | undefined;

    const clean = tags.find(
      (tag) => !skipExact.has(tag.name) && cleanSemver.test(tag.name)
    );
    if (clean) {
      selectedTag = clean;
    } else {
      const withSuffix = tags.find(
        (tag) =>
          !skipExact.has(tag.name) &&
          looseSemver.test(tag.name) &&
          !isDistroVariant(tag.name)
      );
      if (withSuffix) {
        selectedTag = withSuffix;
      } else {
        const distroTag = tags.find(
          (tag) =>
            !skipExact.has(tag.name) && looseSemver.test(tag.name)
        );
        if (distroTag) {
          selectedTag = distroTag;
        } else {
          selectedTag = tags.find(
            (tag) => !skipExact.has(tag.name) && /^\d+/.test(tag.name)
          );
        }
      }
    }

    if (!selectedTag) return { version: null };

    const version = selectedTag.name.replace(/^v/, "").replace(/-[a-zA-Z].*$/, "");

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
      version: version || null,
      description,
      releaseNotes,
      releaseDate: selectedTag.last_updated || null,
      releaseUrl: `https://hub.docker.com/r/${image}/tags?name=${encodeURIComponent(selectedTag.name)}`,
      downloadUrl: `https://hub.docker.com/r/${image}`,
      rawMetadata: {
        tagName: selectedTag.name,
        totalTags: tags.length,
        starCount,
        pullCount,
      },
    };
  } catch {
    return { version: null };
  }
}
