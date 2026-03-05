import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { checkItemVersion } from "@/lib/version-checkers";
import { logAudit } from "@/lib/audit";
import { publishCheckEvent } from "@/lib/check-events";
import type { JWTPayload } from "@/types";

export const POST = withAuth(
  async (_request: Request, { params, user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;
    const item = await prisma.monitoredItem.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.checkMethod === "manual" && !item.sourceId) {
      return NextResponse.json(
        { error: "Manual check - no automatic check possible" },
        { status: 400 }
      );
    }

    try {
      publishCheckEvent({
        type: "check_started",
        itemId: item.id,
        itemName: item.name,
      });

      const result = await checkItemVersion(item);
      const updatedItem = await prisma.monitoredItem.findUnique({
        where: { id: item.id },
        include: { source: { select: { id: true, name: true, type: true } } },
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
        },
        userId: user.id,
        userEmail: user.email,
      });

      publishCheckEvent({
        type: "check_progress",
        itemId: item.id,
        itemName: item.name,
        status: result.status,
        item: updatedItem ?? undefined,
      });

      publishCheckEvent({
        type: "check_done",
        itemId: item.id,
        itemName: item.name,
      });

      return NextResponse.json(result);
    } catch (err) {
      publishCheckEvent({
        type: "check_error",
        itemId: item.id,
        itemName: item.name,
        error: String(err),
      });

      await logAudit({
        action: "item.check_failed",
        entityType: "item",
        entityId: item.id,
        entityName: item.name,
        details: {
          error: String(err),
          checkMethod: item.checkMethod,
          sourceId: item.sourceId,
        },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json(
        { error: "Check failed", details: String(err), itemName: item.name },
        { status: 500 }
      );
    }
  },
  { roles: ["ADMIN"] }
);
