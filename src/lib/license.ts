import { createHash, createPublicKey, randomUUID, verify } from "crypto";
import os from "os";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type LicenseEdition = "community" | "professional";
export type LicensedFeature = "sso" | "apiKeys" | "ai" | "webhooks" | "reports";

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
const CLOCK_SKEW_TOLERANCE_MS = 2 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const LICENSE_LAST_SEEN_AT_KEY = "license_last_seen_at";
const LICENSE_INSTANCE_ID_KEY = "license_instance_id";
const INSTANCE_FINGERPRINT_HEADER = "bumpt-instance-v1";

const DEFAULT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAir+yR/jAPEs89TZQWjfYNqVY5Z0mJ9Z9XJRUceNY/mE=
-----END PUBLIC KEY-----`;

const PUBLIC_KEYS: Record<string, string> = {
  "2026-01-ed25519-main": DEFAULT_PUBLIC_KEY_PEM,
  legacy: DEFAULT_PUBLIC_KEY_PEM,
};

const featureSchema = z.object({
  sso: z.boolean(),
  apiKeys: z.boolean(),
  ai: z.boolean(),
  webhooks: z.boolean(),
  reports: z.boolean(),
});

const limitsSchema = z.object({
  maxItems: z.number().int().min(-1),
  maxUsers: z.number().int().positive().optional(),
});

const bindingSchema = z.object({
  mode: z.enum(["none", "instance", "domain"]).default("none"),
  fingerprintHash: z.string().nullable().optional(),
  allowedDomains: z.array(z.string()).default([]),
});

const v1PayloadSchema = z.object({
  schemaVersion: z.literal(1),
  kid: z.string().min(1),
  licenseId: z.string().min(1),
  customerId: z.string().min(1),
  customerEmail: z.string().email(),
  plan: z.string().min(1),
  edition: z.enum(["community", "professional"]),
  features: featureSchema,
  limits: limitsSchema,
  instanceBinding: bindingSchema,
  issuedAt: z.string().datetime(),
  notBefore: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const legacyPayloadSchema = z.object({
  edition: z.string(),
  maxItems: z.number().int().min(-1),
  ssoEnabled: z.boolean(),
  apiKeysEnabled: z.boolean(),
  aiEnabled: z.boolean(),
  webhooksEnabled: z.boolean(),
  reportsEnabled: z.boolean(),
  customerEmail: z.string(),
  expiresAt: z.string(),
  issuedAt: z.string().optional(),
});

interface LicenseClaims {
  edition: LicenseEdition;
  maxItems: number;
  ssoEnabled: boolean;
  apiKeysEnabled: boolean;
  aiEnabled: boolean;
  webhooksEnabled: boolean;
  reportsEnabled: boolean;
  customerEmail: string | null;
  expiresAt: string;
  notBefore: string | null;
  issuedAt: string;
  instanceBinding: {
    mode: "none" | "instance" | "domain";
    fingerprintHash: string | null;
    allowedDomains: string[];
  } | null;
}

let cache: { info: LicenseInfo; verifiedAt: number } | null = null;

export function invalidateLicenseCache() {
  cache = null;
}

function communityLicense(message?: string, valid = true): LicenseInfo {
  return {
    edition: "community",
    valid,
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

function resolvePublicKey(kid?: string): string | null {
  if (kid && PUBLIC_KEYS[kid]) return PUBLIC_KEYS[kid];
  if (!kid) return PUBLIC_KEYS.legacy;
  return null;
}

async function getAppSettingValue(key: string): Promise<string | null> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setAppSettingValue(key: string, value: string): Promise<void> {
  try {
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  } catch {
    // Best effort to avoid blocking app startup.
  }
}

async function getOrCreateInstanceId(): Promise<string> {
  const existing = await getAppSettingValue(LICENSE_INSTANCE_ID_KEY);
  if (existing) return existing;
  const created = randomUUID();
  await setAppSettingValue(LICENSE_INSTANCE_ID_KEY, created);
  return created;
}

function computeInstanceFingerprint(instanceId: string): string {
  return createHash("sha256")
    .update(`${INSTANCE_FINGERPRINT_HEADER}:${instanceId}:${os.hostname()}`)
    .digest("hex");
}

function appDomain(): string | null {
  const url = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function parseDateMs(input: string | null): number | null {
  if (!input) return null;
  const ms = new Date(input).getTime();
  if (!Number.isFinite(ms)) return null;
  return ms;
}

function toClaims(payload: unknown): LicenseClaims | null {
  const v1 = v1PayloadSchema.safeParse(payload);
  if (v1.success) {
    return {
      edition: v1.data.edition,
      maxItems: v1.data.limits.maxItems,
      ssoEnabled: v1.data.features.sso,
      apiKeysEnabled: v1.data.features.apiKeys,
      aiEnabled: v1.data.features.ai,
      webhooksEnabled: v1.data.features.webhooks,
      reportsEnabled: v1.data.features.reports,
      customerEmail: v1.data.customerEmail,
      expiresAt: v1.data.expiresAt,
      notBefore: v1.data.notBefore,
      issuedAt: v1.data.issuedAt,
      instanceBinding: {
        mode: v1.data.instanceBinding.mode,
        fingerprintHash: v1.data.instanceBinding.fingerprintHash ?? null,
        allowedDomains: v1.data.instanceBinding.allowedDomains,
      },
    };
  }

  const legacy = legacyPayloadSchema.safeParse(payload);
  if (!legacy.success) return null;
  return {
    edition: legacy.data.edition === "community" ? "community" : "professional",
    maxItems: legacy.data.maxItems,
    ssoEnabled: legacy.data.ssoEnabled,
    apiKeysEnabled: legacy.data.apiKeysEnabled,
    aiEnabled: legacy.data.aiEnabled,
    webhooksEnabled: legacy.data.webhooksEnabled,
    reportsEnabled: legacy.data.reportsEnabled,
    customerEmail: legacy.data.customerEmail ?? null,
    expiresAt: legacy.data.expiresAt,
    notBefore: null,
    issuedAt: legacy.data.issuedAt ?? new Date().toISOString(),
    instanceBinding: null,
  };
}

async function validateClockMonotonicity(nowMs: number): Promise<boolean> {
  const lastSeen = await getAppSettingValue(LICENSE_LAST_SEEN_AT_KEY);
  const lastSeenMs = parseDateMs(lastSeen);
  if (lastSeenMs && nowMs + CLOCK_SKEW_TOLERANCE_MS < lastSeenMs) return false;
  if (!lastSeenMs || nowMs > lastSeenMs) {
    await setAppSettingValue(LICENSE_LAST_SEEN_AT_KEY, new Date(nowMs).toISOString());
  }
  return true;
}

async function isBindingValid(binding: LicenseClaims["instanceBinding"]): Promise<boolean> {
  if (!binding || binding.mode === "none") return true;

  if (binding.mode === "instance") {
    if (!binding.fingerprintHash) return false;
    const instanceId = await getOrCreateInstanceId();
    return computeInstanceFingerprint(instanceId) === binding.fingerprintHash;
  }

  const host = appDomain();
  if (!host || binding.allowedDomains.length === 0) return false;
  return binding.allowedDomains.some((allowed) => allowed.toLowerCase() === host);
}

async function verifySignedKey(licenseKey: string): Promise<LicenseInfo> {
  const parts = licenseKey.split(".");
  if (parts.length !== 2) {
    return communityLicense("license_invalid_format", false);
  }

  const [payloadB64, signatureB64] = parts;

  try {
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr) as { kid?: string };
    const publicKeyPem = resolvePublicKey(payload.kid);
    if (!publicKeyPem) {
      return communityLicense("license_unknown_kid", false);
    }

    const publicKey = createPublicKey(publicKeyPem);
    const signature = Buffer.from(signatureB64, "base64url");
    const isValid = verify(null, Buffer.from(payloadB64), publicKey, signature);
    if (!isValid) {
      return communityLicense("license_invalid_signature", false);
    }

    const claims = toClaims(payload);
    if (!claims) {
      return communityLicense("license_invalid_payload", false);
    }

    const nowMs = Date.now();
    const expiresAtMs = parseDateMs(claims.expiresAt);
    if (!expiresAtMs) return communityLicense("license_invalid_expiration", false);
    if (expiresAtMs < nowMs) return communityLicense("license_expired", false);

    const notBeforeMs = parseDateMs(claims.notBefore);
    if (notBeforeMs && nowMs + CLOCK_SKEW_TOLERANCE_MS < notBeforeMs) {
      return communityLicense("license_not_active_yet", false);
    }

    if (!(await validateClockMonotonicity(nowMs))) {
      return communityLicense("license_clock_rollback_detected", false);
    }

    if (!(await isBindingValid(claims.instanceBinding))) {
      return communityLicense("license_binding_mismatch", false);
    }

    return {
      edition: claims.edition,
      valid: true,
      maxItems: claims.maxItems,
      ssoEnabled: claims.ssoEnabled,
      apiKeysEnabled: claims.apiKeysEnabled,
      aiEnabled: claims.aiEnabled,
      webhooksEnabled: claims.webhooksEnabled,
      reportsEnabled: claims.reportsEnabled,
      expiresAt: claims.expiresAt ?? null,
      customerEmail: claims.customerEmail,
      message: null,
    };
  } catch {
    return communityLicense("license_verification_failed", false);
  }
}

export async function verifyLicenseKey(licenseKey: string): Promise<LicenseInfo> {
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

  const info = await verifySignedKey(key);
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

export async function isFeatureEnabled(feature: LicensedFeature): Promise<boolean> {
  const license = await getLicenseInfo();
  if (!license.valid) return false;
  if (feature === "sso") return license.ssoEnabled;
  if (feature === "ai") return license.aiEnabled;
  if (feature === "webhooks") return license.webhooksEnabled;
  if (feature === "reports") return license.reportsEnabled;
  return license.apiKeysEnabled;
}
