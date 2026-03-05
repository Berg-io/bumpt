import type { VersionCheckResult } from "./types";

export async function checkTerraform(module: string): Promise<VersionCheckResult> {
  if (!module) return { version: null };

  try {
    const isProvider = module.startsWith("provider:");
    let url: string;
    let releaseBaseUrl: string;

    if (isProvider) {
      const providerPath = module.replace("provider:", "");
      url = `https://registry.terraform.io/v1/providers/${providerPath}`;
      releaseBaseUrl = `https://registry.terraform.io/providers/${providerPath}`;
    } else {
      url = `https://registry.terraform.io/v1/modules/${module}`;
      releaseBaseUrl = `https://registry.terraform.io/modules/${module}`;
    }

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();

    const version = data.version || null;
    if (!version) return { version: null };

    return {
      version,
      description: data.description || null,
      releaseDate: data.published_at || null,
      releaseUrl: `${releaseBaseUrl}/${version}`,
      downloadUrl: data.source || null,
      rawMetadata: {
        owner: data.owner || data.namespace,
        downloads: data.downloads,
        verified: data.verified,
        source: data.source,
      },
    };
  } catch {
    return { version: null };
  }
}
