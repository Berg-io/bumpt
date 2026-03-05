import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { updateItemSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { computeInternalScore } from "@/lib/risk-score";
import type { JWTPayload } from "@/types";

function isEolPast(eolDate: string | null | undefined): boolean {
  if (!eolDate || eolDate === "false") return false;
  if (eolDate === "true") return true;
  const d = new Date(eolDate);
  return !isNaN(d.getTime()) && d < new Date();
}

function parseCveCount(cvesRaw: string | null | undefined): number {
  if (!cvesRaw) return 0;
  try {
    const parsed = JSON.parse(cvesRaw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export const GET = withAuth(
  async (_request: Request, { params }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;
    const item = await prisma.monitoredItem.findUnique({
      where: { id },
      include: {
        logs: { orderBy: { changedAt: "desc" }, take: 20 },
        source: { select: { id: true, name: true, type: true } },
      },
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
      let item = await prisma.monitoredItem.update({
        where: { id },
        data: {
          ...updateData,
          ...(tagArray !== undefined ? { tags: JSON.stringify(tagArray) } : {}),
        },
      });

      const shouldRecomputeBpt =
        "assetCriticality" in parsed.data ||
        "environment" in parsed.data ||
        "networkExposure" in parsed.data ||
        "hostsSensitiveData" in parsed.data ||
        "hasPrivilegedAccess" in parsed.data ||
        "hasCompensatingControls" in parsed.data ||
        "eolDate" in parsed.data;

      if (shouldRecomputeBpt) {
        const cveCount = parseCveCount(item.cves);
        const internal = computeInternalScore(item.externalScore ?? null, {
          assetCriticality: item.assetCriticality ?? null,
          environment: item.environment ?? null,
          networkExposure: item.networkExposure ?? null,
          hostsSensitiveData: item.hostsSensitiveData ?? null,
          hasPrivilegedAccess: item.hasPrivilegedAccess ?? null,
          hasCompensatingControls: item.hasCompensatingControls ?? null,
        }, item.epssPercent ?? null, isEolPast(item.eolDate), cveCount);

        item = await prisma.monitoredItem.update({
          where: { id },
          data: {
            internalScore: internal.score,
            internalSeverity: internal.severity,
            scoreConfidence: internal.confidence,
            scoreUpdatedAt: new Date(),
          },
        });
      }

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
