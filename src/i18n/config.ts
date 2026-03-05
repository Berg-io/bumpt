"use client";

import { createContext, useContext } from "react";
import { de } from "./de";
import { en } from "./en";
import { fr } from "./fr";
import { gsw } from "./gsw";
import { it } from "./it";
import { es } from "./es";
import { pt } from "./pt";
import { ru } from "./ru";
import { ja } from "./ja";
import { tr } from "./tr";
import { fa } from "./fa";
import { nl } from "./nl";
import { zh } from "./zh";
import type { TranslationKeys } from "./de";

export const SUPPORTED_LOCALES = ["de", "en", "fr", "gsw", "it", "es", "pt", "ru", "ja", "tr", "fa", "nl", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const translations: Record<string, TranslationKeys> = { de, en, fr, gsw, it, es, pt, ru, ja, tr, fa, nl, zh };

const LOCALE_TO_HTML_LANG: Record<string, string> = {
  de: "de",
  en: "en",
  fr: "fr",
  gsw: "de-CH",
  it: "it",
  es: "es",
  pt: "pt",
  ru: "ru",
  ja: "ja",
  tr: "tr",
  fa: "fa",
  nl: "nl",
  zh: "zh",
};

const I18nContext = createContext<TranslationKeys>(de);

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "de",
  setLocale: () => {},
});

export interface DateSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
}

export const DateSettingsContext = createContext<DateSettings>({
  timezone: "UTC",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
});

export function useDateSettings(): DateSettings {
  return useContext(DateSettingsContext);
}

export function useTranslation() {
  return useContext(I18nContext);
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function getTranslation(locale: string = "de"): TranslationKeys {
  return translations[locale] || de;
}

export function getHtmlLang(locale: string): string {
  return LOCALE_TO_HTML_LANG[locale] || "de";
}

export { I18nContext };
