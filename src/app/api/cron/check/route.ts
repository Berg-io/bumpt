import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkItemVersion } from "@/lib/version-checkers";
import { logAudit } from "@/lib/audit";
import { recordNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.monitoredItem.findMany({
    where: {
      OR: [
        { checkMethod: { not: "manual" } },
        { sourceId: { not: null } },
      ],
    },
  });

  const results = [];

  for (const item of items) {
    try {
      const result = await checkItemVersion(item);
      results.push({ id: item.id, name: item.name, ...result });

      await logAudit({
        action: "item.version_checked",
        entityType: "item",
        entityId: item.id,
        entityName: item.name,
        details: {
          previousLatest: item.latestVersion,
          newLatest: result.latestVersion,
          status: result.status,
          changed: result.changed,
          trigger: "cron",
        },
      });
    } catch (err) {
      results.push({
        id: item.id,
        name: item.name,
        error: String(err),
      });

      await logAudit({
        action: "item.check_failed",
        entityType: "item",
        entityId: item.id,
        entityName: item.name,
        details: {
          error: String(err),
          trigger: "cron",
        },
      });
    }
  }

  // One notification per scheduled run that had failures, not one per item.
  const failed = results.filter((result): result is { id: string; name: string; error: string } => "error" in result);
  if (failed.length > 0) {
    await recordNotification({
      type: "check_failed",
      severity: "warning",
      data: {
        count: failed.length,
        total: results.length,
        items: failed.slice(0, 5).map((result) => ({ id: result.id, name: result.name })),
      },
    });
  }

  return NextResponse.json({
    checked: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

// Older docker-compose files trigger this endpoint with a plain `wget` (GET).
// Accept both methods so scheduled checks keep running after an upgrade.
export const GET = POST;
