"use client";

import { useState, useMemo } from "react";
import {
  RefreshCw,
  CheckCircle2,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemDetailModal } from "@/components/dashboard/item-detail-modal";
import { useTranslation, useLocale, getHtmlLang, useDateSettings } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import { useToast } from "@/components/ui/toast";
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
  releaseNotes?: string | null;
  cves?: string | null;
  eolDate?: string | null;
  isLts?: boolean | null;
  tags?: string | string[] | null;
}

interface ItemsTableProps {
  items: MonitoredItem[];
  onRefresh: () => void;
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

const statusVariants: Record<string, "success" | "warning" | "critical"> = {
  up_to_date: "success",
  outdated: "warning",
  critical: "critical",
};

function parseCveCount(cvesJson: string | null | undefined): number {
  if (!cvesJson) return 0;
  try { const arr = JSON.parse(cvesJson); return Array.isArray(arr) ? arr.length : 0; } catch { return 0; }
}

function parseTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try { const arr = JSON.parse(tags); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

function isEolPast(eolDate: string | null | undefined): boolean {
  if (!eolDate || eolDate === "false") return false;
  if (eolDate === "true") return true;
  const d = new Date(eolDate);
  return !isNaN(d.getTime()) && d < new Date();
}

type SortKey = "name" | "type" | "currentVersion" | "latestVersion" | "status" | "lastChecked";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<string, number> = { critical: 0, outdated: 1, up_to_date: 2 };

function compareItems(a: MonitoredItem, b: MonitoredItem, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  switch (key) {
    case "name":
      cmp = a.name.localeCompare(b.name);
      break;
    case "type":
      cmp = a.type.localeCompare(b.type);
      break;
    case "currentVersion":
      cmp = (a.currentVersion ?? "").localeCompare(b.currentVersion ?? "");
      break;
    case "latestVersion":
      cmp = (a.latestVersion ?? "").localeCompare(b.latestVersion ?? "");
      break;
    case "status":
      cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      break;
    case "lastChecked": {
      const da = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
      const db = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
      cmp = da - db;
      break;
    }
  }
  return dir === "asc" ? cmp : -cmp;
}

export function ItemsTable({ items, onRefresh }: ItemsTableProps) {
  const [checkingId, setCheckingId] = useState<string | null>(null);
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
        onRefresh();
      } else {
        const data = await res.json();
        toast(`${itemName}: ${data.error || "Check failed"}`, "error");
      }
    } catch {
      toast(`${itemName}: Netzwerkfehler`, "error");
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
        toast(data.error || "Error", "error");
      }
    } catch {
      toast("Netzwerkfehler", "error");
    } finally {
      setAcknowledgingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t.dashboard.neverChecked;
    return formatAppDate(dateStr, dateSettings);
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

  const ThSortable = ({ col, label, className: cls }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={cn("pb-3 pr-4 font-medium cursor-pointer select-none hover:text-foreground transition-colors", cls)}
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <ThSortable col="name" label={t.items.name} />
            <ThSortable col="type" label={t.items.type} className="hidden sm:table-cell" />
            <ThSortable col="currentVersion" label={t.items.currentVersion} />
            <ThSortable col="latestVersion" label={t.items.latestVersion} className="hidden md:table-cell" />
            <ThSortable col="status" label={t.items.status} />
            <ThSortable col="lastChecked" label={t.items.lastChecked} className="hidden lg:table-cell" />
            <th className="pb-3 font-medium w-10"></th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const cveCount = parseCveCount(item.cves);
            const eolPast = isEolPast(item.eolDate);
            const itemTags = parseTags(item.tags);
            return (
            <tr
              key={item.id}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => setDetailItemId(item.id)}
            >
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {typeIcons[item.type] || <Package className="h-4 w-4" />}
                  </span>
                  <span className="font-medium">{item.name}</span>
                  {item.releaseNotes && (
                    <span title={t.itemDetail.releaseNotes}>
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  )}
                  {cveCount > 0 && (
                    <Badge variant="critical" className="text-[10px] px-1.5 py-0">
                      <Shield className="h-3 w-3 mr-0.5" />
                      {cveCount} CVE
                    </Badge>
                  )}
                  {eolPast && (
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                      <AlertTriangle className="h-3 w-3 mr-0.5" />
                      EOL
                    </Badge>
                  )}
                  {item.isLts && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0">LTS</Badge>
                  )}
                  {itemTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium text-white"
                      style={{ backgroundColor: tagColor(tag) }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-3 pr-4 hidden sm:table-cell">
                <span className="text-sm text-muted-foreground">
                  {t.items.types[item.type as keyof typeof t.items.types] || item.type}
                </span>
              </td>
              <td className="py-3 pr-4">
                <code className="text-sm">{item.currentVersion || "—"}</code>
              </td>
              <td className="py-3 pr-4 hidden md:table-cell">
                <code className="text-sm">{item.latestVersion || "—"}</code>
              </td>
              <td className="py-3 pr-4">
                <Badge variant={statusVariants[item.status] || "default"}>
                  {t.items.statuses[item.status as keyof typeof t.items.statuses] || item.status}
                </Badge>
              </td>
              <td className="py-3 pr-4 hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {formatDate(item.lastChecked)}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {item.checkMethod !== "manual" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCheck(item.id)}
                      disabled={checkingId === item.id}
                      title={t.dashboard.checkNow}
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          checkingId === item.id && "animate-spin"
                        )}
                      />
                    </Button>
                  )}
                  {item.status !== "up_to_date" && item.latestVersion && item.currentVersion !== item.latestVersion && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleAcknowledge(item.id)}
                      disabled={acknowledgingId === item.id}
                      title={t.dashboard.acknowledge}
                    >
                      <CheckCircle2
                        className={cn(
                          "h-4 w-4 text-green-600 dark:text-green-400",
                          acknowledgingId === item.id && "animate-pulse"
                        )}
                      />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      <ItemDetailModal
        open={!!detailItemId}
        onClose={() => setDetailItemId(null)}
        itemId={detailItemId}
      />
    </div>
  );
}
