import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { updateSourceSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";

export const GET = withAuth(
  async (_request: Request, { params }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;
    const source = await prisma.checkSource.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });

    if (!source) {
      return NextResponse.json({ error: "Check source not found" }, { status: 404 });
    }

    return NextResponse.json(source);
  },
  { roles: ["ADMIN"] }
);

export const PUT = withAuth(
  async (request: Request, { params, user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;

    const existing = await prisma.checkSource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Check source not found" }, { status: 404 });
    }

    if (existing.isBuiltIn) {
      return NextResponse.json({ error: "Built-in sources cannot be modified" }, { status: 403 });
    }

    try {
      const body = await request.json();
      const parsed = updateSourceSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const updateData = { ...parsed.data };

      const source = await prisma.checkSource.update({
        where: { id },
        data: updateData,
      });

      const changes: Record<string, unknown> = {};
      if (parsed.data.name && parsed.data.name !== existing.name) changes.name = { from: existing.name, to: parsed.data.name };
      if (parsed.data.config && parsed.data.config !== existing.config) changes.config = "updated";
      if (parsed.data.description !== undefined && parsed.data.description !== existing.description) changes.description = "updated";

      await logAudit({
        action: "source.updated",
        entityType: "source",
        entityId: source.id,
        entityName: source.name,
        details: changes,
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json(source);
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth(
  async (_request: Request, { params, user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;

    const existing = await prisma.checkSource.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Check source not found" }, { status: 404 });
    }

    if (existing.isBuiltIn) {
      return NextResponse.json({ error: "System check sources cannot be deleted" }, { status: 403 });
    }

    await prisma.checkSource.delete({ where: { id } });

    await logAudit({
      action: "source.deleted",
      entityType: "source",
      entityId: existing.id,
      entityName: existing.name,
      details: { type: existing.type, linkedItems: existing._count.items },
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["ADMIN"] }
);
