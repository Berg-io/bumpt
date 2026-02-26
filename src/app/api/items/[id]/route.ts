import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { updateItemSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";

export const GET = withAuth(
  async (_request: Request, { params }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;
    const item = await prisma.monitoredItem.findUnique({
      where: { id },
      include: { logs: { orderBy: { changedAt: "desc" }, take: 20 } },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    let parsedTags: string[] = [];
    try { parsedTags = item.tags ? JSON.parse(item.tags) : []; } catch { /* empty */ }

    return NextResponse.json({ ...item, tags: parsedTags });
  },
  { roles: ["ADMIN"] }
);

export const PUT = withAuth(
  async (request: Request, { params, user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateItemSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const existing = await prisma.monitoredItem.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const { tags: tagArray, ...updateData } = parsed.data;
      const item = await prisma.monitoredItem.update({
        where: { id },
        data: {
          ...updateData,
          ...(tagArray !== undefined ? { tags: JSON.stringify(tagArray) } : {}),
        },
      });

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of Object.keys(parsed.data) as Array<keyof typeof parsed.data>) {
        const oldVal = existing[key as keyof typeof existing];
        const newVal = parsed.data[key];
        if (oldVal !== newVal && newVal !== undefined) {
          changes[key] = { from: oldVal, to: newVal };
        }
      }

      await logAudit({
        action: "item.updated",
        entityType: "item",
        entityId: item.id,
        entityName: item.name,
        details: { changes },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json(item);
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth(
  async (_request: Request, { params, user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;
    const existing = await prisma.monitoredItem.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.monitoredItem.delete({ where: { id } });

    await logAudit({
      action: "item.deleted",
      entityType: "item",
      entityId: id,
      entityName: existing.name,
      details: { type: existing.type, currentVersion: existing.currentVersion },
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
