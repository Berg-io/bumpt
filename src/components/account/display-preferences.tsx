"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation, useLocale, SUPPORTED_LOCALES } from "@/i18n/config";
import { useToast } from "@/components/ui/toast";
import { COMMON_TIMEZONES, DATE_FORMATS, PAGE_SIZES, formatTzLabel } from "@/lib/display-options";

type PrefKey = "language" | "timezone" | "dateFormat" | "timeFormat" | "pageSize";
type Prefs = Partial<Record<PrefKey, string>>;

const SELECT_CLASS =
  "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

/**
 * Per-account display preferences. "Default" keeps following the app-wide General settings.
 */
export function DisplayPreferencesCard() {
  const t = useTranslation();
  const { toast } = useToast();
  const { reloadAppConfig } = useLocale();
  const [prefs, setPrefs] = useState<Prefs>({});
  const [defaults, setDefaults] = useState<Prefs>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, cfgRes] = await Promise.all([fetch("/api/auth/me"), fetch("/api/app-config", { cache: "no-store" })]);
        const me = meRes.ok ? await meRes.json() : null;
        const cfg = cfgRes.ok ? await cfgRes.json() : null;
        if (cancelled) return;
        setPrefs(me?.user?.preferences ?? {});
        setDefaults(cfg?.defaults ?? {});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const g = t.settings.general;
  const languageLabel = (loc: string) => g.languages[loc as keyof typeof g.languages] ?? loc;
  const timeLabel = (v: string) => g.timeFormats[v as keyof typeof g.timeFormats] ?? v;
  const pageLabel = (v: string) => (v === "all" ? t.dashboard.total : v);
  const defaultOption = (value: string | undefined, label: (v: string) => string) =>
    t.account.useDefault.replace("{value}", value ? label(value) : "—");

  const set = (key: PrefKey, value: string) => setPrefs((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const keys: PrefKey[] = ["language", "timezone", "dateFormat", "timeFormat", "pageSize"];
      const body = Object.fromEntries(keys.map((k) => [k, prefs[k] || null]));
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: body }),
      });
      if (!res.ok) {
        toast(t.settings.saveError, "error");
        return;
      }
      await reloadAppConfig();
      toast(t.account.preferencesSaved, "success");
    } finally {
      setSaving(false);
    }
  };

  const field = (key: PrefKey, label: string, options: { value: string; label: string }[], defaultLabel: string, hint?: string) => (
    <div>
      <label htmlFor={`pref-${key}`} className="mb-1 block text-sm font-medium">{label}</label>
      <select
        id={`pref-${key}`}
        value={prefs[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        disabled={loading || saving}
        className={SELECT_CLASS}
      >
        <option value="">{defaultLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <Card className="xl:col-span-2">
      <CardContent className="space-y-4 p-6">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{t.account.preferencesTitle}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t.account.preferencesDescription}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field(
            "language",
            g.language,
            SUPPORTED_LOCALES.map((l) => ({ value: l, label: languageLabel(l) })),
            defaultOption(defaults.language, languageLabel)
          )}
          {field(
            "timezone",
            g.timezone,
            COMMON_TIMEZONES.map((tz) => ({ value: tz, label: formatTzLabel(tz) })),
            defaultOption(defaults.timezone ?? "UTC", formatTzLabel)
          )}
          {field(
            "dateFormat",
            g.dateFormat,
            DATE_FORMATS.map((f) => ({ value: f, label: f })),
            defaultOption(defaults.dateFormat ?? "DD.MM.YYYY", (v) => v)
          )}
          {field(
            "timeFormat",
            g.timeFormat,
            ["24h", "12h"].map((f) => ({ value: f, label: timeLabel(f) })),
            defaultOption(defaults.timeFormat ?? "24h", timeLabel)
          )}
          {field(
            "pageSize",
            t.common.rowsPerPage,
            PAGE_SIZES.map((s) => ({ value: s, label: pageLabel(s) })),
            defaultOption(defaults.pageSize ?? "25", pageLabel)
          )}
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={loading || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t.common.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
