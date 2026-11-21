"use client";

import { useState, useEffect, useCallback } from "react";
import {
  I18nContext,
  LocaleContext,
  DateSettingsContext,
  getTranslation,
  getHtmlLang,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  type DateSettings,
} from "@/i18n/config";

const STORAGE_KEY = "app_language";

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

const DEFAULT_DATE_SETTINGS: DateSettings = {
  timezone: "UTC",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isSupportedLocale(stored)) return stored;
    }
    return "en";
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
        // Public endpoint: works on the login page and for non-super-admin users.
        const res = await fetch("/api/app-config");
        if (!res.ok) return;
        const s = await res.json();
        if (!cancelled && s) {
          if (s.language && isSupportedLocale(s.language)) setLocale(s.language);
          setDateSettings({
            timezone: s.timezone || DEFAULT_DATE_SETTINGS.timezone,
            dateFormat: s.dateFormat || DEFAULT_DATE_SETTINGS.dateFormat,
            timeFormat: s.timeFormat || DEFAULT_DATE_SETTINGS.timeFormat,
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
