/**
 * Generic HTML scraping version checker.
 *
 * Config shape:
 *   url                  - full URL (may contain ${var} template placeholders)
 *   selector             - CSS selector to find the element containing version text
 *   regex                - optional regex string to extract version from the matched text
 *   releaseNotesSelector - optional CSS selector for release notes
 *   releaseDateSelector  - optional CSS selector for release date
 *   releaseUrlSelector   - optional CSS selector for release URL (extracts href)
 *   headers              - optional Record<string, string>
 */

import * as cheerio from "cheerio";
import type { VersionCheckResult } from "./types";
import { extractCves } from "./types";

function resolveTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export async function checkHtmlScraper(
  config: {
    url?: string;
    selector?: string;
    regex?: string;
    releaseNotesSelector?: string;
    releaseDateSelector?: string;
    releaseUrlSelector?: string;
    headers?: Record<string, string>;
  },
  params: Record<string, string> = {}
): Promise<VersionCheckResult> {
  if (!config.url || !config.selector) return { version: null };

  try {
    const url = resolveTemplate(config.url, params);
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        ...(config.headers ?? {}),
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { version: null };

    const html = await res.text();
    const $ = cheerio.load(html);
    const text = $(config.selector).first().text().trim();

    if (!text) return { version: null };

    let version: string | null = null;
    if (config.regex) {
      const match = text.match(new RegExp(config.regex));
      version = match?.[1] ?? match?.[0] ?? null;
    } else {
      const versionMatch = text.match(/\d+(?:\.\d+){1,5}/);
      version = versionMatch?.[0] ?? null;
    }

    const releaseNotes = config.releaseNotesSelector
      ? $(config.releaseNotesSelector).first().text().trim() || null
      : null;

    const releaseDate = config.releaseDateSelector
      ? $(config.releaseDateSelector).first().text().trim() || null
      : null;

    const releaseUrl = config.releaseUrlSelector
      ? $(config.releaseUrlSelector).first().attr("href") || null
      : null;

    return {
      version,
      releaseNotes,
      releaseDate,
      releaseUrl,
      cves: extractCves(releaseNotes),
    };
  } catch {
    return { version: null };
  }
}
