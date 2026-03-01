import type { VersionCheckResult } from "./types";

export async function checkPackagist(packageName: string): Promise<VersionCheckResult> {
  if (!packageName || !packageName.includes("/")) return { version: null };

  try {
    const url = `https://repo.packagist.org/p2/${packageName}.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();

    const packages = data?.packages?.[packageName];
    if (!Array.isArray(packages) || packages.length === 0) return { version: null };

    const stable = packages.find(
      (p: { version: string; version_normalized?: string }) =>
        !p.version.includes("-") && !p.version.includes("dev") && !p.version.includes("alpha") && !p.version.includes("beta") && !p.version.includes("RC")
    ) || packages[0];

    const version = stable.version?.replace(/^v/, "") || null;
    if (!version) return { version: null };

    return {
      version,
      description: stable.description || null,
      releaseDate: stable.time || null,
      releaseUrl: `https://packagist.org/packages/${packageName}#${stable.version}`,
      downloadUrl: stable.dist?.url || null,
      rawMetadata: {
        license: stable.license,
        homepage: stable.homepage,
        authors: stable.authors?.map((a: { name: string }) => a.name),
      },
    };
  } catch {
    return { version: null };
  }
}
