"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Plus, Pencil, Trash2, Package, Server, Container, Globe, Search,
  Download, Upload, Flame,
  Cpu, Puzzle, BookOpen, Database, Network, Smartphone, Monitor, AppWindow, HardDrive, Cog, Wifi, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ItemForm } from "@/components/admin/item-form";
import { ItemDetailModal } from "@/components/dashboard/item-detail-modal";
import { useTranslation, useLocale, useDateSettings } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import { useToast } from "@/components/ui/toast";
import { exportToCsv, parseCsvFile } from "@/utils/csv";

interface MonitoredItem {
  id: string;
  name: string;
  userNote?: string | null;
  type: string;
  currentVersion: string | null;
  latestVersion: string | null;
  checkMethod: string;
  checkConfig: string | null;
  sourceId: string | null;
  sourceParams: string | null;
  source?: { id: string; name: string; type: string } | null;
  status: string;
  monitoringEnabled: boolean;
  lastChecked: string | null;
  releaseNotes?: string | null;
  cves?: string | null;
  eolDate?: string | null;
  isLts?: boolean | null;
  assetCriticality?: number | null;
  environment?: string | null;
  networkExposure?: string | null;
  hostsSensitiveData?: boolean | null;
  hasPrivilegedAccess?: boolean | null;
  hasCompensatingControls?: boolean | null;
  externalScore?: number | null;
  externalSeverity?: string | null;
  internalScore?: number | null;
  internalSeverity?: string | null;
  scoreConfidence?: number | null;
  tags?: string | string[] | null;
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

const CSV_HEADER_MAP: Record<string, string> = {
  Name: "name",
  name: "name",
  Typ: "type",
  Type: "type",
  type: "type",
  "Aktuelle Version": "currentVersion",
  "Current Version": "currentVersion",
  currentVersion: "currentVersion",
  "Neueste Version": "latestVersion",
  "Latest Version": "latestVersion",
  latestVersion: "latestVersion",
  Status: "status",
  status: "status",
  "Prüfmethode": "checkMethod",
  "Check Method": "checkMethod",
  checkMethod: "checkMethod",
  "Prüfkonfiguration": "checkConfig",
  "Check Configuration": "checkConfig",
  checkConfig: "checkConfig",
};

const ALLOWED_PAGE_SIZES = new Set([25, 50, 100, 500]);

function parseDefaultPageSize(value: unknown): number | "all" | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.toLowerCase() === "all") return "all";
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || !ALLOWED_PAGE_SIZES.has(parsed)) return null;
  return parsed;
}

