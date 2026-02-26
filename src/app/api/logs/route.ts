import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const parsed = logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return NextResponse.json({ data: parsed, total, page, pageSize });
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
