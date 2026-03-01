import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getAuthUser } from "@/lib/middleware-auth";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const user = await getAuthUser();

  if (user) {
    await logAudit({
      action: "auth.logout",
      entityType: "auth",
      entityId: user.id,
      entityName: user.email,
      userId: user.id,
      userEmail: user.email,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
