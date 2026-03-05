import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { resolveVersion } from "@/lib/version-checkers";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";

export const POST = withAuth(
  async (request: Request, { params, user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;

    const source = await prisma.checkSource.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ error: "Check source not found" }, { status: 404 });
    }

    let sourceConfig: Record<string, unknown> = {};
    try { sourceConfig = JSON.parse(source.config); } catch { /* empty */ }

    let testParams: Record<string, string> = {};
    try {
      const body = await request.json();
      if (body.params) testParams = body.params;
    } catch { /* empty body is fine */ }

    const startTime = Date.now();
    let result: Awaited<ReturnType<typeof resolveVersion>> | null = null;
    let error: string | null = null;

    try {
      result = await resolveVersion(source.type, sourceConfig, testParams);
    } catch (err) {
      error = String(err);
    }

    const duration = Date.now() - startTime;
    const success = result?.version !== null && result?.version !== undefined;

    if (!success) {
      await logAudit({
        action: "item.check_failed",
        entityType: "source",
        entityId: source.id,
        entityName: source.name,
        details: {
          error: error || `No version found from connector "${source.type}"`,
          sourceType: source.type,
          testParams,
          duration,
        },
        userId: user.id,
        userEmail: user.email,
      });
    }

    return NextResponse.json({
      success,
      version: result?.version ?? null,
      releaseNotes: result?.releaseNotes ?? null,
      releaseDate: result?.releaseDate ?? null,
      releaseUrl: result?.releaseUrl ?? null,
      cves: result?.cves ?? null,
      description: result?.description ?? null,
      duration,
      source: { id: source.id, name: source.name, type: source.type },
    });
  },
  { roles: ["ADMIN"] }
);
