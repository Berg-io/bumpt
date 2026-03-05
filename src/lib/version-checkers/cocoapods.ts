import type { VersionCheckResult } from "./types";

export async function checkCocoaPods(podName: string): Promise<VersionCheckResult> {
  if (!podName) return { version: null };
  try {
    const res = await fetch(`https://trunk.cocoapods.org/api/v1/pods/${encodeURIComponent(podName)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const versions = data.versions as { name: string; created_at?: string }[] | undefined;
    if (!versions || versions.length === 0) return { version: null };
    const latest = versions[versions.length - 1];
    return {
      version: latest.name,
      releaseDate: latest.created_at || null,
      releaseUrl: `https://cocoapods.org/pods/${encodeURIComponent(podName)}`,
    };
  } catch {
    return { version: null };
  }
}
