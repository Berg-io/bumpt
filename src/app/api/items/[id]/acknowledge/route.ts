import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";

function isEolPast(eolDate: string | null | undefined): boolean {
  if (!eolDate || eolDate === "false") return false;
  if (eolDate === "true") return true;
  const d = new Date(eolDate);
  return !isNaN(d.getTime()) && d < new Date();
}

export const POST = withAuth(
  async (_request: Request, { params, user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;
    const item = await prisma.monitoredItem.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.latestVersion) {
      return NextResponse.json(
        { error: "Keine neueste Version vorhanden" },
        { status: 400 }
      );
    }

    if (item.currentVersion === item.latestVersion) {
      return NextResponse.json(
        { error: "Version ist bereits aktuell" },
        { status: 400 }
      );
    }

    const oldVersion = item.currentVersion;
    let rawMetadata: Record<string, unknown> = {};
    try {
      rawMetadata =
        item.rawMetadata && typeof item.rawMetadata === "string"
          ? (JSON.parse(item.rawMetadata) as Record<string, unknown>)
          : {};
    } catch {
      rawMetadata = {};
    }
    if ("cveMetadata" in rawMetadata) {
      delete rawMetadata.cveMetadata;
    }

    const updated = await prisma.monitoredItem.update({
      where: { id },
      data: {
        currentVersion: item.latestVersion,
        status: isEolPast(item.eolDate) ? "end_of_life" : "up_to_date",
        cves: null,
        externalScore: null,
        externalSeverity: null,
        externalVector: null,
        externalSource: null,
        epssPercent: null,
        vprScore: null,
        internalScore: null,
        internalSeverity: null,
        scoreConfidence: null,
        scoreUpdatedAt: new Date(),
        securityState: "no_known_vuln",
        rawMetadata: JSON.stringify(rawMetadata),
      },
    });

    if (oldVersion !== item.latestVersion) {
      await prisma.versionLog.create({
        data: {
          itemId: id,
          oldVersion: oldVersion,
          newVersion: item.latestVersion,
        },
      });
    }

    await logAudit({
      action: "item.version_acknowledged",
      entityType: "item",
      entityId: item.id,
      entityName: item.name,
      details: {
        previousVersion: oldVersion,
        acknowledgedVersion: item.latestVersion,
      },
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json(updated);
  },
  { roles: ["ADMIN"] }
);
