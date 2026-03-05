import { createPublicKey, verify } from "crypto";
import { prisma } from "@/lib/prisma";

export type LicenseEdition = "community" | "professional";

export interface LicenseInfo {
  edition: LicenseEdition;
  valid: boolean;
  maxItems: number;
  ssoEnabled: boolean;
  apiKeysEnabled: boolean;
  aiEnabled: boolean;
  webhooksEnabled: boolean;
  reportsEnabled: boolean;
  expiresAt: string | null;
  customerEmail: string | null;
  message: string | null;
}

const COMMUNITY_MAX_ITEMS = 25;

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAir+yR/jAPEs89TZQWjfYNqVY5Z0mJ9Z9XJRUceNY/mE=
-----END PUBLIC KEY-----`;

let cache: { info: LicenseInfo; verifiedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // re-check expiry every hour

export function invalidateLicenseCache() {
  cache = null;
}

function communityLicense(message?: string): LicenseInfo {
  return {
    edition: "community",
    valid: true,
    maxItems: COMMUNITY_MAX_ITEMS,
    ssoEnabled: false,
    apiKeysEnabled: false,
    aiEnabled: false,
    webhooksEnabled: false,
    reportsEnabled: false,
    expiresAt: null,
    customerEmail: null,
    message: message ?? null,
  };
}

interface LicensePayload {
  edition: string;
  maxItems: number;
  ssoEnabled: boolean;
  apiKeysEnabled: boolean;
  aiEnabled: boolean;
  webhooksEnabled: boolean;
  reportsEnabled: boolean;
  customerEmail: string;
  expiresAt: string;
  issuedAt: string;
}

function verifySignedKey(licenseKey: string): LicenseInfo {
  const parts = licenseKey.split(".");
  if (parts.length !== 2) {
    return communityLicense("license_invalid_format");
  }

  const [payloadB64, signatureB64] = parts;

  try {
    const publicKey = createPublicKey(PUBLIC_KEY_PEM);
    const signature = Buffer.from(signatureB64, "base64url");
    const isValid = verify(null, Buffer.from(payloadB64), publicKey, signature);

    if (!isValid) {
      return communityLicense("license_invalid_signature");
    }

    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: LicensePayload = JSON.parse(payloadStr);

    if (payload.expiresAt) {
      const expiry = new Date(payload.expiresAt);
      if (expiry.getTime() < Date.now()) {
        return communityLicense("license_expired");
      }
    }

    return {
      edition: (payload.edition as LicenseEdition) || "professional",
      valid: true,
      maxItems: payload.maxItems ?? -1,
      ssoEnabled: payload.ssoEnabled ?? true,
      apiKeysEnabled: payload.apiKeysEnabled ?? true,
      aiEnabled: payload.aiEnabled ?? true,
      webhooksEnabled: payload.webhooksEnabled ?? true,
      reportsEnabled: payload.reportsEnabled ?? true,
      expiresAt: payload.expiresAt ?? null,
      customerEmail: payload.customerEmail ?? null,
      message: null,
    };
  } catch {
    return communityLicense("license_verification_failed");
  }
}

export function verifyLicenseKey(licenseKey: string): LicenseInfo {
  return verifySignedKey(licenseKey);
}

export async function getLicenseInfo(): Promise<LicenseInfo> {
  if (cache) {
    const age = Date.now() - cache.verifiedAt;
    if (age < CACHE_TTL_MS) return cache.info;
  }

  let key: string | undefined;
  try {
    const dbSetting = await prisma.appSetting.findUnique({ where: { key: "license_key" } });
    key = dbSetting?.value || undefined;
  } catch {
    // DB not available yet (migration pending, etc.)
  }

  if (!key) key = process.env.LICENSE_KEY;
  if (!key) return communityLicense();

  const info = verifySignedKey(key);
  cache = { info, verifiedAt: Date.now() };
  return info;
}

export async function canCreateItem(): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  edition: LicenseEdition;
}> {
  const license = await getLicenseInfo();
  const count = await prisma.monitoredItem.count();

  if (license.maxItems === -1) {
    return { allowed: true, current: count, max: -1, edition: license.edition };
  }

  return {
    allowed: count < license.maxItems,
    current: count,
    max: license.maxItems,
    edition: license.edition,
  };
}

export async function isFeatureEnabled(
  feature: "sso" | "apiKeys" | "ai" | "webhooks" | "reports"
): Promise<boolean> {
  const license = await getLicenseInfo();
  if (feature === "sso") return license.ssoEnabled;
  if (feature === "ai") return license.aiEnabled;
  if (feature === "webhooks") return license.webhooksEnabled;
  if (feature === "reports") return license.reportsEnabled;
  return license.apiKeysEnabled;
}
