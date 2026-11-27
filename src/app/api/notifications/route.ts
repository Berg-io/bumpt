import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function parseData(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Latest findings of the checks, newest first, with the unread count of the
 * signed-in account. Polled by the bell in the header.
 */
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  const state = await prisma.notificationReadState.findUnique({ where: { userId: user.id } });
  const readAt = state?.readAt ?? null;

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    prisma.notification.count({ where: readAt ? { createdAt: { gt: readAt } } : {} }),
  ]);

  return NextResponse.json({
    notifications: rows.map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      itemId: row.itemId,
      itemName: row.itemName,
      data: parseData(row.data),
      createdAt: row.createdAt.toISOString(),
      unread: !readAt || row.createdAt > readAt,
    })),
    unreadCount,
    readAt: readAt?.toISOString() ?? null,
  });
});

/** Marks every notification as read for the signed-in account. */
export const POST = withAuth(async (_request, { user }) => {
  const now = new Date();
  await prisma.notificationReadState.upsert({
    where: { userId: user.id },
    create: { userId: user.id, readAt: now },
    update: { readAt: now },
  });
  return NextResponse.json({ readAt: now.toISOString(), unreadCount: 0 });
});
