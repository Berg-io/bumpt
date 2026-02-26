"use client";

import { CheckCircle, AlertTriangle, AlertOctagon, LayoutGrid } from "lucide-react";
import { useTranslation } from "@/i18n/config";
import { cn } from "@/utils/cn";

interface StatusCounts {
  up_to_date: number;
  outdated: number;
  critical: number;
  total: number;
}

interface StatusOverviewProps {
  counts: StatusCounts;
  onFilterStatus: (status: string | null) => void;
  activeStatus: string | null;
}

const cards = [
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
    key: "critical",
    icon: AlertOctagon,
    color: "red",
    filterValue: "critical" as string | null,
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
        const value = counts[countKeys[card.key]];

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
            <card.icon className={cn("h-5 w-5 shrink-0", colors.icon)} />
            <div className="min-w-0">
              <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.dashboard[labelKeys[card.key]]}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
