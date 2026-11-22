"use client";

import { CheckCircle, AlertTriangle, LayoutGrid, XCircle } from "lucide-react";
import { useTranslation } from "@/i18n/config";
import { cn } from "@/utils/cn";

interface StatusCounts {
  up_to_date: number;
  outdated: number;
  at_risk: number;
  check_failed: number;
  total: number;
  severityBreakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface StatusOverviewProps {
  /** Counts over all monitored items, never over the filtered list. */
  counts: StatusCounts;
  onFilterStatus: (status: string | null) => void;
  activeStatus: string | null;
}

type CardKey = "up_to_date" | "outdated" | "check_failed" | "total";

const colorMap: Record<string, { icon: string; bg: string; active: string }> = {
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    active: "bg-emerald-50 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
    active: "bg-amber-50 ring-2 ring-amber-500/30 dark:bg-amber-950/30",
  },
  red: {
    icon: "text-red-600 dark:text-red-400",
    bg: "hover:bg-red-50 dark:hover:bg-red-950/30",
    active: "bg-red-50 ring-2 ring-red-500/30 dark:bg-red-950/30",
  },
  slate: {
    icon: "text-slate-600 dark:text-slate-400",
    bg: "hover:bg-muted/50 dark:hover:bg-slate-800/30",
    active: "bg-muted/60 ring-2 ring-slate-400/20 dark:bg-slate-800/30",
  },
};

export function StatusOverview({ counts, onFilterStatus, activeStatus }: StatusOverviewProps) {
  const t = useTranslation();
  const severity = counts.severityBreakdown ?? { critical: 0, high: 0, medium: 0, low: 0 };
  const severityTotal = severity.critical + severity.high + severity.medium + severity.low;
  const deg = (n: number) => (severityTotal > 0 ? (n / severityTotal) * 360 : 0);
  const c = deg(severity.critical);
  const h = c + deg(severity.high);
  const m = h + deg(severity.medium);
  const donutStyle =
    severityTotal > 0
      ? {
          background: `conic-gradient(#ef4444 0deg ${c}deg, #f59e0b ${c}deg ${h}deg, #3b82f6 ${h}deg ${m}deg, #10b981 ${m}deg 360deg)`,
        }
      : { background: "conic-gradient(#cbd5e1 0deg 360deg)" };

  const cards: { key: CardKey; icon: typeof CheckCircle; color: string; label: string; filter: string | null }[] = [
    { key: "up_to_date", icon: CheckCircle, color: "emerald", label: t.dashboard.upToDate, filter: "up_to_date" },
    { key: "outdated", icon: AlertTriangle, color: "amber", label: t.dashboard.outdated, filter: "outdated" },
    ...(counts.check_failed > 0
      ? [{ key: "check_failed" as const, icon: XCircle, color: "amber", label: t.dashboard.checkFailed, filter: "check_failed" }]
      : []),
    { key: "total", icon: LayoutGrid, color: "slate", label: t.dashboard.total, filter: null },
  ];

  const atRiskActive = activeStatus === "at_risk";

  return (
    <div className={cn("grid grid-cols-2 gap-3", cards.length > 3 ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
      <button
        type="button"
        aria-pressed={atRiskActive}
        aria-label={`${counts.at_risk} ${t.dashboard.atRisk}`}
        title={t.dashboard.atRiskHint}
        className={cn(
          "col-span-2 flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all lg:col-span-1",
          colorMap.red.bg,
          atRiskActive ? colorMap.red.active : "hover:shadow-sm"
        )}
        onClick={() => onFilterStatus(atRiskActive ? null : "at_risk")}
      >
        <div className="relative h-12 w-12 shrink-0 rounded-full" style={donutStyle} aria-hidden="true">
          <div className="absolute inset-[6px] rounded-full bg-card" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold leading-none tracking-tight">{counts.at_risk}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.dashboard.atRisk}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground" title={t.itemDetail.bptTooltip}>
            <span className="font-medium">{t.itemDetail.bpt}:</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {severity.critical} {t.itemDetail.bptCritical.toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {severity.high} {t.itemDetail.bptHigh.toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {severity.medium} {t.itemDetail.bptMedium.toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {severity.low} {t.itemDetail.bptLow.toLowerCase()}
            </span>
          </div>
        </div>
      </button>

      {cards.map((card) => {
        const isActive = activeStatus === card.filter;
        const colors = colorMap[card.color];
        const value = counts[card.key];
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={isActive}
            aria-label={`${value} ${card.label}`}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all",
              colors.bg,
              isActive ? colors.active : "hover:shadow-sm"
            )}
            onClick={() => onFilterStatus(isActive ? null : card.filter)}
          >
            <card.icon className={cn("h-5 w-5 shrink-0", colors.icon)} />
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
