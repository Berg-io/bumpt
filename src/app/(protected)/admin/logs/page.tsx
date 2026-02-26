"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  LogIn,
  LogOut,
  User,
  Package,
  Shield,
  Search,
  Settings2,
  CheckCircle,
  Database,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flame,
  Calendar,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useTranslation, useLocale, useDateSettings } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  details: Record<string, unknown> | null;
  userId: string | null;
  userEmail: string | null;
  createdAt: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  "item.created": <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  "item.updated": <Pencil className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
  "item.deleted": <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />,
  "item.version_checked": <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
  "item.version_acknowledged": <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  "item.check_failed": <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
  "user.created": <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  "user.updated": <Pencil className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
  "user.deleted": <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />,
  "source.created": <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  "source.updated": <Pencil className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
  "source.deleted": <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />,
  "settings.updated": <Settings2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />,
  "auth.login": <LogIn className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  "auth.logout": <LogOut className="h-4 w-4 text-muted-foreground" />,
  "report.created": <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  "report.updated": <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
  "report.deleted": <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />,
};

const actionBadgeVariants: Record<string, "success" | "default" | "critical" | "warning" | "outline" | "info"> = {
  "item.created": "success",
  "item.updated": "info",
  "item.deleted": "critical",
  "item.version_checked": "warning",
  "item.version_acknowledged": "success",
  "item.check_failed": "critical",
  "user.created": "success",
  "user.updated": "info",
  "user.deleted": "critical",
  "source.created": "success",
  "source.updated": "info",
  "source.deleted": "critical",
  "settings.updated": "default",
  "auth.login": "success",
  "auth.logout": "outline",
  "report.created": "success",
  "report.updated": "info",
  "report.deleted": "critical",
};

const entityIcons: Record<string, React.ReactNode> = {
  item: <Package className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  auth: <Shield className="h-3.5 w-3.5" />,
  source: <Database className="h-3.5 w-3.5" />,
  settings: <Settings2 className="h-3.5 w-3.5" />,
  report: <Calendar className="h-3.5 w-3.5" />,
};

const fieldLabels: Record<string, Record<string, string>> = {
  de: {
    monitoringEnabled: "Überwachung",
    checkMethod: "Prüfmethode",
    currentVersion: "Aktuelle Version",
    latestVersion: "Neueste Version",
    name: "Name",
    type: "Typ",
    status: "Status",
    sourceId: "Prüfquelle",
    role: "Rolle",
    description: "Beschreibung",
    config: "Konfiguration",
    email: "E-Mail",
  },
  en: {
    monitoringEnabled: "Monitoring",
    checkMethod: "Check method",
    currentVersion: "Current version",
    latestVersion: "Latest version",
    name: "Name",
    type: "Type",
    status: "Status",
    sourceId: "Check source",
    role: "Role",
    description: "Description",
    config: "Configuration",
    email: "Email",
    enabled: "Enabled",
    schedule: "Schedule",
    hour: "Hour",
    channelEmail: "Email channel",
    channelSlack: "Slack",
    channelDiscord: "Discord",
    channelTeams: "Teams",
    channelInApp: "In-App",
  },
  fr: {
    monitoringEnabled: "Surveillance",
    checkMethod: "Méthode de vérification",
    currentVersion: "Version actuelle",
    latestVersion: "Dernière version",
    name: "Nom",
    type: "Type",
    status: "Statut",
    sourceId: "Source de vérification",
    role: "Rôle",
    description: "Description",
    config: "Configuration",
    email: "E-mail",
    enabled: "Activé",
    schedule: "Planification",
    hour: "Heure",
    channelEmail: "Canal e-mail",
    channelSlack: "Slack",
    channelDiscord: "Discord",
    channelTeams: "Teams",
    channelInApp: "In-App",
  },
  gsw: {
    monitoringEnabled: "Überwachig",
    checkMethod: "Prüefmethod",
    currentVersion: "Aktuelli Version",
    latestVersion: "Nöischti Version",
    name: "Name",
    type: "Typ",
    status: "Status",
    sourceId: "Prüefquälle",
    role: "Rolle",
    description: "Beschriibig",
    config: "Konfiguration",
    email: "E-Mail",
  },
};

const valueLabels: Record<string, Record<string, string>> = {
  de: {
    true: "Aktiv",
    false: "Inaktiv",
    manual: "Manuell",
    api: "API",
    scraping: "Scraping",
    up_to_date: "Aktuell",
    outdated: "Veraltet",
    critical: "Kritisch",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super-Admin",
  },
  en: {
    true: "Active",
    false: "Inactive",
    manual: "Manual",
    api: "API",
    scraping: "Scraping",
    up_to_date: "Up to date",
    outdated: "Outdated",
    critical: "Critical",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super Admin",
  },
  fr: {
    true: "Actif",
    false: "Inactif",
    manual: "Manuel",
    api: "API",
    scraping: "Scraping",
    up_to_date: "À jour",
    outdated: "Obsolète",
    critical: "Critique",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super Admin",
  },
  gsw: {
    true: "Aktiv",
    false: "Inaktiv",
    manual: "Manuell",
    api: "API",
    scraping: "Scraping",
    up_to_date: "Aktuell",
    outdated: "Veraltet",
    critical: "Kritisch",
    ADMIN: "Admin",
    SUPER_ADMIN: "Super-Admin",
  },
};

