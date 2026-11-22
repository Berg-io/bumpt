export const TIMELINE_EVENT_TYPES = ["published", "detected", "kev", "resolved"] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export interface TimelineVulnerabilityRow {
  id: string;
  cveId: string;
  summary: string | null;
  severity: string | null;
  cvssScore: number | null;
  epss: number | null;
  isKev: boolean;
  kevAddedAt: Date | null;
  kevDueDate: Date | null;
  knownRansomware: boolean;
  publishedAt: Date | null;
  fixedVersion: string | null;
  affectedVersion: string | null;
  firstDetectedAt: Date;
  resolvedAt: Date | null;
  resolvedInVersion: string | null;
  item: { id: string; name: string; type: string; currentVersion: string | null };
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  cveId: string;
  summary: string | null;
  severity: string | null;
  cvssScore: number | null;
  epss: number | null;
  isKev: boolean;
  knownRansomware: boolean;
  kevDueDate: string | null;
  fixedVersion: string | null;
  affectedVersion: string | null;
  resolvedInVersion: string | null;
  open: boolean;
  item: TimelineVulnerabilityRow["item"];
}

export interface TimelineFilters {
  since: Date | null;
  types: Set<TimelineEventType>;
  severities: Set<string>;
  kevOnly: boolean;
  openOnly: boolean;
  search: string;
}

/** Splits each CVE of an item into dated events: published, detected, added to KEV, resolved. */
export function buildTimelineEvents(rows: TimelineVulnerabilityRow[], filters: TimelineFilters): TimelineEvent[] {
  const search = filters.search.trim().toLowerCase();
  const events: TimelineEvent[] = [];

  for (const row of rows) {
    if (filters.kevOnly && !row.isKev) continue;
    if (filters.openOnly && row.resolvedAt) continue;
    const severity = row.severity?.toUpperCase() ?? "UNKNOWN";
    if (filters.severities.size > 0 && !filters.severities.has(severity)) continue;
    if (search && !row.cveId.toLowerCase().includes(search) && !row.item.name.toLowerCase().includes(search)) continue;

    const dated: Array<[TimelineEventType, Date | null]> = [
      ["published", row.publishedAt],
      ["detected", row.firstDetectedAt],
      ["kev", row.kevAddedAt],
      ["resolved", row.resolvedAt],
    ];
    for (const [type, date] of dated) {
      if (!date) continue;
      if (filters.types.size > 0 && !filters.types.has(type)) continue;
      if (filters.since && date < filters.since) continue;
      events.push({
        id: `${row.id}:${type}`,
        type,
        date: date.toISOString(),
        cveId: row.cveId,
        summary: row.summary,
        severity: row.severity,
        cvssScore: row.cvssScore,
        epss: row.epss,
        isKev: row.isKev,
        knownRansomware: row.knownRansomware,
        kevDueDate: row.kevDueDate?.toISOString() ?? null,
        fixedVersion: row.fixedVersion,
        affectedVersion: row.affectedVersion,
        resolvedInVersion: row.resolvedInVersion,
        open: !row.resolvedAt,
        item: row.item,
      });
    }
  }

  // Newest first; on the same instant, show the lifecycle order backwards.
  const order: Record<TimelineEventType, number> = { resolved: 3, kev: 2, detected: 1, published: 0 };
  return events.sort((a, b) => b.date.localeCompare(a.date) || order[b.type] - order[a.type]);
}
