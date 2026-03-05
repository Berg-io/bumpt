import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";

export const GET = withAuth(
  async () => {
    const entries = await prisma.csvDataEntry.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ entries, total: entries.length });
  },
  { roles: ["SUPER_ADMIN"] }
);

export const POST = withAuth(
  async (request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const body = await request.json();
      const { entries } = body as { entries: { name: string; version: string }[] };

      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return NextResponse.json({ error: "No valid entries provided" }, { status: 400 });
      }

      const invalid = entries.filter((e) => !e.name?.trim() || !e.version?.trim());
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `${invalid.length} entries have missing name or version` },
          { status: 400 }
        );
      }

      let created = 0;
      let updated = 0;

      for (const entry of entries) {
        const name = entry.name.trim();
        const version = entry.version.trim();

        const existing = await prisma.csvDataEntry.findUnique({ where: { name } });
        if (existing) {
          await prisma.csvDataEntry.update({
            where: { name },
            data: { version },
          });
          updated++;
        } else {
          await prisma.csvDataEntry.create({
            data: { name, version },
          });
          created++;
        }
      }

      await logAudit({
        action: "csvdata.uploaded",
        entityType: "csvdata",
        entityName: "CSV Data",
        details: { entriesCount: entries.length, created, updated },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json({ success: true, created, updated, total: entries.length });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["SUPER_ADMIN"] }
);

export const DELETE = withAuth(
  async (request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");

      if (id) {
        await prisma.csvDataEntry.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }

      const { count } = await prisma.csvDataEntry.deleteMany({});

      await logAudit({
        action: "csvdata.cleared",
        entityType: "csvdata",
        entityName: "CSV Data",
        details: { deletedCount: count },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json({ success: true, deleted: count });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["SUPER_ADMIN"] }
);
