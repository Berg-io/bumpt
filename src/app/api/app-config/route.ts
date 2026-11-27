import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/settings";
import { getAuthUser } from "@/lib/middleware-auth";
import { getUserPreferences } from "@/lib/user-preferences";

/**
 * Public, non-sensitive UI settings needed before login (and by non-super-admin
 * users, who cannot read /api/settings): interface language and date display.
 * For a signed-in user, their own display preferences override the app-wide defaults,
 * which are also returned under `defaults`.
 */
export async function GET() {
  try {
    const s = await getAllSettings();
    const defaults = {
      language: s.app_language || process.env.APP_LANGUAGE || "en",
      timezone: s.app_timezone || null,
      dateFormat: s.app_date_format || null,
      timeFormat: s.app_time_format || null,
      pageSize: s.dashboard_default_page_size || null,
    };
    const user = await getAuthUser().catch(() => null);
    const prefs = await getUserPreferences(user?.id);
    return NextResponse.json({ ...defaults, ...prefs, defaults });
  } catch {
    return NextResponse.json({ language: process.env.APP_LANGUAGE || "en" });
  }
}
