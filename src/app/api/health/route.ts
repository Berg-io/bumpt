import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Used by the Docker healthcheck: reports unhealthy when the database is
 * unreachable, not only when the HTTP server is down.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    await prisma.monitoredItem.count({ take: 1 });
    return NextResponse.json({ status: "ok", database: "ok", timestamp });
  } catch {
    return NextResponse.json({ status: "error", database: "unreachable", timestamp }, { status: 503 });
  }
}
