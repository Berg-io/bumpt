export interface ItemClassificationFields {
  status: string;
  securityState?: string | null;
  cves?: string | null;
}

export type DisplayStatus = "critical" | "end_of_life" | "outdated" | "up_to_date";

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
  return item.securityState === "vulnerable" || hasKnownCves(item.cves);
}

export function isItemAtRisk(item: ItemClassificationFields): boolean {
  return item.status === "end_of_life" || isItemVulnerable(item);
}

export function isItemOutdated(item: ItemClassificationFields): boolean {
  return item.status === "outdated";
}

/** Critical takes priority over outdated; lifecycle dimensions stay independent for filtering. */
export function getDisplayStatus(item: ItemClassificationFields): DisplayStatus {
  if (item.status === "end_of_life") return "end_of_life";
  if (isItemVulnerable(item)) return "critical";
  if (item.status === "outdated") return "outdated";
  return "up_to_date";
}

export const DISPLAY_STATUS_ORDER: Record<DisplayStatus, number> = {
  end_of_life: 0,
  critical: 1,
  outdated: 2,
  up_to_date: 3,
};

export function getDisplayStatusOrder(item: ItemClassificationFields): number {
  return DISPLAY_STATUS_ORDER[getDisplayStatus(item)] ?? 99;
}

export function resolveSecurityState(cves: string[] | null | undefined): "vulnerable" | "no_known_vuln" {
  return cves && cves.length > 0 ? "vulnerable" : "no_known_vuln";
}
