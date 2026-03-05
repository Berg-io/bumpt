import crypto from "crypto";
import type { JWTPayload } from "@/types";

const API_KEY_PREFIX = "bumpt_";

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString("hex");
  const raw = `${API_KEY_PREFIX}${randomBytes}`;
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.substring(0, 12);
  return { raw, hash, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(_key: string): Promise<JWTPayload | null> {
  // API keys require a Professional license
  return null;
}
