"use client";

import { useState, useMemo } from "react";
import {
  RefreshCw,
  CheckCheck,
  Check,
  Package,
  Server,
  Container,
  Globe,
  FileText,
  Shield,
  AlertTriangle,
  Cpu,
  Puzzle,
  BookOpen,
  Database,
  Network,
  Smartphone,
  Monitor,
  AppWindow,
  HardDrive,
  Cog,
  Wifi,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tag, ScoreChip } from "@/components/ui/tag";
import { ItemDetailModal } from "@/components/dashboard/item-detail-modal";
import { useTranslation, useLocale, getHtmlLang, useDateSettings } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";
import { getDisplayStatus, getDisplayStatusOrder, parseCveCount } from "@/lib/item-classification";

interface MonitoredItem {
  id: string;
  name: string;
  userNote?: string | null;
  type: string;
  currentVersion: string | null;
  latestVersion: string | null;
  checkMethod: string;
  status: string;
  lastChecked: string | null;
  lastCheckError?: string | null;
  releaseNotes?: string | null;
  cves?: string | null;
  eolDate?: string | null;
  isLts?: boolean | null;
  tags?: string | string[] | null;
  internalScore?: number | null;
  internalSeverity?: string | null;
  externalScore?: number | null;
  externalSeverity?: string | null;
  securityState?: string | null;
}

interface ItemsTableProps {
  items: MonitoredItem[];
  onRefresh: () => void;
  /** Read-only users (VIEWER) do not get the check / acknowledge buttons. */
  readOnly?: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  software: <Package className="h-4 w-4" />,
  system: <Server className="h-4 w-4" />,
  docker: <Container className="h-4 w-4" />,
  service: <Globe className="h-4 w-4" />,
  firmware: <Cpu className="h-4 w-4" />,
  plugin: <Puzzle className="h-4 w-4" />,
  library: <BookOpen className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
  network: <Network className="h-4 w-4" />,
  mobile_app: <Smartphone className="h-4 w-4" />,
  desktop_app: <Monitor className="h-4 w-4" />,
  web_app: <AppWindow className="h-4 w-4" />,
  os: <HardDrive className="h-4 w-4" />,
  driver: <Cog className="h-4 w-4" />,
  iot: <Wifi className="h-4 w-4" />,
};


function parseTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try { const arr = JSON.parse(tags); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

function isEolPast(eolDate: string | null | undefined): boolean {
  if (!eolDate || eolDate === "false") return false;
  if (eolDate === "true") return true;
  const d = new Date(eolDate);
  return !isNaN(d.getTime()) && d < new Date();
}

type SortKey = "name" | "versions" | "status" | "risk" | "lastChecked";
type SortDir = "asc" | "desc";

function compareItems(a: MonitoredItem, b: MonitoredItem, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case "name":
      cmp = a.name.localeCompare(b.name);
      break;
    case "versions":
      cmp = (a.currentVersion ?? "").localeCompare(b.currentVersion ?? "");
      if (cmp === 0) {
        cmp = (a.latestVersion ?? "").localeCompare(b.latestVersion ?? "");
      }
      break;
    case "status":
      cmp = getDisplayStatusOrder(a) - getDisplayStatusOrder(b);
      if (cmp === 0) {
        const aBpt = typeof a.internalScore === "number" ? a.internalScore : -1;
        const bBpt = typeof b.internalScore === "number" ? b.internalScore : -1;
        cmp = bBpt - aBpt;
      }
      if (cmp === 0) {
        cmp = parseCveCount(b.cves) - parseCveCount(a.cves);
      }
      if (cmp === 0) {
        cmp = a.name.localeCompare(b.name);
      }
      break;
    case "lastChecked": {
      const da = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
      const db = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
      cmp = da - db;
      break;
    }
    case "risk": {
      const aRisk = typeof a.internalScore === "number" ? a.internalScore : (a.externalScore ?? -1);
      const bRisk = typeof b.internalScore === "number" ? b.internalScore : (b.externalScore ?? -1);
      cmp = aRisk - bRisk;
      break;
    }
  }
  return dir === "asc" ? cmp : -cmp;
}

