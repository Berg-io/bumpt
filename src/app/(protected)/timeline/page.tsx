"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Flame, Megaphone, Radar, RefreshCw, ShieldAlert } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useDateSettings, useTranslation } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import { cn } from "@/utils/cn";
import type { TimelineEvent, TimelineEventType } from "@/lib/timeline/events";

interface TimelineResponse {
  days: number;
  total: number;
  truncated: boolean;
  events: TimelineEvent[];
  stats: {
    openCount: number;
    openKev: number;
    openCritical: number;
    monitoredWithCves: number;
    resolvedInPeriod: number;
  };
  items: Array<{ id: string; name: string }>;
}

const EVENT_STYLE: Record<TimelineEventType, { icon: React.ReactNode; dot: string }> = {
  published: { icon: <Megaphone className="h-4 w-4" />, dot: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
  detected: { icon: <Radar className="h-4 w-4" />, dot: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  kev: { icon: <Flame className="h-4 w-4" />, dot: "bg-red-500/15 text-red-600 dark:text-red-300" },
  resolved: { icon: <CheckCircle2 className="h-4 w-4" />, dot: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
};

function severityVariant(severity: string | null): "critical" | "warning" | "info" | "outline" {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return "critical";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "info";
    default:
      return "outline";
  }
}

function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function TimelinePage() {
  const t = useTranslation();
  const tl = t.timeline;
  const dateSettings = useDateSettings();
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState("90");
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [itemId, setItemId] = useState("");
  const [search, setSearch] = useState("");
  const [kevOnly, setKevOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ days });
    if (type) params.set("types", type);
    if (severity) params.set("severity", severity);
    if (itemId) params.set("itemId", itemId);
    if (search.trim()) params.set("search", search.trim());
    if (kevOnly) params.set("kevOnly", "true");
    if (openOnly) params.set("openOnly", "true");
    try {
      const res = await fetch(`/api/timeline?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as TimelineResponse);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [days, type, severity, itemId, search, kevOnly, openOnly]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const groups = useMemo(() => {
    const byDay = new Map<string, TimelineEvent[]>();
    for (const event of data?.events ?? []) {
      const key = dayKey(event.date);
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }
    return [...byDay.entries()];
  }, [data]);

  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  const dayLabel = (key: string, sample: string) =>
    key === today ? tl.today : key === yesterday ? tl.yesterday : formatAppDate(sample, dateSettings, "date");

  const eventLabel: Record<TimelineEventType, string> = {
    published: tl.eventPublished,
    detected: tl.eventDetected,
    kev: tl.eventKev,
    resolved: tl.eventResolved,
  };
  const severityLabel = (value: string | null) => {
    switch (value?.toUpperCase()) {
      case "CRITICAL": return tl.critical;
      case "HIGH": return tl.high;
      case "MEDIUM": return tl.medium;
      case "LOW": return tl.low;
      default: return tl.unknown;
    }
  };

  const stats = data?.stats;
  const statCards = [
    { label: tl.statsOpen, value: stats?.openCount, tone: "text-foreground" },
    { label: tl.statsKev, value: stats?.openKev, tone: "text-red-600 dark:text-red-400" },
    { label: tl.statsCritical, value: stats?.openCritical, tone: "text-red-600 dark:text-red-400" },
    { label: tl.statsItems, value: stats?.monitoredWithCves, tone: "text-amber-600 dark:text-amber-400" },
    { label: tl.statsResolved, value: stats?.resolvedInPeriod, tone: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <>
      <Header
        title={tl.title}
        subtitle={tl.subtitle}
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label={tl.refresh}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">{tl.refresh}</span>
          </Button>
        }
      />
      <div className="flex-1 space-y-6 p-4 lg:p-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className={cn("mt-1 text-2xl font-bold tabular-nums", card.tone)}>{card.value ?? "–"}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              aria-label={tl.period}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              options={[
                { value: "7", label: tl.days7 },
                { value: "30", label: tl.days30 },
                { value: "90", label: tl.days90 },
                { value: "365", label: tl.days365 },
                { value: "0", label: tl.allTime },
              ]}
            />
            <Select
              aria-label={tl.eventType}
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: "", label: tl.allEvents },
                { value: "published", label: tl.published },
                { value: "detected", label: tl.detected },
                { value: "kev", label: tl.kev },
                { value: "resolved", label: tl.resolved },
              ]}
            />
            <Select
              aria-label={tl.severity}
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              options={[
                { value: "", label: tl.allSeverities },
                { value: "CRITICAL", label: tl.critical },
                { value: "HIGH", label: tl.high },
                { value: "MEDIUM", label: tl.medium },
                { value: "LOW", label: tl.low },
                { value: "UNKNOWN", label: tl.unknown },
              ]}
            />
            <Select
              aria-label={tl.allItems}
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              options={[{ value: "", label: tl.allItems }, ...(data?.items ?? []).map((item) => ({ value: item.id, label: item.name }))]}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tl.search}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={kevOnly} onChange={(e) => setKevOnly(e.target.checked)} className="h-4 w-4" />
              {tl.kevOnly}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="h-4 w-4" />
              {tl.openOnly}
            </label>
          </CardContent>
        </Card>

        {error && (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">{tl.loadError}</CardContent>
          </Card>
        )}

        {!error && !loading && groups.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">{tl.empty}</p>
              <p className="max-w-md text-sm text-muted-foreground">{tl.emptyHint}</p>
            </CardContent>
          </Card>
        )}

        {groups.map(([key, events]) => (
          <section key={key} className="space-y-3">
            <h2 className="sticky top-0 z-10 bg-background/95 py-1 text-sm font-semibold text-muted-foreground backdrop-blur">
              {dayLabel(key, events[0].date)}
            </h2>
            <ol className="relative space-y-3 border-l pl-6">
              {events.map((event) => (
                <li key={event.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[37px] top-3 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background",
                      EVENT_STYLE[event.type].dot
                    )}
                    aria-hidden
                  >
                    {EVENT_STYLE[event.type].icon}
                  </span>
                  <Card>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {eventLabel[event.type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatAppDate(event.date, dateSettings, "time")}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`https://nvd.nist.gov/vuln/detail/${event.cveId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm font-semibold hover:underline"
                        >
                          {event.cveId}
                        </a>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm font-medium">{event.item.name}</span>
                        <Badge variant={severityVariant(event.severity)} className="text-[11px]">
                          {severityLabel(event.severity)}
                          {typeof event.cvssScore === "number" && ` ${event.cvssScore.toFixed(1)}`}
                        </Badge>
                        {event.isKev && (
                          <Badge variant="critical" className="text-[11px]">KEV</Badge>
                        )}
                        {event.knownRansomware && (
                          <Badge variant="critical" className="text-[11px]">{tl.ransomware}</Badge>
                        )}
                        {event.type !== "resolved" && event.open && (
                          <Badge variant="outline" className="text-[11px]">{tl.stillOpen}</Badge>
                        )}
                      </div>
                      {event.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{event.summary}</p>}
                      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {event.affectedVersion && (
                          <div><dt className="inline">{tl.installedVersion}: </dt><dd className="inline font-mono">{event.affectedVersion}</dd></div>
                        )}
                        {event.fixedVersion && (
                          <div><dt className="inline">{tl.fixedIn}: </dt><dd className="inline font-mono">{event.fixedVersion}</dd></div>
                        )}
                        {event.type === "resolved" && event.resolvedInVersion && (
                          <div><dt className="inline">{tl.resolvedIn}: </dt><dd className="inline font-mono">{event.resolvedInVersion}</dd></div>
                        )}
                        {typeof event.epss === "number" && (
                          <div><dt className="inline">{tl.epss}: </dt><dd className="inline">{(event.epss * 100).toFixed(1)} %</dd></div>
                        )}
                        {event.isKev && event.kevDueDate && (
                          <div><dt className="inline">{tl.kevDue}: </dt><dd className="inline">{formatAppDate(event.kevDueDate, dateSettings, "date")}</dd></div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        ))}

        {data?.truncated && <p className="text-center text-xs text-muted-foreground">{tl.truncated}</p>}
      </div>
    </>
  );
}
