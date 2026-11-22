import { getAppSetting } from "@/lib/settings";
import { pickWingetVersion, wingetManifestPath } from "./winget-manifest";
import type { VersionCheckResult } from "./types";

/**
 * WinGet versions come straight from the community manifest repository
 * (microsoft/winget-pkgs). The previous source, api.winget.run, stopped
 * updating in 2023 and reported PowerToys 0.68 long after 0.9x shipped.
 */
const REPO = "microsoft/winget-pkgs";

export { pickWingetVersion, wingetManifestPath };

function yamlField(yaml: string, key: string): string | null {
  const match = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return null;
  const value = match[1].trim().replace(/^['"]|['"]$/g, "");
  return value && value !== "|-" && value !== "|" ? value : null;
}

export async function checkWinget(packageId: string): Promise<VersionCheckResult> {
  const path = wingetManifestPath(packageId);
  if (!path) return { version: null };

  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  const token = (await getAppSetting("github_token")) || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `token ${token}`;

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) throw new Error(`WinGet package "${packageId}" not found in ${REPO}`);
  if (res.status === 403 || res.status === 429) {
    throw new Error("GitHub API rate limit reached while reading WinGet manifests (add a GitHub token in Settings)");
  }
  if (!res.ok) throw new Error(`GitHub API returned ${res.status} for WinGet package "${packageId}"`);

  const entries = (await res.json()) as Array<{ name?: string; type?: string }>;
  const version = Array.isArray(entries) ? pickWingetVersion(entries) : null;
  if (!version) return { version: null };

  const id = packageId.trim();
  const versionPath = `${path}/${version}`;
  let description: string | null = null;
  let releaseNotes: string | null = null;
  let releaseUrl: string | null = null;
  let homepage: string | null = null;
  let publisher: string | null = null;
  try {
    const locale = await fetch(
      `https://raw.githubusercontent.com/${REPO}/master/${versionPath}/${encodeURIComponent(id)}.locale.en-US.yaml`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (locale.ok) {
      const yaml = await locale.text();
      description = yamlField(yaml, "ShortDescription");
      releaseNotes = yamlField(yaml, "ReleaseNotes");
      releaseUrl = yamlField(yaml, "ReleaseNotesUrl");
      homepage = yamlField(yaml, "PackageUrl");
      publisher = yamlField(yaml, "Publisher");
    }
  } catch {
    // Locale manifest is optional detail.
  }

  return {
    version,
    description,
    releaseNotes,
    releaseUrl: releaseUrl || `https://github.com/${REPO}/tree/master/${versionPath}`,
    downloadUrl: homepage,
    rawMetadata: { publisher, manifestPath: versionPath },
  };
}
