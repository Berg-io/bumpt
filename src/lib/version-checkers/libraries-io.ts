import { getAppSetting } from "@/lib/settings";
import type { VersionCheckResult } from "./types";
import { extractCves } from "./types";

const PLATFORM_MAP: Record<string, string> = {
  npm: "NPM",
  pypi: "Pypi",
  maven: "Maven",
  nuget: "NuGet",
  packagist: "Packagist",
  rubygems: "Rubygems",
  crates: "Cargo",
  goproxy: "Go",
  hex: "Hex",
  pub: "Pub",
  conda: "Conda",
  cocoapods: "CocoaPods",
  cpan: "CPAN",
  homebrew: "Homebrew",
  wordpress: "Wordpress",
};

export async function checkLibrariesIo(
  platform: string,
  packageName: string
): Promise<VersionCheckResult> {
  if (!platform || !packageName) return { version: null };

  const apiKey =
    (await getAppSetting("libraries_io_api_key")) ||
    process.env.LIBRARIES_IO_API_KEY;
  if (!apiKey) return { version: null };

  const mappedPlatform = PLATFORM_MAP[platform] || platform;
  const encodedName = encodeURIComponent(packageName);

  try {
    const url = `https://libraries.io/api/${mappedPlatform}/${encodedName}?api_key=${apiKey}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "bumpt/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { version: null };

    const data = await res.json();
    const latestRelease = data.latest_release_number as string | null;
    if (!latestRelease) return { version: null };

    const latestStableRelease = data.latest_stable_release_number as string | null;
    const version = latestStableRelease || latestRelease;

    const versions = data.versions as Array<{
      number: string;
      published_at?: string;
      spdx_expression?: string;
      original_license?: string;
    }> | undefined;

    const matchingVersion = versions?.find((v) => v.number === version);
    const releaseDate = matchingVersion?.published_at || data.latest_release_published_at || null;

    const repoUrl = data.repository_url as string | null;
    const homepage = data.homepage as string | null;

    return {
      version,
      description: (data.description as string) || null,
      releaseDate,
      releaseUrl: homepage || repoUrl || null,
      downloadUrl: data.package_manager_url as string || null,
      cves: extractCves(data.description as string),
      eolDate: data.status === "Deprecated" ? "true" : null,
      rawMetadata: {
        platform: data.platform,
        name: data.name,
        stars: data.stars,
        forks: data.forks,
        rank: data.rank,
        dependentReposCount: data.dependent_repos_count,
        dependentsCount: data.dependents_count,
        status: data.status,
        license: data.licenses,
        language: data.language,
        latestStableRelease: latestStableRelease,
        latestRelease: latestRelease,
        versionsCount: data.versions?.length,
      },
    };
  } catch {
    return { version: null };
  }
}
