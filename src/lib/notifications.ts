import { prisma } from "@/lib/prisma";

/**
 * In-app notifications: what a check found that someone should look at.
 * Written by the version checks (manual, "check all" and the scheduler) and
 * read by the bell in the header. Recording never breaks a check: errors are
 * logged and swallowed.
 */

export const NOTIFICATION_TYPES = ["version_new", "cve_new", "kev_new", "eol", "check_failed"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationSeverity = "info" | "warning" | "critical";

export interface NotificationInput {
  type: NotificationType;
  severity?: NotificationSeverity;
  itemId?: string | null;
  itemName?: string | null;
  data?: Record<string, unknown>;
  /** Same key twice = one notification (e.g. the same end of life at every check). */
  dedupeKey?: string | null;
}

const RETENTION_DAYS = 90;
const MAX_ROWS = 2000;
const PRUNE_EVERY = 50;
let writesSincePrune = 0;

export async function recordNotification(input: NotificationInput): Promise<void> {
  try {
    if (input.dedupeKey) {
      const existing = await prisma.notification.findUnique({
        where: { dedupeKey: input.dedupeKey },
        select: { id: true },
      });
      if (existing) return;
    }
    await prisma.notification.create({
      data: {
        type: input.type,
        severity: input.severity ?? "info",
        itemId: input.itemId ?? null,
        itemName: input.itemName ?? null,
        data: JSON.stringify(input.data ?? {}),
        dedupeKey: input.dedupeKey ?? null,
      },
    });
    writesSincePrune += 1;
    if (writesSincePrune >= PRUNE_EVERY) {
      writesSincePrune = 0;
      await pruneNotifications();
    }
  } catch (err) {
    // A concurrent check may have written the same dedupe key first: fine.
    const code = (err as { code?: string })?.code;
    if (code === "P2002") return;
    console.error("[Notifications] record failed:", err instanceof Error ? err.message : err);
  }
}

async function pruneNotifications(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const overflow = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    skip: MAX_ROWS,
    take: 500,
    select: { id: true },
  });
  if (overflow.length > 0) {
    await prisma.notification.deleteMany({ where: { id: { in: overflow.map((row) => row.id) } } });
  }
}

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, MODERATE: 2, LOW: 1 };

export function highestSeverity(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  for (const value of values) {
    const upper = value?.toUpperCase();
    if (!upper || !(upper in SEVERITY_RANK)) continue;
    if (!best || SEVERITY_RANK[upper] > SEVERITY_RANK[best]) best = upper;
  }
  return best;
}

/** New CVEs and CVEs newly listed in CISA KEV, one notification per item and kind. */
export async function notifyVulnerabilityFindings(params: {
  itemId: string;
  version: string | null;
  added: Array<{ cveId: string; severity: string | null; isKev: boolean }>;
  newlyKev: Array<{ cveId: string; knownRansomware: boolean }>;
}): Promise<void> {
  const { itemId, version, added, newlyKev } = params;
  if (added.length === 0 && newlyKev.length === 0) return;
  try {
    const item = await prisma.monitoredItem.findUnique({
      where: { id: itemId },
      select: { name: true, monitoringEnabled: true },
    });
    // Same scope as the timeline: only the items that are monitored.
    if (!item || !item.monitoringEnabled) return;

    if (added.length > 0) {
      const maxSeverity = highestSeverity(added.map((cve) => cve.severity));
      const kevCount = added.filter((cve) => cve.isKev).length;
      await recordNotification({
        type: "cve_new",
        severity: kevCount > 0 || maxSeverity === "CRITICAL" ? "critical" : maxSeverity === "HIGH" ? "warning" : "info",
        itemId,
        itemName: item.name,
        data: {
          count: added.length,
          cveIds: added.slice(0, 5).map((cve) => cve.cveId),
          maxSeverity,
          kevCount,
          version,
        },
      });
    }
    if (newlyKev.length > 0) {
      await recordNotification({
        type: "kev_new",
        severity: "critical",
        itemId,
        itemName: item.name,
        data: {
          count: newlyKev.length,
          cveIds: newlyKev.slice(0, 5).map((cve) => cve.cveId),
          knownRansomware: newlyKev.some((cve) => cve.knownRansomware),
          version,
        },
      });
    }
  } catch (err) {
    console.error("[Notifications] CVE findings failed:", err instanceof Error ? err.message : err);
  }
}
