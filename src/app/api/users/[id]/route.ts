import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware-auth";
import { updateUserSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";

export const GET = withAuth(
  async (_request: Request, { params }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, authType: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  },
  { roles: ["SUPER_ADMIN"] }
);

export const PUT = withAuth(
  async (request: Request, { params, user: authUser }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const parsed = updateUserSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input data", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};
      const changes: Record<string, { from: unknown; to: unknown }> = {};

      if (parsed.data.email) {
        const emailTaken = await prisma.user.findFirst({
          where: { email: parsed.data.email, id: { not: id } },
        });
        if (emailTaken) {
          return NextResponse.json(
            { error: "E-Mail-Adresse bereits vergeben" },
            { status: 409 }
          );
        }
        updateData.email = parsed.data.email;
        if (existing.email !== parsed.data.email) {
          changes.email = { from: existing.email, to: parsed.data.email };
        }
      }

      if (parsed.data.password) {
        updateData.passwordHash = await hashPassword(parsed.data.password);
        changes.password = { from: "***", to: "*** (changed)" };
      }

      if (parsed.data.role) {
        updateData.role = parsed.data.role;
        if (existing.role !== parsed.data.role) {
          changes.role = { from: existing.role, to: parsed.data.role };
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, email: true, role: true, authType: true, createdAt: true },
      });

      await logAudit({
        action: "user.updated",
        entityType: "user",
        entityId: updated.id,
        entityName: updated.email,
        details: { changes },
        userId: authUser.id,
        userEmail: authUser.email,
      });

      return NextResponse.json(updated);
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["SUPER_ADMIN"] }
);

export const DELETE = withAuth(
  async (_request: Request, { params, user: authUser }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    const { id } = await params;

    if (authUser.id === id) {
      return NextResponse.json(
        { error: "Own account cannot be deleted" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      action: "user.deleted",
      entityType: "user",
      entityId: id,
      entityName: existing.email,
      details: { role: existing.role },
      userId: authUser.id,
      userEmail: authUser.email,
    });

    return NextResponse.json({ success: true });
  },
  { roles: ["SUPER_ADMIN"] }
);
