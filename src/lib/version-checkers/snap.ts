import type { VersionCheckResult } from "./types";

export async function checkSnap(snapName: string): Promise<VersionCheckResult> {
  if (!snapName) return { version: null };

  try {
    const url = `https://api.snapcraft.io/v2/snaps/info/${encodeURIComponent(snapName)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Snap-Device-Series": "16",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { version: null };
    const data = await res.json();

    const channels = data["channel-map"] as Array<{
      channel: { name: string; architecture: string; track: string; risk: string };
      version: string;
      "created-at"?: string;
    }> | undefined;

    const stable = channels?.find(
      (c) => c.channel.risk === "stable" && c.channel.architecture === "amd64"
    ) || channels?.find((c) => c.channel.risk === "stable") || channels?.[0];

    if (!stable) return { version: null };

    const version = stable.version || null;
    if (!version) return { version: null };

    const snap = data.snap;

    return {
      version,
      description: snap?.summary || snap?.title || null,
      releaseDate: stable["created-at"] || null,
      releaseUrl: `https://snapcraft.io/${snapName}`,
      rawMetadata: {
        title: snap?.title,
        publisher: snap?.publisher?.["display-name"],
        license: snap?.license,
      },
    };
  } catch {
    return { version: null };
  }
}
