import { getAppSetting } from "@/lib/settings";
import type { VersionCheckResult } from "./types";

interface WingetPackageEntry {
  Id?: string;
  Versions?: string[];
  UpdatedAt?: string;
  updatedAt?: string;
  CreatedAt?: string;
  createdAt?: string;
  Latest?: {
    Name?: string;
    Publisher?: string;
    Description?: string;
    Homepage?: string;
    ReleaseNotes?: string;
    InstallerUrl?: string;
  };
}

interface WingetApiResponse {
  Packages?: WingetPackageEntry[];
  // Legacy single-package shape
  Versions?: string[];
  Id?: string;
}

function pickFirstString(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function semverSort(a: string, b: string): number {
  const pa = a.replace(/[^0-9.]/g, "").split(".").map(Number);
  const pb = b.replace(/[^0-9.]/g, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function checkWinget(packageId: string): Promise<VersionCheckResult> {
  if (!packageId) return { version: null };

  try {
    const apiKey = await getAppSetting("winget_api_key");

    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const url = `https://api.winget.run/v2/packages/${encodeURIComponent(packageId)}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { version: null };

    const data = (await res.json()) as WingetApiResponse;

    let versions: string[] | undefined;
    let pkg: WingetPackageEntry | undefined;

    if (data.Packages && Array.isArray(data.Packages)) {
      pkg = data.Packages.find(
        (p) => p.Id?.toLowerCase() === packageId.toLowerCase()
      ) || data.Packages[0];
      versions = pkg?.Versions;
    } else if (data.Versions) {
      versions = data.Versions;
    }

    if (!versions || versions.length === 0) return { version: null };

    const sorted = [...versions].sort(semverSort);
    const latest = sorted[0];

    return {
      version: latest || null,
      description: pkg?.Latest?.Description || null,
      releaseUrl: pkg?.Latest?.Homepage || null,
      releaseDate: pickFirstString(pkg?.UpdatedAt, pkg?.updatedAt, pkg?.CreatedAt, pkg?.createdAt),
      releaseNotes: pkg?.Latest?.ReleaseNotes || null,
      downloadUrl: pickFirstString(pkg?.Latest?.InstallerUrl, pkg?.Latest?.Homepage),
      rawMetadata: {
        totalVersions: versions.length,
        publisher: pkg?.Latest?.Publisher,
      },
    };
  } catch {
    return { version: null };
  }
}
