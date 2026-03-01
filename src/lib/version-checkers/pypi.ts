import type { VersionCheckResult } from "./types";

interface PyPIVulnerability {
  id: string;
  aliases?: string[];
}

interface PyPIReleaseFile {
  url?: string;
  upload_time_iso_8601?: string;
  packagetype?: string;
}

interface PyPIResponse {
  info: {
    version: string;
    summary?: string;
    home_page?: string;
    project_urls?: Record<string, string>;
    author?: string;
    license?: string;
    requires_python?: string;
  };
  releases?: Record<string, PyPIReleaseFile[]>;
  vulnerabilities?: PyPIVulnerability[];
}

export async function checkPyPI(packageName: string): Promise<VersionCheckResult> {
  if (!packageName) return { version: null };

  try {
    const url = `https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };

    const data = (await res.json()) as PyPIResponse;
    if (!data.info?.version) return { version: null };

    const version = data.info.version;

    const vulnIds = data.vulnerabilities
      ?.map((v) => v.id)
      .filter(Boolean) ?? [];

    const releaseUrl = data.info.project_urls?.Homepage
      || data.info.project_urls?.Repository
      || data.info.home_page
      || null;

    const versionFiles = data.releases?.[version];
    let releaseDate: string | null = null;
    let downloadUrl: string | null = null;

    if (versionFiles && versionFiles.length > 0) {
      releaseDate = versionFiles[0].upload_time_iso_8601 || null;
      const sdist = versionFiles.find((f) => f.packagetype === "sdist");
      const wheel = versionFiles.find((f) => f.packagetype === "bdist_wheel");
      downloadUrl = (wheel?.url || sdist?.url || versionFiles[0].url) || null;
    }

    return {
      version,
      description: data.info.summary || null,
      releaseDate,
      releaseUrl,
      downloadUrl,
      cves: vulnIds.length > 0 ? vulnIds : null,
      rawMetadata: {
        author: data.info.author,
        license: data.info.license,
        requiresPython: data.info.requires_python,
        vulnerabilitiesCount: data.vulnerabilities?.length ?? 0,
      },
    };
  } catch {
    return { version: null };
  }
}
