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

export function semverSortDescending(a: string, b: string): number {
  return compareNormalizedVersions(a, b) * -1;
}
