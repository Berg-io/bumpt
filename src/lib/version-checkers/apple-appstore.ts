/**
 * Apple App Store version checker.
 * Uses the public iTunes Lookup API.
 *
 * Item params:
 *   bundleId - Bundle ID (e.g. "com.microsoft.skype.teams")
 *              OR numeric App Store ID (e.g. "1113153706" from the URL)
 *   country  - optional, defaults to "de" (ISO 3166-1 alpha-2)
 */

import type { VersionCheckResult } from "./types";

interface LookupResult {
  resultCount: number;
  results: Array<{
    version: string;
    releaseNotes?: string;
    releaseDate?: string;
    currentVersionReleaseDate?: string;
    trackViewUrl?: string;
    description?: string;
    sellerName?: string;
    minimumOsVersion?: string;
  }>;
}

export async function checkAppleAppStore(
  bundleId: string,
  country: string = "de"
): Promise<VersionCheckResult> {
  if (!bundleId) return { version: null };

  const isNumericId = /^\d+$/.test(bundleId.trim());
  const param = isNumericId ? "id" : "bundleId";
  const url = `https://itunes.apple.com/lookup?${param}=${encodeURIComponent(bundleId.trim())}&country=${encodeURIComponent(country)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`iTunes API returned ${res.status} for ${param}="${bundleId}"`);
  }

  const data = (await res.json()) as LookupResult;
  const app = data.results?.[0];

  if (!app?.version) {
    throw new Error(`No app found on iTunes for ${param}="${bundleId}" (country: ${country})`);
  }

  return {
    version: app.version,
    releaseNotes: app.releaseNotes || null,
    releaseDate: app.currentVersionReleaseDate || app.releaseDate || null,
    releaseUrl: app.trackViewUrl || null,
    description: app.description || null,
    rawMetadata: {
      sellerName: app.sellerName,
      minimumOsVersion: app.minimumOsVersion,
    },
  };
}
