export function normalizeVersionParts(version: string | null | undefined): number[] {
  if (!version) return [];
  return version
    .replace(/^[^\d]*/, "")
    .replace(/[^0-9.].*$/, "")
    .split(".")
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));
}

export function compareNormalizedVersions(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const ap = normalizeVersionParts(a);
  const bp = normalizeVersionParts(b);
  const max = Math.max(ap.length, bp.length);
  for (let i = 0; i < max; i++) {
    const av = ap[i] ?? 0;
    const bv = bp[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export function isVersionOutdated(
  current: string | null | undefined,
  latest: string | null | undefined
): boolean {
  if (!current || !latest) return false;
  if (current === latest) return false;
  return compareNormalizedVersions(latest, current) > 0;
}

const PRERELEASE_PATTERN =
  /(?:^|[\d.\-_+~])(?:alpha|beta|rc|pre|preview|dev|nightly|canary|snapshot)(?![a-z])/i;

/**
 * True when a version string looks like a pre-release (alpha, beta, rc, nightly...).
 * Used to avoid reporting unstable builds as the "latest" version.
 */
export function isPrereleaseVersion(version: string | null | undefined): boolean {
  if (!version) return false;
  return PRERELEASE_PATTERN.test(version.trim());
}

/**
 * True when `version` belongs to the tracked branch, given as a version prefix:
 * "16" matches 16.0, 16.4.1...; "3.11" matches 3.11.x but not 3.1 or 3.12.
 * An empty branch matches everything.
 */
export function matchesBranch(version: string | null | undefined, branch: string | null | undefined): boolean {
  const wanted = normalizeVersionParts((branch ?? "").replace(/\.?[x*]$/i, ""));
  if (wanted.length === 0) return true;
  const parts = normalizeVersionParts(version);
  if (parts.length < wanted.length) return false;
  return wanted.every((part, i) => parts[i] === part);
}

/** Highest stable version of a branch among `versions` (null when none). */
export function pickLatestInBranch(versions: string[], branch: string | null | undefined): string | null {
  const candidates = versions.filter((v) => !isPrereleaseVersion(v) && matchesBranch(v, branch));
  candidates.sort(semverSortDescending);
  return candidates[0] ?? null;
}

export function semverSortDescending(a: string, b: string): number {
  return compareNormalizedVersions(a, b) * -1;
}
