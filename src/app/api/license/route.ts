import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-auth";
import { getLicenseInfo, canCreateItem, verifyLicenseKey, invalidateLicenseCache } from "@/lib/license";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async () => {
  const [license, itemStatus] = await Promise.all([
    getLicenseInfo(),
    canCreateItem(),
  ]);

  let source: "database" | "environment" | "none" = "none";
  try {
    const dbSetting = await prisma.appSetting.findUnique({ where: { key: "license_key" } });
    if (dbSetting?.value) source = "database";
    else if (process.env.LICENSE_KEY) source = "environment";
  } catch {
    if (process.env.LICENSE_KEY) source = "environment";
  }

  return NextResponse.json({
    edition: license.edition,
    valid: license.valid,
    maxItems: license.maxItems,
    currentItems: itemStatus.current,
    ssoEnabled: license.ssoEnabled,
    apiKeysEnabled: license.apiKeysEnabled,
    aiEnabled: license.aiEnabled,
    webhooksEnabled: license.webhooksEnabled,
    reportsEnabled: license.reportsEnabled,
    expiresAt: license.expiresAt,
    customerEmail: license.customerEmail,
    message: license.message,
    source,
  });
});

export const POST = withAuth(async (request) => {
  const body = await request.json();
  const licenseKey = body.licenseKey?.trim();

  if (!licenseKey || typeof licenseKey !== "string") {
    return NextResponse.json({ error: "License key is required" }, { status: 400 });
  }

  const info = verifyLicenseKey(licenseKey);

  if (info.edition === "community" && info.message) {
    return NextResponse.json({
      error: "Invalid license key",
      message: info.message,
    }, { status: 400 });
  }

  await prisma.appSetting.upsert({
    where: { key: "license_key" },
    update: { value: licenseKey },
    create: { key: "license_key", value: licenseKey },
  });

  invalidateLicenseCache();

  const itemStatus = await canCreateItem();

  return NextResponse.json({
    edition: info.edition,
    valid: info.valid,
    maxItems: info.maxItems,
    currentItems: itemStatus.current,
    ssoEnabled: info.ssoEnabled,
    apiKeysEnabled: info.apiKeysEnabled,
    aiEnabled: info.aiEnabled,
    webhooksEnabled: info.webhooksEnabled,
    reportsEnabled: info.reportsEnabled,
    expiresAt: info.expiresAt,
    customerEmail: info.customerEmail,
    message: info.message,
    source: "database" as const,
  });
}, { roles: ["SUPER_ADMIN"] });

export const DELETE = withAuth(async () => {
  await prisma.appSetting.deleteMany({ where: { key: "license_key" } });
  invalidateLicenseCache();

  const license = await getLicenseInfo();
  const itemStatus = await canCreateItem();

  return NextResponse.json({
    edition: license.edition,
    valid: license.valid,
    maxItems: license.maxItems,
    currentItems: itemStatus.current,
    ssoEnabled: license.ssoEnabled,
    apiKeysEnabled: license.apiKeysEnabled,
    aiEnabled: license.aiEnabled,
    webhooksEnabled: license.webhooksEnabled,
    reportsEnabled: license.reportsEnabled,
    expiresAt: license.expiresAt,
    message: license.message,
    source: process.env.LICENSE_KEY ? "environment" as const : "none" as const,
  });
}, { roles: ["SUPER_ADMIN"] });
