import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { DATE_FORMATS, PAGE_SIZES, TIME_FORMATS } from "@/lib/display-options";

/**
 * Per-account display preferences. Every field is optional: an absent field falls back
 * to the app-wide General settings, which stay the defaults (and drive e-mailed reports).
 */
export const userPreferencesSchema = z
  .object({
    language: z.enum(SUPPORTED_LOCALES),
    timezone: z.string().min(1).max(64).refine(isValidTimezone, "Invalid timezone"),
    dateFormat: z.enum(DATE_FORMATS as [string, ...string[]]),
    timeFormat: z.enum(TIME_FORMATS),
    pageSize: z.enum(PAGE_SIZES),
  })
  .partial();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Parses the stored JSON, dropping anything invalid instead of failing. */
export function parseUserPreferences(raw: string | null | undefined): UserPreferences {
  let data: unknown;
  try {
    data = JSON.parse(raw || "{}");
  } catch {
    return {};
  }
  if (!data || typeof data !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(userPreferencesSchema.shape)) {
    const value = (data as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === "") continue;
    const parsed = field.unwrap().safeParse(value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as UserPreferences;
}

/** Preferences of a signed-in user; {} for API keys, unknown users or a DB error. */
export async function getUserPreferences(userId: string | null | undefined): Promise<UserPreferences> {
  if (!userId) return {};
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
    return parseUserPreferences(user?.preferences);
  } catch {
    return {};
  }
}
