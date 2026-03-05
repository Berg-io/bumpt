import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { createSourceSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";

export const GET = withAuth(
  async () => {
    const sources = await prisma.checkSource.findMany({
      orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
      include: { _count: { select: { items: true } } },
    });

    return NextResponse.json({ data: sources });
  },
  { roles: ["ADMIN"] }
);

export const POST = withAuth(
  async (request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const body = await request.json();
      const parsed = createSourceSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const source = await prisma.checkSource.create({
        data: parsed.data,
      });

      await logAudit({
        action: "source.created",
        entityType: "source",
        entityId: source.id,
        entityName: source.name,
        details: { type: source.type },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json(source, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["ADMIN"] }
);
