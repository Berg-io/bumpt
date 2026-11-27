// Plain module (no "use client"), so server code can read the list too.
export const SUPPORTED_LOCALES = ["de", "en", "fr", "gsw", "it", "es", "pt", "ru", "ja", "tr", "fa", "nl", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
