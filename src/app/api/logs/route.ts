import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { logAudit } from "@/lib/audit";
import { getAppSetting } from "@/lib/settings";

const ALLOWED_PAGE_SIZES = new Set([25, 50, 100, 500]);

function resolvePageSize(rawPageSize: string | null, settingPageSize: string | null): number | undefined {
  const normalize = (value: string | null): number | undefined => {
    if (!value) return undefined;
    if (value.toLowerCase() === "all") return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || !ALLOWED_PAGE_SIZES.has(parsed)) return undefined;
    return parsed;
  };

  const fromQuery = normalize(rawPageSize);
  if (fromQuery !== undefined || rawPageSize?.toLowerCase() === "all") return fromQuery;

  const fromSetting = normalize(settingPageSize);
  return fromSetting ?? 50;
}

export const GET = withAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const dashboardDefaultPageSize = await getAppSetting("dashboard_default_page_size");
    const pageSize = resolvePageSize(searchParams.get("pageSize"), dashboardDefaultPageSize);
    const effectivePage = pageSize === undefined ? 1 : page;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (search) {
      where.OR = [
        { entityName: { contains: search, mode: "insensitive" } },
        { userEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(pageSize === undefined
          ? {}
          : {
              skip: (effectivePage - 1) * pageSize,
              take: pageSize,
            }),
      }),
      prisma.auditLog.count({ where }),
    ]);

    const parsed = logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return NextResponse.json({ data: parsed, total, page: effectivePage, pageSize: pageSize ?? "all" });
  },
  { roles: ["ADMIN"] }
);

export const DELETE = withAuth(
  async (request: Request & { user?: { id: string; email: string } }) => {
    const count = await prisma.auditLog.count();
    await prisma.auditLog.deleteMany({});

    await logAudit({
      action: "logs.purged",
      entityType: "logs",
      entityName: "audit_logs",
      details: { deleted: count },
      userId: request.user?.id,
      userEmail: request.user?.email,
    });

    return NextResponse.json({ success: true, deleted: count });
  },
  { roles: ["SUPER_ADMIN"] }
);
