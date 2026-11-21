import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { withAuth } from "@/lib/middleware-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildOtpauthUrl, generateTotpSecret, verifyTotp } from "@/lib/totp";
import type { JWTPayload } from "@/types";

type Ctx = { params: Promise<Record<string, string>>; user: JWTPayload };

/** Two-factor authentication status of the signed-in user. */
export const GET = withAuth(async (_request: Request, { user }: Ctx) => {
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpEnabled: true, authType: true },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ enabled: account.totpEnabled, authType: account.authType });
});

/**
 * Actions:
 * - setup: creates a new secret (not active yet) and returns the QR code
 * - enable: activates it after checking a code from the authenticator app
 * - disable: turns it off after checking a current code
 */
export const POST = withAuth(async (request: Request, { user }: Ctx) => {
  const body = (await request.json().catch(() => ({}))) as { action?: string; code?: string };
  const account = await prisma.user.findUnique({ where: { id: user.id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "setup") {
    if (account.totpEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 409 });
    }
    const secret = generateTotpSecret();
    await prisma.user.update({ where: { id: account.id }, data: { totpSecret: secret, totpEnabled: false } });
    const otpauthUrl = buildOtpauthUrl(secret, account.email);
    const qrCode = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
    return NextResponse.json({ secret, otpauthUrl, qrCode });
  }

  if (body.action === "enable") {
    if (!account.totpSecret || !verifyTotp(account.totpSecret, body.code ?? "")) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    await prisma.user.update({ where: { id: account.id }, data: { totpEnabled: true } });
    await logAudit({
      action: "user.updated",
      entityType: "user",
      entityId: account.id,
      entityName: account.email,
      details: { mfa: "enabled" },
      userId: account.id,
      userEmail: account.email,
    });
    return NextResponse.json({ enabled: true });
  }

  if (body.action === "disable") {
    if (!account.totpEnabled || !account.totpSecret || !verifyTotp(account.totpSecret, body.code ?? "")) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }
    await prisma.user.update({ where: { id: account.id }, data: { totpEnabled: false, totpSecret: null } });
    await logAudit({
      action: "user.updated",
      entityType: "user",
      entityId: account.id,
      entityName: account.email,
      details: { mfa: "disabled" },
      userId: account.id,
      userEmail: account.email,
    });
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});
