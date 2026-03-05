/**
 * Microsoft Store version checker.
 * Scrapes the Microsoft Store web page to extract the app version,
 * description, release date, and "What's new" release notes.
 *
 * Item params:
 *   productId - e.g. "9wzdncrfj364" (MS Teams) or the full slug
 */

import * as cheerio from "cheerio";
import type { VersionCheckResult } from "./types";

export async function checkMicrosoftStore(
  productId: string
): Promise<VersionCheckResult> {
  if (!productId) return { version: null };

  const url = `https://apps.microsoft.com/detail/${encodeURIComponent(productId)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Microsoft Store returned ${res.status} for productId "${productId}"`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const versionRegex = /\d+\.\d+(?:\.\d+){0,3}/;

  let version: string | null = null;
  let description: string | null = null;
  let releaseDate: string | null = null;
  let releaseNotes: string | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const ld = JSON.parse($(el).html() || "");
      if (ld.version) version = ld.version;
      else if (ld.softwareVersion) version = ld.softwareVersion;
      if (ld.description && !description) description = ld.description;
      if (ld.datePublished && !releaseDate) releaseDate = ld.datePublished;
      if (ld.dateModified && !releaseDate) releaseDate = ld.dateModified;
    } catch { /* skip */ }
  });

  if (!version) {
    const metaVersion = $('meta[itemprop="version"]').attr("content")
      || $('meta[name="version"]').attr("content");
    if (metaVersion) version = metaVersion;
  }

  if (!version) {
    $("div, span, p").each((_, el) => {
      const text = $(el).text().trim();
      if (/^version$/i.test(text) || /^version:$/i.test(text)) {
        const next = $(el).next().text().trim();
        const match = next.match(versionRegex);
        if (match) {
          version = match[0];
          return false;
        }
      }
    });
  }

  if (!version) {
    const fullMatch = html.match(/"version"\s*:\s*"(\d+\.\d+(?:\.\d+){0,3})"/);
    if (fullMatch?.[1]) version = fullMatch[1];
  }

  if (!version) {
    const altMatch = html.match(/"softwareVersion"\s*:\s*"(\d+\.\d+(?:\.\d+){0,3})"/);
    if (altMatch?.[1]) version = altMatch[1];
  }

  if (!version) {
    throw new Error(`Could not extract version from Microsoft Store page for "${productId}"`);
  }

  if (!description) {
    const metaDesc = $('meta[name="description"]').attr("content")
      || $('meta[property="og:description"]').attr("content");
    if (metaDesc) description = metaDesc;
  }

  const whatsNewSection = $('div:contains("What\'s new")').last();
  if (whatsNewSection.length) {
    const sibling = whatsNewSection.next();
    if (sibling.length) {
      const text = sibling.text().trim();
      if (text && text.length > 10 && text.length < 5000) {
        releaseNotes = text;
      }
    }
  }

  return {
    version,
    description,
    releaseDate,
    releaseNotes,
    releaseUrl: url,
  };
}
