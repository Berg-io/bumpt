import type { VersionCheckResult } from "./types";

export async function checkPub(packageName: string): Promise<VersionCheckResult> {
  if (!packageName) return { version: null };
  try {
    const res = await fetch(`https://pub.dev/api/packages/${encodeURIComponent(packageName)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const latest = data.latest?.version;
    if (!latest) return { version: null };
    const pubspec = data.latest?.pubspec;
    return {
      version: latest,
      description: pubspec?.description || null,
      releaseUrl: `https://pub.dev/packages/${encodeURIComponent(packageName)}`,
    };
  } catch {
    return { version: null };
  }
}
