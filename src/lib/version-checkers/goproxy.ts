import type { VersionCheckResult } from "./types";

export async function checkGoProxy(modulePath: string): Promise<VersionCheckResult> {
  if (!modulePath) return { version: null };

  try {
    const encoded = modulePath.replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`);
    const url = `https://proxy.golang.org/${encoded}/@latest`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();
    const rawVersion = data.Version || null;
    if (!rawVersion) return { version: null };

    const version = rawVersion.replace(/^v/, "");

    return {
      version,
      releaseDate: data.Time || null,
      releaseUrl: `https://pkg.go.dev/${modulePath}@${rawVersion}`,
      downloadUrl: `https://proxy.golang.org/${encoded}/@v/${rawVersion}.zip`,
      rawMetadata: {
        module: modulePath,
        origin: data.Origin,
      },
    };
  } catch {
    return { version: null };
  }
}
