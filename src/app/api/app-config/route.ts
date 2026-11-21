import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/settings";

/**
 * Public, non-sensitive UI settings needed before login (and by non-super-admin
 * users, who cannot read /api/settings): interface language and date display.
 */
export async function GET() {
  try {
    const s = await getAllSettings();
    return NextResponse.json({
      language: s.app_language || process.env.APP_LANGUAGE || "en",
      timezone: s.app_timezone || null,
      dateFormat: s.app_date_format || null,
      timeFormat: s.app_time_format || null,
    });
  } catch {
    return NextResponse.json({ language: process.env.APP_LANGUAGE || "en" });
  }
}
