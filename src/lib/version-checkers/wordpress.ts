import type { VersionCheckResult } from "./types";
import { extractCves } from "./types";

interface WPPluginInfo {
  version: string;
  sections?: { changelog?: string; description?: string };
  last_updated?: string;
  download_link?: string;
  homepage?: string;
  author?: string;
  requires?: string;
  requires_php?: string;
  tested?: string;
}

export async function checkWordPress(slug: string): Promise<VersionCheckResult> {
  if (!slug) return { version: null };

  try {
    const url = `https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&slug=${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };

    const data = (await res.json()) as WPPluginInfo;
    if (!data.version) return { version: null };

    const changelog = data.sections?.changelog || null;

    return {
      version: data.version,
      releaseNotes: changelog,
      releaseDate: data.last_updated || null,
      releaseUrl: data.homepage || null,
      downloadUrl: data.download_link || null,
      cves: extractCves(changelog),
      rawMetadata: {
        author: data.author,
        requires: data.requires,
        requiresPhp: data.requires_php,
        tested: data.tested,
      },
    };
  } catch {
    return { version: null };
  }
}
