/**
 * Google Play Store version checker.
 * Uses google-play-scraper for reliable data extraction.
 *
 * Item params:
 *   appId - e.g. "com.microsoft.teams"
 */

import gplay from "google-play-scraper";
import type { VersionCheckResult } from "./types";

export async function checkGooglePlayStore(
  appId: string
): Promise<VersionCheckResult> {
  if (!appId) return { version: null };

  const result = await gplay.app({ appId, lang: "en", country: "us" });

  if (!result.version || result.version === "Varies with device") {
    throw new Error(`No version found on Google Play for "${appId}"`);
  }

  return {
    version: result.version,
    releaseNotes: result.recentChanges || null,
    releaseDate: result.updated ? String(result.updated) : null,
    description: result.summary || null,
    rawMetadata: {
      developer: result.developer,
      score: result.score,
      installs: result.installs,
      androidVersion: result.androidVersion,
    },
  };
}
