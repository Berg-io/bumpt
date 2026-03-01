"use client";

import { CheckCircle, AlertTriangle, AlertOctagon, LayoutGrid } from "lucide-react";
import { useTranslation } from "@/i18n/config";
import { cn } from "@/utils/cn";

interface StatusCounts {
  up_to_date: number;
  outdated: number;
  critical: number;
  total: number;
  totalVulnerabilities?: number;
  avgInternalScore?: number | null;
  avgExternalScore?: number | null;
  severityBreakdown?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface StatusOverviewProps {
  counts: StatusCounts;
  onFilterStatus: (status: string | null) => void;
  activeStatus: string | null;
}

const cards = [
  {
    key: "critical",
    icon: AlertOctagon,
    color: "red",
    filterValue: "critical" as string | null,
  },
  {
    key: "up_to_date",
    icon: CheckCircle,
    color: "emerald",
    filterValue: "up_to_date" as string | null,
  },
  {
    key: "outdated",
    icon: AlertTriangle,
    color: "amber",
    filterValue: "outdated" as string | null,
  },
  {
    key: "total",
    icon: LayoutGrid,
    color: "slate",
    filterValue: null as string | null,
  },
];

const colorMap: Record<string, { icon: string; bg: string; active: string; dot: string }> = {
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    active: "bg-emerald-50 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30",
    dot: "bg-emerald-500",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    bg: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
    active: "bg-amber-50 ring-2 ring-amber-500/30 dark:bg-amber-950/30",
    dot: "bg-amber-500",
  },
  red: {
    icon: "text-red-600 dark:text-red-400",
    bg: "hover:bg-red-50 dark:hover:bg-red-950/30",
    active: "bg-red-50 ring-2 ring-red-500/30 dark:bg-red-950/30",
    dot: "bg-red-500",
  },
  slate: {
    icon: "text-slate-600 dark:text-slate-400",
    bg: "hover:bg-muted/50 dark:hover:bg-slate-800/30",
    active: "bg-muted/60 ring-2 ring-slate-400/20 dark:bg-slate-800/30",
    dot: "bg-slate-500",
  },
};

const labelKeys: Record<string, "upToDate" | "outdated" | "critical" | "total"> = {
  up_to_date: "upToDate",
  outdated: "outdated",
  critical: "critical",
  total: "total",
};

const countKeys: Record<string, keyof StatusCounts> = {
  up_to_date: "up_to_date",
  outdated: "outdated",
  critical: "critical",
  total: "total",
};

export function StatusOverview({ counts, onFilterStatus, activeStatus }: StatusOverviewProps) {
  const t = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const isActive = activeStatus === card.filterValue;
        const colors = colorMap[card.color];
        const rawValue = counts[countKeys[card.key]];
        const value = typeof rawValue === "number" ? rawValue : 0;
        const severity = counts.severityBreakdown ?? { critical: 0, high: 0, medium: 0, low: 0 };
        const severityTotal = severity.critical + severity.high + severity.medium + severity.low;
        const segmentDegrees = {
          critical: severityTotal > 0 ? (severity.critical / severityTotal) * 360 : 0,
          high: severityTotal > 0 ? (severity.high / severityTotal) * 360 : 0,
          medium: severityTotal > 0 ? (severity.medium / severityTotal) * 360 : 0,
          low: severityTotal > 0 ? (severity.low / severityTotal) * 360 : 0,
        };
        const donutStyle =
          severityTotal > 0
            ? {
                background: `conic-gradient(
                  #ef4444 0deg ${segmentDegrees.critical}deg,
                  #f59e0b ${segmentDegrees.critical}deg ${segmentDegrees.critical + segmentDegrees.high}deg,
                  #3b82f6 ${segmentDegrees.critical + segmentDegrees.high}deg ${
                    segmentDegrees.critical + segmentDegrees.high + segmentDegrees.medium
                  }deg,
                  #10b981 ${segmentDegrees.critical + segmentDegrees.high + segmentDegrees.medium}deg 360deg
                )`,
              }
            : { background: "conic-gradient(#cbd5e1 0deg 360deg)" };

        return (
          <button
            key={card.key}
            type="button"
            className={cn(
              "group relative flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all",
              colors.bg,
              isActive ? colors.active : "hover:shadow-sm"
            )}
            onClick={() => onFilterStatus(isActive ? null : card.filterValue)}
          >
            {card.key === "critical" ? (
              <div className="flex w-full items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 rounded-full" style={donutStyle}>
                  <div className="absolute inset-[6px] rounded-full bg-card" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
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
              </div>
            ) : (
              <>
                <card.icon className={cn("h-5 w-5 shrink-0", colors.icon)} />
                <div className="min-w-0">
                  <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.dashboard[labelKeys[card.key]]}</p>
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
