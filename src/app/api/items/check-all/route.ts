import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { checkItemVersion } from "@/lib/version-checkers";
import { logAudit } from "@/lib/audit";
import { publishCheckEvent } from "@/lib/check-events";
import type { JWTPayload } from "@/types";

export const POST = withAuth(
  async (_request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const items = await prisma.monitoredItem.findMany({
      where: {
        monitoringEnabled: true,
        OR: [
          { checkMethod: { not: "manual" } },
          { sourceId: { not: null } },
        ],
      },
    });

    const results: { id: string; name: string; status?: string; error?: string }[] = [];
    const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    publishCheckEvent({
      type: "check_started",
      batchId,
      checked: 0,
      total: items.length,
    });

    for (const item of items) {
      try {
        const result = await checkItemVersion(item);
        const updatedItem = await prisma.monitoredItem.findUnique({
          where: { id: item.id },
          include: { source: { select: { id: true, name: true, type: true } } },
        });
        results.push({ id: item.id, name: item.name, status: result.status });
        publishCheckEvent({
          type: "check_progress",
          batchId,
          itemId: item.id,
          itemName: item.name,
          status: result.status,
          checked: results.length,
          total: items.length,
          item: updatedItem ?? undefined,
        });

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
            trigger: "manual_bulk",
          },
          userId: user.id,
          userEmail: user.email,
        });
      } catch (err) {
        results.push({ id: item.id, name: item.name, error: String(err) });
        publishCheckEvent({
          type: "check_error",
          batchId,
          itemId: item.id,
          itemName: item.name,
          checked: results.length,
          total: items.length,
          error: String(err),
        });

        await logAudit({
          action: "item.check_failed",
          entityType: "item",
          entityId: item.id,
          entityName: item.name,
          details: { error: String(err), trigger: "manual_bulk" },
          userId: user.id,
          userEmail: user.email,
        });
      }
    }

    publishCheckEvent({
      type: "check_done",
      batchId,
      checked: results.length,
      total: items.length,
    });

    return NextResponse.json({
      batchId,
      checked: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  },
  { roles: ["ADMIN"] }
);
