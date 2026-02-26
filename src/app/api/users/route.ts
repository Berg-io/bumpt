import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { createUserSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";

export const GET = withAuth(
  async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        authType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: users });
  },
  { roles: ["SUPER_ADMIN"] }
);

export const POST = withAuth(
  async (request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const body = await request.json();
      const parsed = createUserSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });

      if (existing) {
        return NextResponse.json(
          { error: "E-Mail-Adresse bereits vergeben" },
          { status: 409 }
        );
      }

      const passwordHash = await hashPassword(parsed.data.password);

      const newUser = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash,
          role: parsed.data.role,
        },
        select: {
          id: true,
          email: true,
          role: true,
          authType: true,
          createdAt: true,
        },
      });

      await logAudit({
        action: "user.created",
        entityType: "user",
        entityId: newUser.id,
        entityName: newUser.email,
        details: { role: newUser.role },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json(newUser, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["SUPER_ADMIN"] }
);
