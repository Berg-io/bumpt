import type { VersionCheckResult } from "./types";

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<d:${tag}[^>]*>([^<]*)</d:${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1] || null;
}

function extractTypedTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<d:${tag}[^>]*m:type="[^"]*">([^<]*)</d:${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1] || null;
}

function normalizeChocolateyId(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9]/g, "");
}

async function fetchChocolateyPackage(id: string): Promise<string | null> {
  const filter = encodeURIComponent(`tolower(Id) eq '${id.toLowerCase()}' and IsLatestVersion`);
  const url = `https://community.chocolatey.org/api/v2/Packages()?$filter=${filter}`;
  const res = await fetch(url, {
    headers: { Accept: "application/atom+xml", "User-Agent": "bumpt/1.0" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;
  return res.text();
}

export async function checkChocolatey(packageId: string): Promise<VersionCheckResult> {
  if (!packageId) return { version: null };

  try {
    const normalized = normalizeChocolateyId(packageId);
    const candidates = Array.from(new Set([packageId.trim(), normalized].filter(Boolean)));

    let xml: string | null = null;
    for (const candidate of candidates) {
      xml = await fetchChocolateyPackage(candidate);
      if (!xml) continue;
      const foundVersion = extractTag(xml, "Version") || extractTag(xml, "NormalizedVersion");
      if (foundVersion) break;
    }

    if (!xml) return { version: null };
    const version = extractTag(xml, "Version") || extractTag(xml, "NormalizedVersion");
    if (!version) return { version: null };

    return {
      version,
      description: extractTag(xml, "Summary") || extractTag(xml, "Description") || null,
      releaseNotes: extractTag(xml, "ReleaseNotes") || null,
      releaseDate: extractTag(xml, "Published") || extractTag(xml, "LastUpdated") || null,
      releaseUrl: extractTag(xml, "GalleryDetailsUrl") || `https://community.chocolatey.org/packages/${normalized || packageId}/${version}`,
      downloadUrl: extractTypedTag(xml, "DownloadUrl") || extractTag(xml, "DownloadUrl") || null,
      rawMetadata: {
        authors: extractTag(xml, "Authors"),
        downloadCount: extractTag(xml, "DownloadCount"),
        tags: extractTag(xml, "Tags"),
        projectUrl: extractTag(xml, "ProjectUrl"),
      },
    };
  } catch {
    return { version: null };
  }
}
