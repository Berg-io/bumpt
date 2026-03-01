export interface AppDateSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
}

const DEFAULT_SETTINGS: AppDateSettings = {
  timezone: "UTC",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
};

function buildIntlOptions(
  settings: AppDateSettings,
  mode: "date" | "time" | "datetime"
): Intl.DateTimeFormatOptions {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: settings.timezone || "UTC",
  };

  const hour12 = settings.timeFormat === "12h";

  const fmt = settings.dateFormat || "DD.MM.YYYY";
  const isDMY = fmt.startsWith("DD");
  const isMDY = fmt.startsWith("MM");
  const useDot = fmt.includes(".");
  const useDash = fmt.includes("-") && fmt.startsWith("YYYY");

  if (mode === "date" || mode === "datetime") {
    opts.day = "2-digit";
    opts.month = "2-digit";
    opts.year = "numeric";
  }

  if (mode === "time" || mode === "datetime") {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
    opts.hour12 = hour12;
  }

  return opts;
}

function reorderDateParts(
  formatted: string,
  settings: AppDateSettings
): string {
  const fmt = settings.dateFormat || "DD.MM.YYYY";

  if (fmt === "YYYY-MM-DD") {
    const match = formatted.match(/(\d{1,2})\D(\d{1,2})\D(\d{4})/);
    if (match) {
      const [, a, b, year] = match;
      const rest = formatted.slice(formatted.indexOf(year) + 4);
      return `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}${rest}`;
    }
  }

  if (fmt.startsWith("MM")) {
    const match = formatted.match(/(\d{1,2})\D(\d{1,2})\D(\d{4})/);
    if (match) {
      const [fullMatch, day, month, year] = match;
      const sep = fmt.includes("/") ? "/" : fmt.includes(".") ? "." : "/";
      const reordered = `${month.padStart(2, "0")}${sep}${day.padStart(2, "0")}${sep}${year}`;
      return formatted.replace(fullMatch, reordered);
    }
  }

  if (fmt.includes(".")) {
    return formatted.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$1.$2.$3");
  }

  return formatted;
}

export function formatAppDate(
  dateStr: string | Date | null | undefined,
  settings?: AppDateSettings | null,
  mode: "date" | "time" | "datetime" = "datetime"
): string {
  if (!dateStr) return "–";

  const s = settings || DEFAULT_SETTINGS;

  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return "–";

    const opts = buildIntlOptions(s, mode);
    const locale = "en-GB";
    let result = new Intl.DateTimeFormat(locale, opts).format(date);

    result = reorderDateParts(result, s);

    return result;
  } catch {
    return typeof dateStr === "string" ? dateStr : "–";
  }
}

export function formatAppTime(
  dateStr: string | Date | null | undefined,
  settings?: AppDateSettings | null
): string {
  return formatAppDate(dateStr, settings, "time");
}

export { DEFAULT_SETTINGS };