function translateField(key: string, locale: string): string {
  return fieldLabels[locale]?.[key] ?? fieldLabels.en[key] ?? key;
}

function translateValue(val: unknown, locale: string): string {
  const str = String(val);
  return valueLabels[locale]?.[str] ?? valueLabels.en[str] ?? str;
}

function formatDetails(
  details: Record<string, unknown> | null,
  action: string,
  entityName: string | null,
  locale: string
): string {
  if (!details) {
    if (action === "auth.login" || action === "auth.logout") {
      return entityName ?? "";
    }
    return "";
  }

  const target = entityName ? `${entityName} — ` : "";

  if (action === "item.version_checked") {
    const prev = details.previousLatest ?? "—";
    const next = details.newLatest ?? "—";
    const status = details.status
      ? ` (${translateValue(details.status, locale)})`
      : details.changed
        ? ""
        : "";
    return `${target}${prev} → ${next}${status}`;
  }

  if (action === "item.version_acknowledged") {
    const prev = details.previousVersion ?? "—";
    const next = details.acknowledgedVersion ?? "—";
    return `${target}${prev} → ${next}`;
  }

  if (action === "item.check_failed") {
    const error = details.error ? String(details.error) : "";
    const trigger = details.trigger === "cron" ? " (cron)" : "";
    const shortError = error.length > 80 ? error.substring(0, 80) + "…" : error;
    return `${target}${shortError}${trigger}`;
  }

  if (action === "item.created") {
    const parts: string[] = [];
    if (details.type) parts.push(translateValue(details.type, locale));
    if (details.checkMethod) parts.push(translateField("checkMethod", locale) + ": " + translateValue(details.checkMethod, locale));
    if (details.currentVersion) parts.push(`v${details.currentVersion}`);
    return target + parts.join(", ");
  }

  if (action === "item.deleted") {
    const parts: string[] = [];
    if (details.type) parts.push(translateValue(details.type, locale));
    if (details.currentVersion) parts.push(`v${details.currentVersion}`);
    return target + parts.join(", ");
  }

  if (action === "source.created") {
    return target + (details.type ? String(details.type) : "");
  }

  if (action === "source.deleted") {
    const parts: string[] = [];
    if (details.type) parts.push(String(details.type));
    if (details.linkedItems) parts.push(`${details.linkedItems} items`);
    return target + parts.join(", ");
  }

  if ((action === "item.updated" || action === "user.updated" || action === "source.updated") && details.changes) {
    const changes = details.changes as Record<string, { from: unknown; to: unknown }>;
    return target + Object.entries(changes)
      .map(([key, val]) => `${translateField(key, locale)}: ${translateValue(val.from, locale)} → ${translateValue(val.to, locale)}`)
      .join(", ");
  }

  if (action === "source.updated" && !details.changes) {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(details)) {
      if (typeof val === "object" && val && "from" in val && "to" in val) {
        const v = val as { from: unknown; to: unknown };
        parts.push(`${translateField(key, locale)}: ${translateValue(v.from, locale)} → ${translateValue(v.to, locale)}`);
      } else if (val === "updated") {
        parts.push(translateField(key, locale));
      }
    }
    return target + parts.join(", ");
  }

  if (action === "user.created" || action === "user.deleted") {
    if (details.role) return target + translateField("role", locale) + ": " + translateValue(details.role, locale);
    return target;
  }

  if (action.startsWith("report.")) {
    if (!details || Object.keys(details).length === 0) return target;
    const parts: string[] = [];
    for (const [key, val] of Object.entries(details)) {
      parts.push(`${translateField(key, locale)}: ${translateValue(val, locale)}`);
    }
    return target + parts.join(", ");
  }

  if (action === "settings.updated") {
    const keys = details.keys as string[] | undefined;
    if (keys && keys.length > 0) {
      return keys.map((k) => translateField(k.replace(" (masked)", ""), locale)).join(", ");
    }
    return "";
  }

  if (action === "item.updated" || action === "user.updated") {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(details)) {
      if (key === "changes") continue;
      parts.push(`${translateField(key, locale)}: ${translateValue(val, locale)}`);
    }
    return target + parts.join(", ");
  }

  return target;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purging, setPurging] = useState(false);
  const t = useTranslation();
  const { locale } = useLocale();
  const dateSettings = useDateSettings();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (filterType) params.set("entityType", filterType);
    if (filterAction) params.set("action", filterAction);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
        setTotalItems(data.total);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterType, filterAction, search, page, pageSize]);

  const handlePurge = async () => {
    setPurging(true);
    try {
      const res = await fetch("/api/logs", { method: "DELETE" });
      if (res.ok) {
        setShowPurgeConfirm(false);
        setPage(1);
        setLogs([]);
        setTotalItems(0);
        fetchLogs();
      }
    } catch {
      // silently fail
    } finally {
      setPurging(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filterType, filterAction, search]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => {
    return formatAppDate(dateStr, dateSettings);
  };

  const typeOptions = [
    { value: "", label: t.logs.allTypes },
    { value: "item", label: t.logs.entityTypes.item },
    { value: "user", label: t.logs.entityTypes.user },
    { value: "auth", label: t.logs.entityTypes.auth },
    { value: "source", label: t.logs.entityTypes.source },
    { value: "settings", label: t.logs.entityTypes.settings },
    { value: "report", label: t.logs.entityTypes.report ?? "Report" },
  ];

  const actionOptions = [
    { value: "", label: t.logs.allActions },
    { value: "item.created", label: t.logs.actions["item.created"] },
    { value: "item.updated", label: t.logs.actions["item.updated"] },
    { value: "item.deleted", label: t.logs.actions["item.deleted"] },
    { value: "item.version_checked", label: t.logs.actions["item.version_checked"] },
    { value: "item.version_acknowledged", label: t.logs.actions["item.version_acknowledged"] },
    { value: "item.check_failed", label: t.logs.actions["item.check_failed"] },
    { value: "user.created", label: t.logs.actions["user.created"] },
    { value: "user.updated", label: t.logs.actions["user.updated"] },
    { value: "user.deleted", label: t.logs.actions["user.deleted"] },
    { value: "source.created", label: t.logs.actions["source.created"] },
    { value: "source.updated", label: t.logs.actions["source.updated"] },
    { value: "source.deleted", label: t.logs.actions["source.deleted"] },
    { value: "auth.login", label: t.logs.actions["auth.login"] },
    { value: "auth.logout", label: t.logs.actions["auth.logout"] },
    { value: "settings.updated", label: t.logs.actions["settings.updated"] },
    { value: "report.created", label: t.logs.actions["report.created"] },
    { value: "report.updated", label: t.logs.actions["report.updated"] },
    { value: "report.deleted", label: t.logs.actions["report.deleted"] },
  ];

  return (
    <>
      <Header title={t.logs.title} />

      <div className="flex-1 p-4 lg:p-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t.common.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border bg-transparent pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <Select
            options={typeOptions}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-48"
          />
          <Select
            options={actionOptions}
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full sm:w-56"
          />
          <div className="sm:ml-auto">
            <button
              onClick={() => setShowPurgeConfirm(true)}
              disabled={totalItems === 0 || loading}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <Flame className="h-4 w-4" />
              {t.logs.purge}
            </button>
          </div>
        </div>

        {showPurgeConfirm && (
          <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                {t.logs.purgeConfirm}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPurgeConfirm(false)}
                  disabled={purging}
                  className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium bg-background hover:bg-muted transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handlePurge}
                  disabled={purging}
                  className="inline-flex h-8 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {purging ? t.logs.purging : t.common.confirm}
                </button>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p>{t.common.noData}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="p-4 font-medium">{t.logs.date}</th>
                      <th className="p-4 font-medium">{t.logs.action}</th>
                      <th className="p-4 font-medium">{t.logs.target}</th>
                      <th className="p-4 font-medium hidden md:table-cell">{t.logs.details}</th>
                      <th className="p-4 font-medium hidden sm:table-cell">{t.logs.user}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {actionIcons[log.action] || <FileText className="h-4 w-4" />}
                            <Badge variant={actionBadgeVariants[log.action] || "outline"}>
                              {t.logs.actions[log.action as keyof typeof t.logs.actions] || log.action}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">
                              {entityIcons[log.entityType]}
                            </span>
                            <span className="text-sm font-medium">
                              {log.entityName || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground max-w-md truncate block" title={formatDetails(log.details, log.action, log.entityName, locale)}>
                            {formatDetails(log.details, log.action, log.entityName, locale)}
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {log.userEmail || "System"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {!loading && totalItems > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t.common.rowsPerPage}</span>
              <Select
                options={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                ]}
                value={String(pageSize)}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="w-20"
              />
              <span className="ml-2 tabular-nums">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} / {totalItems}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                {t.common.pageOf.replace("{page}", String(page)).replace("{total}", String(totalPages))}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-sm hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label={t.common.previousPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-sm hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                aria-label={t.common.nextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
