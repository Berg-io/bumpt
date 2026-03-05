"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Monitor, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/header";
import { StatusOverview } from "@/components/dashboard/status-overview";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ItemsTable } from "@/components/dashboard/items-table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useTranslation } from "@/i18n/config";
import { useToast } from "@/components/ui/toast";
import { exportToCsv } from "@/utils/csv";

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
  releaseNotes?: string | null;
  cves?: string | null;
  eolDate?: string | null;
  isLts?: boolean | null;
  tags?: string | string[] | null;
  externalScore?: number | null;
  externalSeverity?: string | null;
  internalScore?: number | null;
  internalSeverity?: string | null;
  securityState?: string | null;
  source?: { id: string; name: string; type: string } | null;
}

export default function DashboardPage() {
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState<number | "all">(100);
  const [selectedPageSize, setSelectedPageSize] = useState<number | "all" | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [checkingAll, setCheckingAll] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const t = useTranslation();
  const { toast } = useToast();

  const patchItemInState = useCallback((patched: Partial<MonitoredItem> & { id: string }) => {
    setItems((prev) =>
      prev.map((item) => (item.id === patched.id ? { ...item, ...patched } : item))
    );
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterStatus === "critical") {
      params.set("riskState", "at_risk");
    } else if (filterStatus) {
      params.set("status", filterStatus);
    }
    if (search) params.set("search", search);
    params.set("monitoringEnabled", "true");
    params.set("page", String(page));
    if (selectedPageSize !== null) params.set("pageSize", String(selectedPageSize));

    try {
      const res = await fetch(`/api/items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.data);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setPage(typeof data.page === "number" ? data.page : 1);
        const resolvedPageSize = data.pageSize === "all" ? "all" : Number(data.pageSize || 100);
        setPageSize(resolvedPageSize);
        if (selectedPageSize === null) setSelectedPageSize(resolvedPageSize);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, search, page, selectedPageSize]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterStatus, search]);

  useEffect(() => {
    const interval = setInterval(fetchItems, 60000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  useEffect(() => {
    const eventSource = new EventSource("/api/items/check-stream");

    const onCheckStarted = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { total?: number };
        if (typeof payload.total === "number") {
          setCheckingAll(true);
        }
      } catch {
        // Ignore malformed stream payloads.
      }
    };

    const onCheckProgress = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { item?: MonitoredItem };
        if (payload.item?.id) {
          patchItemInState(payload.item);
        }
      } catch {
        // Ignore malformed stream payloads.
      }
    };

    const onCheckDone = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { total?: number };
        if (typeof payload.total === "number") {
          setCheckingAll(false);
        }
      } catch {
        // Keep UI resilient if event payload is malformed.
      } finally {
        fetchItems();
      }
    };

    eventSource.addEventListener("check_started", onCheckStarted);
    eventSource.addEventListener("check_progress", onCheckProgress);
    eventSource.addEventListener("check_done", onCheckDone);

    return () => {
      eventSource.removeEventListener("check_started", onCheckStarted);
      eventSource.removeEventListener("check_progress", onCheckProgress);
      eventSource.removeEventListener("check_done", onCheckDone);
      eventSource.close();
    };
  }, [fetchItems, patchItemInState]);

  const counts = {
    up_to_date: items.filter((i) => i.status === "up_to_date").length,
    outdated: items.filter((i) => i.status === "outdated").length,
    critical: items.filter((i) => i.securityState === "vulnerable" || i.status === "end_of_life").length,
    total: items.length,
    totalVulnerabilities: items.reduce((sum, item) => {
      if (!item.cves) return sum;
      try {
        const parsed = JSON.parse(item.cves);
        return sum + (Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        return sum;
      }
    }, 0),
    avgInternalScore: (() => {
      const values = items
        .map((item) => item.internalScore)
        .filter((value): value is number => typeof value === "number");
      if (values.length === 0) return null;
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    })(),
    avgExternalScore: (() => {
      const values = items
        .map((item) => item.externalScore)
        .filter((value): value is number => typeof value === "number");
      if (values.length === 0) return null;
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    })(),
    severityBreakdown: items.reduce(
      (acc, item) => {
        const severity = item.internalSeverity ?? item.externalSeverity;
        if (severity === "critical" || severity === "high" || severity === "medium" || severity === "low") {
          acc[severity] += 1;
        } else if (item.securityState === "vulnerable" || item.status === "end_of_life") {
          // Fallback: keep critical bucket aligned with critical status cards.
          acc.critical += 1;
        }
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    ),
  };

  const handleStatusFilter = (status: string | null) => {
    setFilterStatus(status || "");
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    const next = value === "all" ? "all" : Number(value);
    setSelectedPageSize(next);
    setPage(1);
  };

  const handlePrint = () => {
    document.body.classList.add("printing-table");
    window.print();
    document.body.classList.remove("printing-table");
  };

  const handleExportCsv = () => {
    const columns = [
      { key: "name", label: t.items.name },
      { key: "currentVersion", label: t.items.currentVersion },
      { key: "latestVersion", label: t.items.latestVersion },
      { key: "status", label: t.items.status },
      { key: "internalScore", label: "BPT" },
      { key: "externalScore", label: "External" },
      { key: "lastChecked", label: t.items.lastChecked },
    ];
    const date = new Date().toISOString().slice(0, 10);
    exportToCsv(items, columns, `dashboard-export-${date}.csv`);
  };

  const handleCheckAll = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setCheckingAll(true);
    try {
      const res = await fetch("/api/items/check-all", {
        method: "POST",
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        toast(t.dashboard.checkAllDone.replace("{count}", String(data.checked)), "success");
        fetchItems();
      } else {
        toast(t.common.error, "error");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        toast(t.dashboard.checkAllCancelled ?? "Cancelled", "info");
        fetchItems();
      } else {
        toast(t.common.error, "error");
      }
    } finally {
      abortRef.current = null;
      setCheckingAll(false);
    }
  };

  const handleCancelCheckAll = () => {
    abortRef.current?.abort();
  };

  return (
    <>
      <Header
        title={t.dashboard.title}
        actions={
          <div className="flex items-center gap-2">
            {checkingAll ? (
              <Button
                onClick={handleCancelCheckAll}
                size="sm"
                variant="outline"
                className="border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                {t.dashboard.cancelCheckAll ?? "Cancel"}
              </Button>
            ) : (
              <Button
                onClick={handleCheckAll}
                size="sm"
                variant="outline"
                disabled={items.length === 0}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t.dashboard.checkAll}
              </Button>
            )}
            <Link
              href="/overview"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title={t.dashboard.fullscreen}
            >
              <Monitor className="h-4 w-4" />
            </Link>
          </div>
        }
      />
      <div className="flex-1 space-y-6 p-4 lg:p-8">
        <StatusOverview
          counts={counts}
          onFilterStatus={handleStatusFilter}
          activeStatus={filterStatus || null}
        />

        <Card>
          <CardContent className="p-0">
            <div className="p-4 lg:p-6">
              <FilterBar
                type={filterType}
                status={filterStatus}
                search={search}
                onTypeChange={(value) => {
                  setFilterType(value);
                  setPage(1);
                }}
                onStatusChange={(value) => handleStatusFilter(value || null)}
                onSearchChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                onExportCsv={handleExportCsv}
                onPrint={handlePrint}
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-3">
                <div id="printable-table" className="w-full">
                  <ItemsTable items={items} onRefresh={fetchItems} />
                </div>
                <PaginationControls
                  page={page}
                  pageSize={pageSize}
                  totalItems={total}
                  onPageChange={setPage}
                  onPageSizeChange={(next) => {
                    handlePageSizeChange(String(next));
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