export default function AdminItemsPage() {
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterMonitored, setFilterMonitored] = useState<"" | "true" | "false">("");
  const [sortKey, setSortKey] = useState<"name" | "type" | "source" | "providerPrefix" | "lastChecked">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(25);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<MonitoredItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation();
  const { locale } = useLocale();
  const dateSettings = useDateSettings();
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/items?pageSize=all");
      if (res.ok) {
        const data = await res.json();
        setItems(data.data);
      }
    } catch {
      toast("Fehler beim Laden", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) return;
        const data = await res.json();
        const next = parseDefaultPageSize(data?.settings?.dashboard_default_page_size);
        if (!cancelled && next !== null) {
          setPageSize(next);
        }
      } catch {
        // keep fallback default
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (data: {
    id?: string;
    name: string;
    userNote?: string | null;
    type: string;
    currentVersion: string;
    latestVersion: string;
    checkMethod: string;
    checkConfig: string;
    sourceId: string;
    sourceParams: string;
    status: string;
    assetCriticality?: number | null;
    environment?: string | null;
    networkExposure?: string | null;
    hostsSensitiveData?: boolean | null;
    hasPrivilegedAccess?: boolean | null;
    hasCompensatingControls?: boolean | null;
  }) => {
    try {
      const isEdit = !!editItem;
      const url = isEdit ? `/api/items/${editItem!.id}` : "/api/items";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast(isEdit ? "Element aktualisiert" : "Element erstellt", "success");
        fetchItems();
      } else {
        const err = await res.json();
        if (err.error === "item_limit_reached") {
          toast(
            t.license.itemLimitDescription.replace("{max}", String(err.max)),
            "error"
          );
        } else {
          toast(err.error || "Error", "error");
        }
      }
    } catch {
      toast("Netzwerkfehler", "error");
    }
    setEditItem(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/items/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Item deleted", "success");
        fetchItems();
      } else {
        const err = await res.json();
        toast(err.error || "Error", "error");
      }
    } catch {
      toast("Netzwerkfehler", "error");
    }
    setDeleteId(null);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await fetch("/api/items", { method: "DELETE" });
      if (res.ok) {
        toast(t.items.deleteAllSuccess, "success");
        setShowDeleteAllConfirm(false);
        setItems([]);
        fetchItems();
      } else {
        toast(t.items.deleteAllError, "error");
      }
    } catch {
      toast(t.items.deleteAllError, "error");
    } finally {
      setDeletingAll(false);
    }
  };

  const openEdit = (item: MonitoredItem) => {
    setEditItem(item);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const handleToggleMonitoring = async (item: MonitoredItem) => {
    const newValue = !item.monitoringEnabled;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, monitoringEnabled: newValue } : i))
    );
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitoringEnabled: newValue }),
      });
      if (!res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, monitoringEnabled: !newValue } : i))
        );
        toast(t.common.error, "error");
      }
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, monitoringEnabled: !newValue } : i))
      );
      toast(t.common.error, "error");
    }
  };

  const handleExportCsv = () => {
    const columns = [
      { key: "name", label: t.items.name },
      { key: "type", label: t.items.type },
      { key: "currentVersion", label: t.items.currentVersion },
      { key: "latestVersion", label: t.items.latestVersion },
      { key: "status", label: t.items.status },
      { key: "checkMethod", label: t.items.checkMethod },
      { key: "checkConfig", label: t.items.checkConfig },
      { key: "lastChecked", label: t.items.lastChecked },
    ];
    const date = new Date().toISOString().slice(0, 10);
    exportToCsv(items, columns, `items-export-${date}.csv`);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setImporting(true);
    try {
      const rows = await parseCsvFile(file);
      if (rows.length === 0) {
        toast(t.items.importInvalidFile, "error");
        return;
      }

      const normalizedRows = rows.map((row) => {
        const normalized: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          const mapped = CSV_HEADER_MAP[key];
          if (mapped) normalized[mapped] = value;
        }
        return normalized;
      });

      const validRows = normalizedRows.filter((r) => r.name && r.type);
      if (validRows.length === 0) {
        toast(t.items.importMissingColumns, "error");
        return;
      }

      const VALID_SOURCE_TYPES = new Set([
        "dockerhub", "github", "gitlab", "appstore", "playstore", "msstore",
        "json_api", "html", "chrome", "endoflife", "npm", "pypi",
        "repology", "homebrew", "wordpress", "winget", "csv_data",
        "maven", "nuget", "packagist", "crates", "rubygems", "goproxy",
        "helm", "snap", "flathub", "terraform", "chocolatey",
        "pub", "hex", "conda", "cocoapods", "cpan", "fdroid",
        "firefox_addon", "vscode", "jetbrains", "openvsx",
        "aur", "ansible", "quay", "bitbucket",
      ]);

      const SOURCE_DISPLAY_NAMES: Record<string, string> = {
        dockerhub: "Docker Hub", github: "GitHub Releases", gitlab: "GitLab Releases",
        appstore: "Apple App Store", playstore: "Google Play Store", msstore: "Microsoft Store",
        json_api: "JSON API", html: "HTML Scraper", chrome: "Chrome Versions",
        endoflife: "endoflife.date", npm: "npm Registry", pypi: "PyPI",
        repology: "Repology", homebrew: "Homebrew", wordpress: "WordPress Plugins",
        winget: "WinGet", csv_data: "CSV Data", maven: "Maven Central",
        nuget: "NuGet", packagist: "Packagist", crates: "crates.io",
        rubygems: "RubyGems", goproxy: "Go Proxy", helm: "Helm Charts",
        snap: "Snap Store", flathub: "Flathub", terraform: "Terraform Registry",
        chocolatey: "Chocolatey",
        pub: "Pub.dev", hex: "Hex.pm", conda: "Anaconda",
        cocoapods: "CocoaPods", cpan: "MetaCPAN", fdroid: "F-Droid",
        firefox_addon: "Firefox Add-ons", vscode: "VS Code Marketplace",
        jetbrains: "JetBrains Marketplace", openvsx: "Open VSX",
        aur: "AUR", ansible: "Ansible Galaxy",
        quay: "Quay.io", bitbucket: "Bitbucket",
      };

      const sourcesRes = await fetch("/api/sources");
      const sourcesData = sourcesRes.ok ? await sourcesRes.json() : { data: [] };
      const sourcesByType = new Map<string, string>();
      for (const s of sourcesData.data || []) {
        if (!sourcesByType.has(s.type)) sourcesByType.set(s.type, s.id);
      }

      const getOrCreateSource = async (sourceType: string): Promise<string | null> => {
        if (!VALID_SOURCE_TYPES.has(sourceType)) return null;
        if (sourcesByType.has(sourceType)) return sourcesByType.get(sourceType)!;
        const res = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: SOURCE_DISPLAY_NAMES[sourceType] || sourceType,
            type: sourceType,
            config: "{}",
          }),
        });
        if (res.ok) {
          const created = await res.json();
          sourcesByType.set(sourceType, created.id);
          return created.id;
        }
        return null;
      };

      let successCount = 0;
      let limitHit = false;
      for (const row of validRows) {
        let sourceId: string | null = null;
        let sourceParams: string | null = null;
        let checkConfig = row.checkConfig || "";
        let checkMethod = row.checkMethod || "manual";

        if (checkConfig) {
          try {
            const config = JSON.parse(checkConfig);
            if (config.source && VALID_SOURCE_TYPES.has(config.source)) {
              const resolvedId = await getOrCreateSource(config.source);
              if (resolvedId) {
                sourceId = resolvedId;
                const { source: _, ...params } = config;
                sourceParams = Object.keys(params).length > 0 ? JSON.stringify(params) : null;
                checkMethod = "api";
                checkConfig = "";
              }
            }
          } catch { /* not valid JSON, keep as legacy checkConfig */ }
        }

        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            type: row.type || "software",
            currentVersion: row.currentVersion || "",
            latestVersion: row.latestVersion || "",
            checkMethod,
            checkConfig,
            sourceId,
            sourceParams,
            status: row.status || "up_to_date",
          }),
        });
        if (res.ok) {
          successCount++;
        } else {
          const err = await res.json().catch(() => null);
          if (err?.error === "item_limit_reached") { limitHit = true; break; }
        }
      }

      if (limitHit) {
        toast(
          `${successCount}/${validRows.length} imported. ${t.license.itemLimitTitle}`,
          "error"
        );
      } else {
        toast(`${successCount}/${validRows.length} ${t.items.importSuccess}`, "success");
      }
      fetchItems();
    } catch {
      toast(t.items.importError, "error");
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return formatAppDate(dateStr, dateSettings);
  };

  const parseTags = (tags: string | string[] | null | undefined): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const visibleItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (filterType && item.type !== filterType) return false;
      if (filterSource) {
        if (filterSource === "manual") {
          if (item.source) return false;
        } else if (item.source?.id !== filterSource) {
          return false;
        }
      }
      if (filterMonitored && String(item.monitoringEnabled) !== filterMonitored) return false;
      if (search) {
        const q = search.toLowerCase();
        const sourceName = item.source?.name?.toLowerCase() ?? "";
        const itemId = item.id.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !sourceName.includes(q) && !itemId.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "type":
          cmp = (a.type ?? "").localeCompare(b.type ?? "");
          break;
        case "source":
          cmp = (a.source?.name ?? "").localeCompare(b.source?.name ?? "");
          break;
        case "providerPrefix":
          cmp = (a.source?.type ?? a.checkMethod ?? "").localeCompare(b.source?.type ?? b.checkMethod ?? "");
          break;
        case "lastChecked": {
          const da = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
          const db = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
          cmp = da - db;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [items, filterType, filterSource, filterMonitored, search, sortKey, sortDir]);

  const sourceOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.source?.id && item.source.name) map.set(item.source.id, item.source.name);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const pagedItems = useMemo(() => {
    if (pageSize === "all") return visibleItems;
    const start = (page - 1) * pageSize;
    return visibleItems.slice(start, start + pageSize);
  }, [visibleItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, filterType, filterSource, filterMonitored, sortKey, sortDir, pageSize, visibleItems.length]);

  const toggleSort = (key: "name" | "type" | "source" | "providerPrefix" | "lastChecked") => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: "name" | "type" | "source" | "providerPrefix" | "lastChecked" }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <>
      <Header
        title={t.items.title}
        actions={
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={items.length === 0 || loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <Flame className="h-3.5 w-3.5" />
              {t.items.deleteAll}
            </button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
              disabled={importing}
            >
              <Upload className="h-4 w-4 mr-1" />
              {t.items.importCsv}
            </Button>
            <Button
              onClick={handleExportCsv}
              size="sm"
              variant="outline"
              disabled={items.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              {t.items.exportCsv}
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t.items.addItem}
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-8 space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.search}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">{t.items.allTypes}</option>
            {Object.entries(t.items.types).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">{t.items.source}</option>
            <option value="manual">{t.items.methods.manual}</option>
            {sourceOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select
            value={filterMonitored}
            onChange={(e) => setFilterMonitored(e.target.value as "" | "true" | "false")}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">{t.items.monitoringEnabled}</option>
            <option value="true">{t.items.monitoringEnabled}</option>
            <option value="false">{t.items.monitoringDisabled}</option>
          </select>
        </div>

        {showDeleteAllConfirm && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-destructive font-medium">
                {t.items.deleteAllConfirm}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  disabled={deletingAll}
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium bg-background hover:bg-muted transition-colors cursor-pointer"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {deletingAll ? t.items.deletingAll : t.common.confirm}
                </button>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-50" />
                <p>{t.common.noData}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="p-4 font-medium cursor-pointer select-none" onClick={() => toggleSort("name")}>
                        <span className="inline-flex items-center gap-1">{t.items.name}<SortIcon col="name" /></span>
                      </th>
                      <th className="p-4 font-medium hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleSort("type")}>
                        <span className="inline-flex items-center gap-1">{t.items.type}<SortIcon col="type" /></span>
                      </th>
                      <th className="p-4 font-medium hidden md:table-cell cursor-pointer select-none" onClick={() => toggleSort("source")}>
                        <span className="inline-flex items-center gap-1">{t.items.source}<SortIcon col="source" /></span>
                      </th>
                      <th className="p-4 font-medium hidden lg:table-cell cursor-pointer select-none" onClick={() => toggleSort("providerPrefix")}>
                        <span className="inline-flex items-center gap-1">Module/Provider<SortIcon col="providerPrefix" /></span>
                      </th>
                      <th className="p-4 font-medium hidden xl:table-cell cursor-pointer select-none" onClick={() => toggleSort("lastChecked")}>
                        <span className="inline-flex items-center gap-1">{t.items.lastChecked}<SortIcon col="lastChecked" /></span>
                      </th>
                      <th className="p-4 font-medium text-right">{t.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedItems.map((item) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setDetailItemId(item.id)}>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-muted-foreground">
                                {typeIcons[item.type] || <Package className="h-4 w-4" />}
                              </span>
                              <span className="font-medium">{item.name}</span>
                              {parseTags(item.tags).map((tag) => (
                                <Badge key={`${item.id}-${tag}`} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{item.id}</div>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-sm text-muted-foreground">
                          {t.items.types[item.type as keyof typeof t.items.types] || item.type}
                        </td>
                        <td className="p-4 hidden md:table-cell text-sm text-muted-foreground">
                          {item.source ? item.source.name : t.items.methods.manual}
                        </td>
                        <td className="p-4 hidden lg:table-cell text-sm text-muted-foreground">
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                            {item.source?.type ?? item.checkMethod}
                          </Badge>
                        </td>
                        <td className="p-4 hidden xl:table-cell text-sm text-muted-foreground">
                          {formatDate(item.lastChecked)}
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={item.monitoringEnabled}
                              onCheckedChange={() => handleToggleMonitoring(item)}
                              title={item.monitoringEnabled ? t.items.monitoringEnabled : t.items.monitoringDisabled}
                              className="h-5 w-9"
                            />
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title={t.common.edit}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)} title={t.common.delete}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && visibleItems.length > 0 && (
              <PaginationControls
                page={page}
                pageSize={pageSize}
                totalItems={visibleItems.length}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setPageSize(next);
                  setPage(1);
                }}
              />
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ItemForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditItem(null);
        }}
        onSave={handleSave}
        item={
          editItem
            ? {
                ...editItem,
                currentVersion: editItem.currentVersion || "",
                latestVersion: editItem.latestVersion || "",
                checkConfig: editItem.checkConfig || "",
                sourceId: editItem.sourceId || "",
                sourceParams: editItem.sourceParams || "",
                tags: parseTags(editItem.tags),
              }
            : null
        }
      />

      <Dialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={t.items.deleteItem}
      >
        <p className="text-sm text-muted-foreground mb-4">
          {t.items.deleteConfirm}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            {t.common.cancel}
          </Button>
          <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleDelete}>
            {t.common.delete}
          </Button>
        </div>
      </Dialog>

      <ItemDetailModal
        open={!!detailItemId}
        onClose={() => setDetailItemId(null)}
        itemId={detailItemId}
      />
    </>
  );
}
