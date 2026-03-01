import type { VersionCheckResult } from "./types";

export async function checkNpmRegistry(packageName: string): Promise<VersionCheckResult> {
  if (!packageName) return { version: null };

  try {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };

    const data = await res.json();
    const distTags = data["dist-tags"] as Record<string, string> | undefined;
    const latestVersion = distTags?.latest || null;
    if (!latestVersion) return { version: null };

    const versionData = data.versions?.[latestVersion];
    const timeMap = data.time as Record<string, string> | undefined;

    const homepage = versionData?.homepage
      || (versionData?.repository as { url?: string })?.url?.replace(/^git\+/, "").replace(/\.git$/, "")
      || null;

    return {
      version: latestVersion,
      description: versionData?.description || data.description || null,
      releaseDate: timeMap?.[latestVersion] || null,
      releaseUrl: homepage,
      downloadUrl: versionData?.dist?.tarball || null,
      rawMetadata: {
        name: data.name,
        license: versionData?.license || data.license,
        author: typeof versionData?.author === "string" ? versionData.author : versionData?.author?.name,
      },
    };
  } catch {
    return { version: null };
  }
}
