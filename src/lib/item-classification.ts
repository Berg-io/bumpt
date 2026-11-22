export interface ItemClassificationFields {
  status: string;
  securityState?: string | null;
  cves?: string | null;
  lastCheckError?: string | null;
}

export type DisplayStatus = "critical" | "end_of_life" | "check_failed" | "outdated" | "up_to_date";

export const DISPLAY_STATUSES: readonly DisplayStatus[] = [
  "end_of_life",
  "critical",
  "check_failed",
  "outdated",
  "up_to_date",
];

export function isDisplayStatus(value: string | null | undefined): value is DisplayStatus {
  return !!value && (DISPLAY_STATUSES as readonly string[]).includes(value);
}

export function parseCveCount(cvesJson: string | null | undefined): number {
  if (!cvesJson) return 0;
  try {
    const parsed = JSON.parse(cvesJson);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function hasKnownCves(cves?: string | null): boolean {
  return parseCveCount(cves) > 0;
}

export function isItemVulnerable(item: ItemClassificationFields): boolean {
  // "critical" is the legacy status value from before status/securityState were split;
  // rows still carrying it must not be shown as "up to date".
  return item.securityState === "vulnerable" || item.status === "critical" || hasKnownCves(item.cves);
}

export function isItemAtRisk(item: ItemClassificationFields): boolean {
  return item.status === "end_of_life" || isItemVulnerable(item);
}

export function isItemOutdated(item: ItemClassificationFields): boolean {
  return item.status === "outdated";
}

/**
 * One status per item, so the dashboard counters add up to the total.
 * Priority: end of life > vulnerable > last check failed > outdated > up to date.
 * A failed check is never shown as "up to date": its data may be stale.
 */
export function getDisplayStatus(item: ItemClassificationFields): DisplayStatus {
  if (item.status === "end_of_life") return "end_of_life";
  if (isItemVulnerable(item)) return "critical";
  if (item.lastCheckError) return "check_failed";
  if (item.status === "outdated") return "outdated";
  return "up_to_date";
}

export const DISPLAY_STATUS_ORDER: Record<DisplayStatus, number> = {
  end_of_life: 0,
  critical: 1,
  check_failed: 2,
  outdated: 3,
  up_to_date: 4,
};

const VULNERABLE_WHERE = {
  OR: [
    { securityState: "vulnerable" },
    { status: "critical" }, // legacy value, see isItemVulnerable()
    { AND: [{ cves: { not: null } }, { NOT: { cves: "" } }, { NOT: { cves: "[]" } }] },
  ],
};

/** Prisma `where` clause matching exactly the items getDisplayStatus() puts in `status`. */
export function displayStatusWhere(status: DisplayStatus): Record<string, unknown> {
  const notEol = { NOT: { status: "end_of_life" } };
  const notVulnerable = { NOT: VULNERABLE_WHERE };
  switch (status) {
    case "end_of_life":
      return { status: "end_of_life" };
    case "critical":
      return { AND: [notEol, VULNERABLE_WHERE] };
    case "check_failed":
      return { AND: [notEol, notVulnerable, { lastCheckError: { not: null } }] };
    case "outdated":
      return { AND: [{ status: "outdated" }, notVulnerable, { lastCheckError: null }] };
    case "up_to_date":
      return {
        AND: [
          { NOT: { status: { in: ["outdated", "end_of_life", "critical"] } } },
          notVulnerable,
          { lastCheckError: null },
        ],
      };
  }
}

export function getDisplayStatusOrder(item: ItemClassificationFields): number {
  return DISPLAY_STATUS_ORDER[getDisplayStatus(item)] ?? 99;
}

export function resolveSecurityState(cves: string[] | null | undefined): "vulnerable" | "no_known_vuln" {
  return cves && cves.length > 0 ? "vulnerable" : "no_known_vuln";
}
