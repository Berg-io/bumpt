"use client";

import { useState, useEffect, useCallback } from "react";
import {
  I18nContext,
  LocaleContext,
  DateSettingsContext,
  getTranslation,
  getHtmlLang,
  type SupportedLocale,
  type DateSettings,
} from "@/i18n/config";

const STORAGE_KEY = "app_language";

const DEFAULT_DATE_SETTINGS: DateSettings = {
  timezone: "UTC",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(STORAGE_KEY) as SupportedLocale) || "de";
    }
    return "de";
  });

  const [dateSettings, setDateSettings] = useState<DateSettings>(DEFAULT_DATE_SETTINGS);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = getHtmlLang(newLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = getHtmlLang(locale);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const s = data.settings;
        if (!cancelled && s) {
          if (s.app_language) setLocale(s.app_language as SupportedLocale);
          setDateSettings({
            timezone: s.app_timezone || DEFAULT_DATE_SETTINGS.timezone,
            dateFormat: s.app_date_format || DEFAULT_DATE_SETTINGS.dateFormat,
            timeFormat: s.app_time_format || DEFAULT_DATE_SETTINGS.timeFormat,
          });
        }
      } catch {
        // use defaults
      }
    }
    fetchSettings();
    return () => { cancelled = true; };
  }, [setLocale]);

  return (
    <LocaleContext value={{ locale, setLocale }}>
      <DateSettingsContext value={dateSettings}>
        <I18nContext value={getTranslation(locale)}>
          {children}
        </I18nContext>
      </DateSettingsContext>
    </LocaleContext>
  );
}
