import type { VersionCheckResult } from "./types";
import { classifyTag, pickHighestVersionTag, type TagCandidate } from "./docker-hub";
import { isPrereleaseVersion } from "@/lib/version-utils";

/**
 * Quay lists tags by recency, so the first match is not the highest version,
 * and most projects tag "v1.2.3": the highest stable tag is picked instead.
 */
export async function checkQuay(repository: string): Promise<VersionCheckResult> {
  if (!repository) return { version: null };
  try {
    const tags: { name: string; last_modified?: string }[] = [];
    for (let page = 1; page <= 4; page++) {
      const res = await fetch(
        `https://quay.io/api/v1/repository/${repository}/tag/?limit=100&page=${page}&onlyActiveTags=true`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) {
        if (page === 1) return { version: null };
        break;
      }
      const data = (await res.json()) as { tags?: { name: string; last_modified?: string }[]; has_additional?: boolean };
      tags.push(...(data.tags ?? []));
      if (!data.has_additional) break;
    }
    if (tags.length === 0) return { version: null };
    const candidates = tags
      .map((tag) => classifyTag({ name: tag.name, last_updated: tag.last_modified }))
      .filter((candidate): candidate is TagCandidate => candidate !== null);
    const stable = candidates.filter((candidate) => !isPrereleaseVersion(candidate.tag.name));
    const best = pickHighestVersionTag(stable.length > 0 ? stable : candidates);
    if (!best) return { version: null };
    return {
      version: best.version,
      releaseDate: best.tag.last_updated || null,
      releaseUrl: `https://quay.io/repository/${repository}?tab=tags&tag=${encodeURIComponent(best.tag.name)}`,
      rawMetadata: { tagName: best.tag.name, totalTags: tags.length },
    };
  } catch {
    return { version: null };
  }
}
