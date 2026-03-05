import type { VersionCheckResult } from "./types";

export async function checkMaven(artifact: string): Promise<VersionCheckResult> {
  if (!artifact) return { version: null };

  const parts = artifact.split(":");
  if (parts.length !== 2) return { version: null };
  const [groupId, artifactId] = parts;

  try {
    const url = `https://search.maven.org/solrsearch/select?q=g:%22${encodeURIComponent(groupId)}%22+AND+a:%22${encodeURIComponent(artifactId)}%22&rows=1&wt=json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();
    const doc = data?.response?.docs?.[0];
    if (!doc) return { version: null };

    const version = doc.latestVersion || doc.v || null;
    if (!version) return { version: null };

    const ts = doc.timestamp ? new Date(doc.timestamp).toISOString() : null;

    return {
      version,
      releaseDate: ts,
      releaseUrl: `https://central.sonatype.com/artifact/${groupId}/${artifactId}/${version}`,
      downloadUrl: `https://repo1.maven.org/maven2/${groupId.replace(/\./g, "/")}/${artifactId}/${version}/${artifactId}-${version}.jar`,
      rawMetadata: {
        groupId,
        artifactId,
        packaging: doc.p,
      },
    };
  } catch {
    return { version: null };
  }
}
