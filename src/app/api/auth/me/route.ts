import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/middleware-auth";
import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

/** Lets any signed-in user with a local account change their own password. */
export async function PUT(request: Request) {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Password is managed by your identity provider" }, { status: 400 });
  }
  if (!(await comparePassword(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  await logAudit({
    action: "user.updated",
    entityType: "user",
    entityId: user.id,
    entityName: user.email,
    details: { password: "changed by user" },
    userId: user.id,
    userEmail: user.email,
  });
  return NextResponse.json({ success: true });
}

export async function GET() {
  const authUser = await getAuthUser();

  if (!authUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      role: true,
      authType: true,
      totpEnabled: true,
      createdAt: true,
    },
  });

  if (user) {
    return NextResponse.json({ user });
  }

  return NextResponse.json({
    user: {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
    },
  });
}
