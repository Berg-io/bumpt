import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkItemVersion } from "@/lib/version-checkers";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
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

  return NextResponse.json({
    checked: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
