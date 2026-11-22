import { isPrereleaseVersion, semverSortDescending } from "@/lib/version-utils";

/** "Microsoft.PowerToys" → "manifests/m/Microsoft/PowerToys". */
export function wingetManifestPath(packageId: string): string | null {
  const parts = packageId.trim().split(".").filter(Boolean);
  if (parts.length < 2 || parts.some((part) => !/^[A-Za-z0-9_\-+]+$/.test(part))) return null;
  return `manifests/${parts[0][0].toLowerCase()}/${parts.join("/")}`;
}

/**
 * Version folders of a package. Sub-package folders ("Insiders", "CLI") sit
 * next to them and are left out: a version starts with a digit.
 */
export function pickWingetVersion(entries: Array<{ name?: string; type?: string }>): string | null {
  const versions = entries
    .filter((entry) => entry.type === "dir" && entry.name && /^\d/.test(entry.name))
    .map((entry) => entry.name as string);
  const stable = versions.filter((version) => !isPrereleaseVersion(version));
  const sorted = (stable.length > 0 ? stable : versions).sort(semverSortDescending);
  return sorted[0] ?? null;
}