export function ItemsTable({ items, onRefresh, readOnly = false }: ItemsTableProps) {
  const [checkingId, setCheckingId] = useState<string | null>(null);
  // Short-lived per-row feedback after a manual check: a green tick (1.5 s) or a red warning (6 s).
  const [checkResult, setCheckResult] = useState<Record<string, "ok" | "error">>({});
  const [checkError, setCheckError] = useState<Record<string, string>>({});
  const flashResult = (id: string, result: "ok" | "error", message?: string) => {
    setCheckResult((r) => ({ ...r, [id]: result }));
    if (message) setCheckError((e) => ({ ...e, [id]: message }));
    setTimeout(
      () => setCheckResult((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      }),
      result === "ok" ? 1500 : 6000
    );
  };
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const t = useTranslation();
  const { locale } = useLocale();
  const dateSettings = useDateSettings();
  const { toast } = useToast();

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => compareItems(a, b, sortKey, sortDir));
  }, [items, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleCheck = async (id: string) => {
    setCheckingId(id);
    const item = items.find((i) => i.id === id);
    const itemName = item?.name ?? id;
    try {
      const res = await fetch(`/api/items/${id}/check`, { method: "POST" });
      if (res.ok) {
        toast(`${itemName}: ${t.dashboard.checkNow} ✓`, "success");
        flashResult(id, "ok");
        onRefresh();
      } else {
        const data = await res.json();
        toast(`${itemName}: ${data.error || t.dashboard.checkFailed}`, "error");
        flashResult(id, "error", data.error);
      }
    } catch {
      toast(`${itemName}: ${t.common.networkError}`, "error");
      flashResult(id, "error", t.common.networkError);
    } finally {
      setCheckingId(null);
    }
  };

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      const res = await fetch(`/api/items/${id}/acknowledge`, { method: "POST" });
      if (res.ok) {
        toast(t.dashboard.acknowledge, "success");
        onRefresh();
      } else {
        const data = await res.json();
        toast(data.error || t.common.error, "error");
      }
    } catch {
      toast(t.common.networkError, "error");
    } finally {
      setAcknowledgingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t.dashboard.neverChecked;
    return formatAppDate(dateStr, dateSettings);
  };

  const statusLabel = (status: string) => {
    if (status === "critical") return t.items.statuses.critical;
    if (status === "end_of_life") return t.itemDetail.eolReached;
    if (status === "check_failed") return t.dashboard.checkFailed;
    return t.items.statuses[status as keyof typeof t.items.statuses] || status;
  };

  const severityLabel = (severity: string | null | undefined) => {
    if (!severity) return t.dashboard.notAvailable;
    if (severity === "critical") return t.itemDetail.bptCritical;
    if (severity === "high") return t.itemDetail.bptHigh;
    if (severity === "medium") return t.itemDetail.bptMedium;
    if (severity === "low") return t.itemDetail.bptLow;
    return severity;
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mb-3 opacity-50" />
        <p>{t.common.noData}</p>
      </div>
    );
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const ThSortable = ({ col, label, className: cls, title }: { col: SortKey; label: string; className?: string; title?: string }) => (
    <th
      className={cn("pb-3 pr-4 font-medium select-none", cls)}
      aria-sort={sortKey === col ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        onClick={() => toggleSort(col)}
        title={title}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <SortIcon col={col} />
      </button>
    </th>
  );

  return (
    <div>
      {/* Phones: one card per item instead of a table that needs horizontal scrolling. */}
      <ul className="divide-y xl:hidden print:hidden">
        {sortedItems.map((item) => {
          const cveCount = parseCveCount(item.cves);
          const displayStatus = getDisplayStatus(item);
          const outdated = item.latestVersion && item.currentVersion && item.currentVersion !== item.latestVersion;
          return (
            <li key={item.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setDetailItemId(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailItemId(item.id);
                  }
                }}
                className="flex flex-col gap-2 px-4 py-3 active:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Names wrap instead of being cut: badges go to the next line when needed. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="shrink-0 text-muted-foreground">
                      {typeIcons[item.type] || <Package className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 break-words font-medium">{item.name}</span>
                    {typeof item.internalScore === "number" && (
                      <ScoreChip
                        label={t.itemDetail.bpt}
                        value={Math.round(item.internalScore)}
                        severity={item.internalSeverity}
                        title={t.itemDetail.bptTooltip}
                      />
                    )}
                    {cveCount > 0 && (
                      <Tag tone="danger">
                        <Shield aria-hidden="true" />
                        {cveCount} CVE
                      </Tag>
                    )}
                  </div>
                  <StatusBadge
                    status={displayStatus}
                    label={statusLabel(displayStatus)}
                    className="shrink-0"
                    title={item.lastCheckError ?? undefined}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm">
                    {outdated ? (
                      <>
                        <code>{item.currentVersion}</code>
                        <span className="text-muted-foreground"> → </span>
                        <code>{item.latestVersion}</code>
                      </>
                    ) : (
                      <code>{item.currentVersion || item.latestVersion || "—"}</code>
                    )}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {item.lastCheckError && <AlertTriangle className="h-3.5 w-3.5 text-st-warn-dot" aria-label={item.lastCheckError} />}
                    {formatDate(item.lastChecked)}
                  </span>
                </div>
                {!readOnly && (
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {item.checkMethod !== "manual" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCheck(item.id)}
                        disabled={checkingId === item.id}
                        aria-busy={checkingId === item.id || undefined}
                      >
                        <RefreshCw className={cn(checkingId === item.id && "animate-spin")} />
                        {t.dashboard.checkNow}
                      </Button>
                    )}
                    {item.status !== "up_to_date" && outdated && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAcknowledge(item.id)}
                        loading={acknowledgingId === item.id}
                      >
                        <CheckCheck />
                        {t.dashboard.acknowledge}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto xl:block print:block">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <ThSortable col="name" label={t.items.name} className="pl-6" />
            <ThSortable col="versions" label={t.dashboard.version} />
            <ThSortable col="status" label={t.items.status} />
            <ThSortable col="risk" label={`${t.dashboard.bptShort}/${t.dashboard.extShort}`} title={t.dashboard.riskColumnHint} className="hidden md:table-cell" />
            <ThSortable col="lastChecked" label={t.items.lastChecked} className="hidden md:table-cell" />
            <th className="pb-3 font-medium w-10 print-hide-action"></th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const cveCount = parseCveCount(item.cves);
            const displayStatus = getDisplayStatus(item);
            const eolPast = isEolPast(item.eolDate);
            const itemTags = parseTags(item.tags);
            return (
            <tr
              key={item.id}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => setDetailItemId(item.id)}
            >
              <td className="py-3 pr-4 pl-6">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-muted-foreground"
                      title={t.items.types[item.type as keyof typeof t.items.types] || item.type}
                    >
                      {typeIcons[item.type] || <Package className="h-4 w-4" />}
                    </span>
                    <span className="font-medium">{item.name}</span>
                    {typeof item.internalScore === "number" && (
                      <ScoreChip
                        label={t.itemDetail.bpt}
                        value={Math.round(item.internalScore)}
                        severity={item.internalSeverity}
                        compactLabel
                        title={t.itemDetail.bptTooltip}
                      />
                    )}
                    {cveCount > 0 && (
                      <Tag tone="danger">
                        <Shield aria-hidden="true" />
                        {cveCount} CVE
                      </Tag>
                    )}
                    {eolPast && (
                      <Tag tone="warning">
                        <AlertTriangle aria-hidden="true" />
                        EOL
                      </Tag>
                    )}
                    {item.isLts && (
                      <Tag tone="info">LTS</Tag>
                    )}
                    {itemTags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                    {item.releaseNotes && (
                      <span title={t.itemDetail.releaseNotes}>
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    )}
                  </div>
                  {item.userNote && (
                    <p className="text-[11px] text-muted-foreground ml-6 truncate max-w-[36rem]">
                      {item.userNote}
                    </p>
                  )}
                </div>
              </td>
              <td className="py-3 pr-4">
                {item.latestVersion && item.currentVersion && item.currentVersion !== item.latestVersion ? (
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <code>{item.currentVersion}</code>
                    <span className="text-muted-foreground">→</span>
                    <code>{item.latestVersion}</code>
                  </span>
                ) : (
                  <code className="text-sm">{item.currentVersion || item.latestVersion || "—"}</code>
                )}
              </td>
              <td className="py-3 pr-4">
                <StatusBadge
                  status={displayStatus}
                  label={statusLabel(displayStatus)}
                  title={item.lastCheckError ? `${t.dashboard.checkFailed}: ${item.lastCheckError}` : undefined}
                />
              </td>
              <td className="py-3 pr-4 hidden md:table-cell">
                <div className="text-xs leading-tight">
                  <p className="font-medium">
                    BPT {typeof item.internalScore === "number" ? Math.round(item.internalScore) : "—"}
                    <span className="text-muted-foreground"> · {severityLabel(item.internalSeverity)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    EXT {typeof item.externalScore === "number" ? Math.round(item.externalScore) : "—"}
                    <span> · {severityLabel(item.externalSeverity)}</span>
                  </p>
                </div>
              </td>
              <td className="py-3 pr-4 hidden md:table-cell">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  {item.lastCheckError && (
                    <span
                      title={`${t.logs.actions["item.check_failed"]}: ${item.lastCheckError}`}
                      aria-label={`${t.logs.actions["item.check_failed"]}: ${item.lastCheckError}`}
                      className="inline-flex text-st-warn-dot"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {formatDate(item.lastChecked)}
                </span>
              </td>
              <td className="py-3 print-hide-action">
                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  {!readOnly && item.checkMethod !== "manual" && (
                    checkResult[item.id] === "ok" ? (
                      <IconButton icon={Check} label={t.dashboard.checkNow} className="text-st-ok-dot" onClick={() => handleCheck(item.id)} />
                    ) : checkResult[item.id] === "error" ? (
                      <IconButton
                        icon={AlertTriangle}
                        label={`${t.dashboard.checkFailed}${checkError[item.id] ? `: ${checkError[item.id]}` : ""}`}
                        className="text-destructive"
                        onClick={() => handleCheck(item.id)}
                      />
                    ) : (
                      <IconButton
                        icon={RefreshCw}
                        label={t.dashboard.checkNow}
                        onClick={() => handleCheck(item.id)}
                        disabled={checkingId === item.id}
                        aria-busy={checkingId === item.id || undefined}
                        iconClassName={cn(checkingId === item.id && "animate-spin")}
                        className={cn(checkingId === item.id && "disabled:opacity-100")}
                      />
                    )
                  )}
                  {!readOnly && item.status !== "up_to_date" && item.latestVersion && item.currentVersion !== item.latestVersion && (
                    <IconButton
                      icon={CheckCheck}
                      label={t.dashboard.acknowledge}
                      tone="success"
                      onClick={() => handleAcknowledge(item.id)}
                      loading={acknowledgingId === item.id}
                    />
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <ItemDetailModal
        open={!!detailItemId}
        onClose={() => setDetailItemId(null)}
        itemId={detailItemId}
      />
    </div>
  );
}
