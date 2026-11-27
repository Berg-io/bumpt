// Options shared by the app-wide General settings and the per-account display preferences.
export const COMMON_TIMEZONES = [
  "UTC",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Zurich",
  "Europe/Rome", "Europe/Madrid", "Europe/Amsterdam", "Europe/Brussels",
  "Europe/Vienna", "Europe/Warsaw", "Europe/Prague", "Europe/Budapest",
  "Europe/Bucharest", "Europe/Athens", "Europe/Helsinki", "Europe/Moscow",
  "Europe/Istanbul",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
  "America/Mexico_City", "America/Toronto", "America/Vancouver",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Singapore",
  "Asia/Seoul", "Asia/Kolkata", "Asia/Dubai", "Asia/Tehran",
  "Asia/Riyadh", "Asia/Bangkok", "Asia/Jakarta",
  "Australia/Sydney", "Australia/Melbourne",
  "Pacific/Auckland", "Pacific/Honolulu",
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos",
];

export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD.MM.YYYY"];
export const TIME_FORMATS = ["24h", "12h"] as const;
export const PAGE_SIZES = ["25", "50", "100", "500", "all"] as const;

export function formatTzLabel(tz: string): string {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const diff = (local.getTime() - utc.getTime()) / 60000;
    const sign = diff >= 0 ? "+" : "-";
    const h = String(Math.floor(Math.abs(diff) / 60)).padStart(2, "0");
    const m = String(Math.abs(diff) % 60).padStart(2, "0");
    return `(UTC${sign}${h}:${m}) ${tz.replace(/_/g, " ")}`;
  } catch {
    return tz;
  }
}
