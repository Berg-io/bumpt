import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/middleware-auth";
import { prisma } from "@/lib/prisma";

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
