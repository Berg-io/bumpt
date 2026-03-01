import type { VersionCheckResult } from "./types";

interface FdroidPackageVersion {
  versionName?: string;
  versionCode?: number;
}

interface FdroidApiResponse {
  packageName?: string;
  suggestedVersionCode?: number;
  packages?: FdroidPackageVersion[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDescription(pageText: string): string | null {
  const lines = pageText.split(/\r?\n/).map((line) => line.trim());
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("-")) continue;
    if (line.startsWith("###")) continue;
    if (line.includes("|")) continue;
    if (/^Version\s+/i.test(line)) continue;
    if (/^Permissions$/i.test(line)) continue;
    return line;
  }
  return null;
}

function getFdroidCandidates(appId: string): string[] {
  const id = appId.trim();
  const candidates = [id];
  // Backward compatibility: common invalid Firefox ID used previously in placeholders
  if (id === "org.mozilla.firefox") candidates.push("org.mozilla.fennec_fdroid");
  return candidates;
}

export async function checkFdroid(appId: string): Promise<VersionCheckResult> {
  if (!appId) return { version: null };
  try {
    for (const candidate of getFdroidCandidates(appId)) {
      const res = await fetch(`https://f-droid.org/api/v1/packages/${encodeURIComponent(candidate)}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as FdroidApiResponse;
      const packages = data.packages;
      if (!packages || packages.length === 0) continue;

      const suggested = data.suggestedVersionCode;
      const best = (suggested
        ? packages.find((p) => p.versionCode === suggested)
        : undefined) || packages[0];
      const packagePageUrl = `https://f-droid.org/packages/${encodeURIComponent(candidate)}/`;

      let description: string | null = null;
      let releaseDate: string | null = null;
      let changelogUrl: string | null = null;

      try {
        const pageRes = await fetch(packagePageUrl, {
          headers: { Accept: "text/plain, text/markdown, text/html" },
          signal: AbortSignal.timeout(7000),
        });
        if (pageRes.ok) {
          const pageText = await pageRes.text();
          description = extractDescription(pageText);

          const changelogMatch = pageText.match(/\[Changelog]\((https?:\/\/[^)]+)\)/i);
          changelogUrl = changelogMatch?.[1] || null;

          if (best.versionName && best.versionCode !== undefined) {
            const datePattern = new RegExp(
              `Version\\s+${escapeRegExp(best.versionName)}\\s+\\(${best.versionCode}\\)[\\s\\S]*?Added on\\s+([A-Za-z]{3}\\s+\\d{2},\\s+\\d{4})`,
              "i"
            );
            const dateMatch = pageText.match(datePattern);
            if (dateMatch?.[1]) {
              const parsed = new Date(dateMatch[1]);
              releaseDate = Number.isNaN(parsed.getTime()) ? dateMatch[1] : parsed.toISOString();
            }
          }
        }
      } catch {
        // Keep base API data if page metadata cannot be fetched.
      }

      return {
        version: best.versionName || null,
        description,
        releaseDate,
        releaseUrl: changelogUrl || packagePageUrl,
        downloadUrl: packagePageUrl,
        rawMetadata: {
          suggestedVersionCode: suggested,
          totalVersions: packages.length,
          resolvedAppId: candidate,
        },
      };
    }

    return { version: null };
  } catch {
    return { version: null };
  }
}
