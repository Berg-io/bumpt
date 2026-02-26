import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { createItemSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { canCreateItem } from "@/lib/license";
import type { JWTPayload } from "@/types";

export const GET = withAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

    const monitoringEnabled = searchParams.get("monitoringEnabled");

    const tags = searchParams.get("tags");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (monitoringEnabled === "true") where.monitoringEnabled = true;
    if (monitoringEnabled === "false") where.monitoringEnabled = false;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        where.AND = tagList.map((tag) => ({ tags: { contains: tag } }));
      }
    }

    const [items, total] = await Promise.all([
      prisma.monitoredItem.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { source: { select: { id: true, name: true, type: true } } },
      }),
      prisma.monitoredItem.count({ where }),
    ]);

    const data = items.map(({ rawMetadata: _rm, aiSummary: _ai, ...item }) => item);

    return NextResponse.json({ data, total, page, pageSize });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth(
  async (_request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const count = await prisma.monitoredItem.count();
      await prisma.monitoredItem.deleteMany();

      await logAudit({
        action: "items.purged",
        entityType: "item",
        entityName: `${count} items`,
        details: { count },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json({ deleted: count });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["ADMIN"] }
);

export const POST = withAuth(
  async (request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const itemLimit = await canCreateItem();
      if (!itemLimit.allowed) {
        return NextResponse.json(
          {
            error: "item_limit_reached",
            edition: itemLimit.edition,
            current: itemLimit.current,
            max: itemLimit.max,
          },
          { status: 403 }
        );
      }

      const body = await request.json();
      const parsed = createItemSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { tags: tagArray, ...rest } = parsed.data;
      const item = await prisma.monitoredItem.create({
        data: {
          ...rest,
          tags: tagArray ? JSON.stringify(tagArray) : "[]",
        },
      });

      await logAudit({
        action: "item.created",
        entityType: "item",
        entityId: item.id,
        entityName: item.name,
        details: { type: item.type, checkMethod: item.checkMethod, currentVersion: item.currentVersion },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json(item, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["ADMIN"] }
);
