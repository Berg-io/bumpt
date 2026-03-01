import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-auth";
import { getAllSettings, setMultipleSettings, SETTING_KEYS } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { isFeatureEnabled } from "@/lib/license";
import type { JWTPayload } from "@/types";

const ALLOWED_KEYS = new Set<string>(Object.values(SETTING_KEYS));

function maskSensitive(key: string, value: string): string {
  if (
    key.includes("token") ||
    key.includes("api_key") ||
    key.includes("certificate") ||
    key.includes("password") ||
    key.includes("client_secret") ||
    key.includes("client_id")
  ) {
    return value ? "***" : "";
  }
  return value;
}

const DB_ENV_OVERRIDES: Record<string, string | undefined> = {
  db_type: process.env.DB_TYPE,
  db_host: process.env.DB_HOST,
  db_port: process.env.DB_PORT,
  db_name: process.env.DB_NAME,
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASSWORD,
  db_ssl: process.env.DB_SSL,
};

const SMTP_ENV_OVERRIDES: Record<string, string | undefined> = {
  smtp_host: process.env.SMTP_HOST,
  smtp_port: process.env.SMTP_PORT,
  smtp_secure: process.env.SMTP_SECURE,
  smtp_user: process.env.SMTP_USER,
  smtp_password: process.env.SMTP_PASSWORD,
  smtp_from: process.env.SMTP_FROM,
  smtp_configured: process.env.SMTP_HOST ? "true" : undefined,
};

const SMTP_KEYS = new Set<string>([
  "smtp_configured",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_user",
  "smtp_password",
  "smtp_from",
]);

export const GET = withAuth(
  async () => {
    const settings = await getAllSettings();

    for (const [key, envVal] of Object.entries(DB_ENV_OVERRIDES)) {
      if (envVal !== undefined) settings[key] = envVal;
    }
    for (const [key, envVal] of Object.entries(SMTP_ENV_OVERRIDES)) {
      if (envVal !== undefined) settings[key] = envVal;
    }

    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(settings)) {
      masked[key] = maskSensitive(key, value);
    }

    const hasValues: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(settings)) {
      hasValues[key] = !!value;
    }

    return NextResponse.json({ settings: masked, hasValues });
  },
  { roles: ["SUPER_ADMIN"] }
);

export const PUT = withAuth(
  async (request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const body = await request.json();
      const { settings } = body as { settings: Record<string, string> };

      if (!settings || typeof settings !== "object") {
        return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
      }

      const hasSmtpChanges = Object.keys(settings).some((key) => SMTP_KEYS.has(key) && settings[key] !== "***");
      if (hasSmtpChanges) {
        const webhooksEnabled = await isFeatureEnabled("webhooks");
        if (!webhooksEnabled) {
          return NextResponse.json({ error: "SMTP settings require Professional license" }, { status: 403 });
        }
      }

      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (ALLOWED_KEYS.has(key) && value !== "***") {
          filtered[key] = value;
        }
      }

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json({ error: "No valid settings" }, { status: 400 });
      }

      await setMultipleSettings(filtered);

      const changedKeys = Object.keys(filtered).map((k) =>
        k.includes("token") || k.includes("api_key") || k.includes("certificate") || k.includes("client_secret") || k.includes("client_id")
          ? `${k} (masked)`
          : k
      );

      await logAudit({
        action: "settings.updated",
        entityType: "settings",
        entityName: "App Settings",
        details: { keys: changedKeys },
        userId: user.id,
        userEmail: user.email,
      });

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["SUPER_ADMIN"] }
);
