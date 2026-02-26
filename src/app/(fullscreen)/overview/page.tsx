"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowUpCircle,
  Minimize2,
  Maximize,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useTranslation, useLocale, useDateSettings } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import { cn } from "@/utils/cn";

interface MonitoredItem {
  id: string;
  name: string;
  type: string;
  currentVersion: string | null;
  latestVersion: string | null;
  checkMethod: string;
  status: string;
  lastChecked: string | null;
}

const REFRESH_INTERVAL = 60;

const statusOrder: Record<string, number> = {
  critical: 0,
  outdated: 1,
  up_to_date: 2,
};

function useClock() {
  const [time, setTime] = useState("");
  const dateSettings = useDateSettings();

  useEffect(() => {
    const update = () => {
      setTime(formatAppDate(new Date(), dateSettings, "time"));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [dateSettings]);

  return time;
}

function useCountdown(interval: number, onZero: () => void) {
  const [seconds, setSeconds] = useState(interval);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          onZero();
          return interval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [interval, onZero]);

  return seconds;
}

const nocStatusCards = [
  {
    key: "critical" as const,
    icon: AlertOctagon,
    gradient: "from-red-500/20 to-red-500/5",
    border: "border-red-500/30",
    iconColor: "text-red-500",
    numberColor: "text-red-400",
  },
  {
    key: "outdated" as const,
    icon: AlertTriangle,
    gradient: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/30",
    iconColor: "text-amber-500",
    numberColor: "text-amber-400",
  },
  {
    key: "up_to_date" as const,
    icon: CheckCircle,
    gradient: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/30",
    iconColor: "text-emerald-500",
    numberColor: "text-emerald-400",
  },
  {
    key: "total" as const,
    icon: LayoutGrid,
    gradient: "from-slate-500/20 to-slate-500/5",
    border: "border-slate-500/30",
    iconColor: "text-slate-400",
    numberColor: "text-slate-300",
  },
];

const labelKeys: Record<string, "upToDate" | "outdated" | "critical" | "total"> = {
  up_to_date: "upToDate",
  outdated: "outdated",
  critical: "critical",
  total: "total",
};

const dotColor: Record<string, string> = {
  critical: "bg-red-500 dark:bg-red-400",
  outdated: "bg-amber-500 dark:bg-amber-400",
  up_to_date: "bg-emerald-500 dark:bg-emerald-400",
};

export default function FullscreenOverviewPage() {
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslation();
  const { locale } = useLocale();
  const dateSettings = useDateSettings();
  const clock = useClock();

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("monitoringEnabled", "true");
    params.set("pageSize", "100");

    try {
      const res = await fetch(`/api/items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data);
        setLastRefresh(new Date());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const countdown = useCountdown(REFRESH_INTERVAL, fetchItems);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // fullscreen not supported
    }
  };

  const counts = {
    up_to_date: items.filter((i) => i.status === "up_to_date").length,
    outdated: items.filter((i) => i.status === "outdated").length,
    critical: items.filter((i) => i.status === "critical").length,
    total: items.length,
  };

  const sortedItems = [...items].sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
  );

  const formatLastRefresh = () => {
    if (!lastRefresh) return "—";
    return formatAppDate(lastRefresh, dateSettings, "time");
  };

  return (
    <div
      ref={containerRef}
      className="noc-mode flex h-screen flex-col overflow-hidden bg-background"
    >
      {/* NOC Header */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 bg-card/60 backdrop-blur-sm px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
            <ArrowUpCircle className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-wide hidden sm:inline">
            bum.pt
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
            {t.dashboard.nocMode}
          </span>
        </div>

        <div className="flex items-center gap-3 lg:gap-5">
          <div className="flex items-center gap-2">
            <span className="noc-live-dot relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-500 font-semibold text-[11px] uppercase tracking-wider hidden sm:inline">
              {t.dashboard.live}
            </span>
          </div>

          <div className="font-mono text-base lg:text-lg font-semibold tabular-nums tracking-tight">
            {clock}
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" />
            <span className="tabular-nums">{countdown}{t.dashboard.seconds}</span>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={toggleFullscreen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title={isFullscreen ? t.dashboard.exitFullscreen : t.dashboard.enterFullscreen}
            >
              <Maximize className="h-4 w-4" />
            </button>
            <Link
              href="/dashboard"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title={t.dashboard.exitFullscreen}
            >
              <Minimize2 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-3 lg:p-5 flex flex-col gap-4">
        {/* Compact status cards */}
        <div className="grid grid-cols-4 gap-2 lg:gap-3 shrink-0">
          {nocStatusCards.map((card) => {
            const value = counts[card.key];
            return (
              <div
                key={card.key}
                className={cn(
                  "flex items-center gap-2 lg:gap-3 rounded-lg border px-3 py-2 lg:px-4 lg:py-2.5",
                  `bg-gradient-to-br ${card.gradient} ${card.border}`,
                  card.key === "critical" && value > 0 && "noc-critical-card"
                )}
              >
                <card.icon className={cn("h-4 w-4 lg:h-5 lg:w-5 shrink-0", card.iconColor)} />
                <p className={cn(
                  "text-xl lg:text-2xl font-bold leading-none tabular-nums",
                  card.numberColor
                )}>
                  {value}
                </p>
                <p className="text-[11px] lg:text-xs text-muted-foreground font-medium truncate">
                  {t.dashboard[labelKeys[card.key]]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Items wall */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {t.common.noData}
          </div>
        ) : (
          <div className="flex-1 content-start flex flex-wrap gap-x-4 gap-y-2.5 lg:gap-x-5 lg:gap-y-3 overflow-auto">
            {sortedItems.map((item) => (
              <div
                key={item.id}
                className="noc-item flex items-center gap-2 shrink-0"
              >
                <span
                  className={cn(
                    "noc-dot h-2.5 w-2.5 rounded-full shrink-0",
                    dotColor[item.status] || "bg-slate-400",
                    item.status === "critical" && "noc-dot-critical"
                  )}
                />
                <span className="text-sm lg:text-base font-medium text-foreground/90 whitespace-nowrap">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NOC Footer */}
      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border/40 bg-card/60 backdrop-blur-sm px-4 lg:px-6">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{t.dashboard.lastUpdate}:</span>
          <span className="font-mono tabular-nums font-medium text-foreground/80">
            {formatLastRefresh()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{t.dashboard.nextRefreshIn}</span>
          <span className="font-mono tabular-nums font-medium text-foreground/80">
            {countdown}{t.dashboard.seconds}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono tabular-nums font-medium text-foreground/80">
            {items.length}
          </span>
          <span>{t.dashboard.itemsMonitored}</span>
        </div>
      </footer>
    </div>
  );
}
