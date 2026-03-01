import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { createItemSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { canCreateItem } from "@/lib/license";
import { getAppSetting } from "@/lib/settings";
import type { JWTPayload } from "@/types";

const ALLOWED_PAGE_SIZES = new Set([25, 50, 100, 500]);

function resolvePageSize(rawPageSize: string | null, settingPageSize: string | null): number | undefined {
  const normalize = (value: string | null): number | undefined => {
    if (!value) return undefined;
    if (value.toLowerCase() === "all") return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return undefined;
    if (!ALLOWED_PAGE_SIZES.has(parsed)) return undefined;
    return parsed;
  };
  const fromQuery = normalize(rawPageSize);
  if (fromQuery !== undefined || rawPageSize?.toLowerCase() === "all") return fromQuery;
  const fromSetting = normalize(settingPageSize);
  return fromSetting ?? 100;
}

export const GET = withAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const securityState = searchParams.get("securityState");
    const riskState = searchParams.get("riskState");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const dashboardDefaultPageSize = await getAppSetting("dashboard_default_page_size");
    const pageSize = resolvePageSize(searchParams.get("pageSize"), dashboardDefaultPageSize);
    const effectivePage = pageSize === undefined ? 1 : Math.max(page, 1);

    const monitoringEnabled = searchParams.get("monitoringEnabled");

    const tags = searchParams.get("tags");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (securityState) where.securityState = securityState;
    if (riskState === "at_risk") {
      where.OR = [{ securityState: "vulnerable" }, { status: "end_of_life" }];
    }
    if (monitoringEnabled === "true") where.monitoringEnabled = true;
    if (monitoringEnabled === "false") where.monitoringEnabled = false;
    if (search) {
      const searchClause = {
        OR: [
          { name: { contains: search } },
          { tags: { contains: search } },
        ],
      };
      if (riskState === "at_risk") {
        const existingAnd = Array.isArray(where.AND) ? where.AND : [];
        where.AND = [...existingAnd, searchClause];
      } else {
        where.OR = searchClause.OR;
      }
    }
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        const existingAnd = Array.isArray(where.AND) ? where.AND : [];
        where.AND = [...existingAnd, ...tagList.map((tag) => ({ tags: { contains: tag } }))];
      }
    }

    const [items, total] = await Promise.all([
      prisma.monitoredItem.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        ...(pageSize === undefined
          ? {}
          : {
              skip: (effectivePage - 1) * pageSize,
              take: pageSize,
            }),
        include: { source: { select: { id: true, name: true, type: true } } },
      }),
      prisma.monitoredItem.count({ where }),
    ]);

    const data = items.map(({ rawMetadata: _rm, aiSummary: _ai, ...item }) => item);

    return NextResponse.json({ data, total, page: effectivePage, pageSize: pageSize ?? "all" });
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
