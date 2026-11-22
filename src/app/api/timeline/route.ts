import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import {
  buildTimelineEvents,
  TIMELINE_EVENT_TYPES,
  type TimelineEventType,
} from "@/lib/timeline/events";

const ALLOWED_DAYS = new Set([7, 30, 90, 365, 0]);
const MAX_EVENTS = 500;

function parseList(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * CVE events of the monitored items only (monitoring switched on), newest
 * first: CVE published, detected on the item, added to CISA KEV, resolved.
 */
export const GET = withAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const rawDays = Number.parseInt(searchParams.get("days") ?? "90", 10);
  const days = ALLOWED_DAYS.has(rawDays) ? rawDays : 90;
  const since = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
  const types = new Set(
    parseList(searchParams.get("types")).filter((type): type is TimelineEventType =>
      (TIMELINE_EVENT_TYPES as readonly string[]).includes(type)
    )
  );
  const severities = new Set(parseList(searchParams.get("severity")).map((value) => value.toUpperCase()));
  const itemId = searchParams.get("itemId");

  const dateFilter = since
    ? {
        OR: [
          { firstDetectedAt: { gte: since } },
          { publishedAt: { gte: since } },
          { kevAddedAt: { gte: since } },
          { resolvedAt: { gte: since } },
        ],
      }
    : {};

  const rows = await prisma.itemVulnerability.findMany({
    where: {
      item: { monitoringEnabled: true, ...(itemId ? { id: itemId } : {}) },
      ...dateFilter,
    },
    include: { item: { select: { id: true, name: true, type: true, currentVersion: true } } },
    orderBy: { firstDetectedAt: "desc" },
    take: 5000,
  });

  const events = buildTimelineEvents(rows, {
    since,
    types,
    severities,
    kevOnly: searchParams.get("kevOnly") === "true",
    openOnly: searchParams.get("openOnly") === "true",
    search: searchParams.get("search") ?? "",
  });

  const [openCount, openKev, openCritical, monitoredWithCves] = await Promise.all([
    prisma.itemVulnerability.count({ where: { resolvedAt: null, item: { monitoringEnabled: true } } }),
    prisma.itemVulnerability.count({ where: { resolvedAt: null, isKev: true, item: { monitoringEnabled: true } } }),
    prisma.itemVulnerability.count({
      where: { resolvedAt: null, severity: "CRITICAL", item: { monitoringEnabled: true } },
    }),
    prisma.monitoredItem.count({ where: { monitoringEnabled: true, vulnerabilities: { some: { resolvedAt: null } } } }),
  ]);
  const resolvedInPeriod = await prisma.itemVulnerability.count({
    where: {
      item: { monitoringEnabled: true },
      resolvedAt: since ? { gte: since } : { not: null },
    },
  });
  const items = await prisma.monitoredItem.findMany({
    where: { monitoringEnabled: true, vulnerabilities: { some: {} } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    days,
    total: events.length,
    truncated: events.length > MAX_EVENTS,
    events: events.slice(0, MAX_EVENTS),
    stats: { openCount, openKev, openCritical, monitoredWithCves, resolvedInPeriod },
    items,
  });
});
