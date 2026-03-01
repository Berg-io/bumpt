/**
 * Generic JSON API version checker.
 *
 * Config shape:
 *   url              - full URL (may contain ${var} template placeholders)
 *   jsonPath         - dot/bracket path to extract version, e.g. "versions[0].version"
 *   releaseNotesPath - optional path to extract release notes
 *   releaseDatePath  - optional path to extract release date
 *   releaseUrlPath   - optional path to extract release URL
 *   headers          - optional Record<string, string>
 */

import type { VersionCheckResult } from "./types";
import { extractCves } from "./types";

function resolveTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function extractByPath(obj: unknown, path: string): string | null {
  const segments = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[seg];
  }

  return current != null ? String(current) : null;
}

export async function checkJsonApi(
  config: {
    url?: string;
    jsonPath?: string;
    releaseNotesPath?: string;
    releaseDatePath?: string;
    releaseUrlPath?: string;
    headers?: Record<string, string>;
  },
  params: Record<string, string> = {}
): Promise<VersionCheckResult> {
  if (!config.url || !config.jsonPath) return { version: null };

  try {
    const url = resolveTemplate(config.url, params);
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(config.headers ?? {}),
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { version: null };

    const data: unknown = await res.json();
    const version = extractByPath(data, config.jsonPath);

    const releaseNotes = config.releaseNotesPath
      ? extractByPath(data, config.releaseNotesPath)
      : null;

    const releaseDate = config.releaseDatePath
      ? extractByPath(data, config.releaseDatePath)
      : null;

    const releaseUrl = config.releaseUrlPath
      ? extractByPath(data, config.releaseUrlPath)
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
