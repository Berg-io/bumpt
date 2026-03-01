"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslation, useLocale, getHtmlLang, useDateSettings } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import {
  FileText,
  Shield,
  Calendar,
  ExternalLink,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  History,
  Bot,
  Info,
} from "lucide-react";
import { RenderedContent } from "@/components/ui/rendered-content";

interface VersionLog {
  id: string;
  oldVersion: string | null;
  newVersion: string;
  releaseNotes?: string | null;
  releaseUrl?: string | null;
  cves?: string | null;
  changedAt: string;
}

interface ItemDetail {
  id: string;
  name: string;
  type: string;
  currentVersion: string | null;
  latestVersion: string | null;
  status: string;
  lastChecked: string | null;
  releaseNotes: string | null;
  releaseDate: string | null;
  releaseUrl: string | null;
  cves: string | null;
  description: string | null;
  downloadUrl: string | null;
  eolDate: string | null;
  isLts: boolean | null;
  aiSummary: string | null;
  rawMetadata?: string | null;
  logs?: VersionLog[];
  externalScore?: number | null;
  externalSeverity?: string | null;
  externalSource?: string | null;
  internalScore?: number | null;
  internalSeverity?: string | null;
  scoreConfidence?: number | null;
  checkMethod?: string | null;
  source?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface ItemDetailModalProps {
  open: boolean;
  onClose: () => void;
  itemId: string | null;
}

const statusVariants: Record<string, "success" | "warning" | "critical"> = {
  up_to_date: "success",
  outdated: "warning",
  critical: "critical",
  end_of_life: "critical",
};


export function ItemDetailModal({ open, onClose, itemId }: ItemDetailModalProps) {
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const t = useTranslation();
  const { locale } = useLocale();
  const dateSettings = useDateSettings();

  useEffect(() => {
    if (!open || !itemId) {
      setItem(null);
      return;
    }
    setLoading(true);
    fetch(`/api/items/${itemId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setItem(data))
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [open, itemId]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return formatAppDate(dateStr, dateSettings);
  };

  const parseCves = (cvesJson: string | null): string[] => {
    if (!cvesJson) return [];
    try { return JSON.parse(cvesJson); } catch { return []; }
  };

  const statusLabel = (status: string) => {
    if (status === "end_of_life") return t.itemDetail.eolReached;
    return t.items.statuses[status as keyof typeof t.items.statuses] || status;
  };

  const parseCveSourceCounts = (rawMetadataJson: string | null | undefined): Record<string, number> => {
    if (!rawMetadataJson) return {};
    try {
      const parsed = JSON.parse(rawMetadataJson) as {
        cveMetadata?: { countsBySource?: Record<string, number> };
      };
      return parsed?.cveMetadata?.countsBySource ?? {};
    } catch {
      return {};
    }
  };

  const parseCveVersionQueried = (rawMetadataJson: string | null | undefined): string | null => {
    if (!rawMetadataJson) return null;
    try {
      const parsed = JSON.parse(rawMetadataJson) as {
        cveMetadata?: { versionQueried?: string | null };
      };
      const value = parsed?.cveMetadata?.versionQueried;
      return typeof value === "string" && value.trim() ? value : null;
    } catch {
      return null;
    }
  };

  const isEolPast = (eolDate: string | null): boolean => {
    if (!eolDate || eolDate === "true" || eolDate === "false") return eolDate === "true";
    const d = new Date(eolDate);
    return !isNaN(d.getTime()) && d < new Date();
  };

  const cves = item ? parseCves(item.cves) : [];
  const cveSourceCounts = parseCveSourceCounts(item?.rawMetadata ?? null);
  const cveVersionQueried = parseCveVersionQueried(item?.rawMetadata ?? null);
  const cveSourceLabels: Record<string, string> = {
    osv: "OSV",
    nvd: "NVD",
    github_advisory: "GitHub Advisory",
    vulndb: "VulnDB",
  };
  const DESCRIPTION_PREVIEW_MAX = 700;
  const descriptionText = item?.description ?? "";
  const isDescriptionLong = descriptionText.length > DESCRIPTION_PREVIEW_MAX;
  const descriptionPreview = isDescriptionLong
    ? `${descriptionText.slice(0, DESCRIPTION_PREVIEW_MAX).trimEnd()}...`
    : descriptionText;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item?.name || t.itemDetail.title}
      className="max-w-2xl max-h-[85vh] overflow-y-auto"
    >
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && !item && (
        <p className="text-sm text-muted-foreground py-8 text-center">{t.common.noData}</p>
      )}

      {!loading && item && (
        <div className="space-y-5">
          {/* Status + Versions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={statusVariants[item.status] || "default"}>
              {statusLabel(item.status)}
            </Badge>
            {item.isLts && (
              <Badge variant="info">LTS</Badge>
            )}
            {item.eolDate && isEolPast(item.eolDate) && (
              item.status !== "end_of_life" && (
              <Badge variant="critical">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t.itemDetail.eolReached}
              </Badge>
              )
            )}
            {item.eolDate && !isEolPast(item.eolDate) && item.eolDate !== "false" && (
              <Badge variant="warning">
                EOL: {item.eolDate}
              </Badge>
            )}
          </div>

          {/* Version info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t.items.currentVersion}</span>
              <p className="font-mono font-medium mt-0.5">{item.currentVersion || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">{t.items.latestVersion}</span>
              <p className="font-mono font-medium mt-0.5">{item.latestVersion || "—"}</p>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">{t.items.source}</span>
            <p className="mt-0.5">
              {item.source
                ? `${item.source.name} (${t.sources.types[item.source.type as keyof typeof t.sources.types] || item.source.type})`
                : (item.checkMethod === "manual" ? t.items.noSource : t.itemDetail.notAvailable)}
            </p>
          </div>

          {/* Risk scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground mb-1">{t.itemDetail.externalScore}</p>
              <p className="font-semibold">
                {typeof item.externalScore === "number" ? Math.round(item.externalScore) : "N/A"}
                {item.externalSeverity ? ` (${item.externalSeverity})` : ""}
              </p>
              {item.externalSource && (
                <p className="text-[11px] text-muted-foreground mt-1">{t.itemDetail.scoreSource}: {item.externalSource}</p>
              )}
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground mb-1 inline-flex items-center gap-1.5">
                {t.itemDetail.bpt}
                <span
                  title={t.itemDetail.bptTooltip}
                  className="inline-flex cursor-help"
                >
                  <Info className="h-3.5 w-3.5" />
                </span>
              </p>
              <p className="font-semibold">
                {typeof item.internalScore === "number" ? Math.round(item.internalScore) : "N/A"}
                {item.internalSeverity ? ` (${item.internalSeverity})` : ""}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t.itemDetail.precision}: {typeof item.scoreConfidence === "number" ? `${item.scoreConfidence}%` : t.itemDetail.notAvailable}
              </p>
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">{t.itemDetail.description}</p>
              <p className="whitespace-pre-line break-words">{descriptionPreview}</p>
            </div>
          )}

          {/* Dates + Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {item.releaseDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(item.releaseDate) || item.releaseDate}</span>
              </div>
            )}
            {item.lastChecked && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDate(item.lastChecked)}</span>
              </div>
            )}
            {item.releaseUrl && (
              <a
                href={item.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t.itemDetail.viewRelease}
              </a>
            )}
            {item.downloadUrl && (
              <a
                href={item.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                {t.itemDetail.download}
              </a>
            )}
          </div>

          {/* CVEs */}
          {cves.length > 0 && (
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Shield className="h-4 w-4 text-destructive" />
                {t.itemDetail.cves} ({cves.length})
              </p>
              {cveVersionQueried && (
                <p className="text-[11px] text-muted-foreground mb-2">
                  {t.itemDetail.cveVersionEvaluated.replace("{version}", cveVersionQueried)}
                </p>
              )}
              {Object.entries(cveSourceCounts).some(([, count]) => count > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.entries(cveSourceCounts)
                    .filter(([, count]) => count > 0)
                    .map(([source, count]) => (
                      <Badge key={source} variant="outline" className="text-[10px]">
                        {cveSourceLabels[source] || source}: {count}
                      </Badge>
                    ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {cves.map((cve) => (
                  <a
                    key={cve}
                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <Badge variant="critical" className="text-xs cursor-pointer">
                      {cve}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* NVD Attribution */}
          {cves.length > 0 && (
            <p className="text-[10px] text-muted-foreground -mt-3">
              {t.itemDetail.cveAttribution}
            </p>
          )}

          {/* AI Summary */}
          {item.aiSummary && (
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Bot className="h-4 w-4 text-purple-500" />
                {t.itemDetail.aiAnalysis}
              </p>
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 max-h-64 overflow-y-auto">
                <RenderedContent content={item.aiSummary} />
              </div>
            </div>
          )}

          {/* Release Notes */}
          {item.releaseNotes && (
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <FileText className="h-4 w-4" />
                {t.itemDetail.releaseNotes}
              </p>
              <div className="rounded-lg border bg-muted/30 p-3 max-h-64 overflow-y-auto">
                <RenderedContent content={item.releaseNotes} />
              </div>
            </div>
          )}

          {/* Version History */}
          {item.logs && item.logs.length > 0 && (
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <History className="h-4 w-4" />
                {t.itemDetail.versionHistory} ({item.logs.length})
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {item.logs.map((log) => {
                  const logCves = parseCves(log.cves ?? null);
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-2 text-xs rounded-md border px-3 py-1.5"
                    >
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <code className="text-muted-foreground">{log.oldVersion || "—"}</code>
                      <span className="text-muted-foreground">→</span>
                      <code className="font-medium">{log.newVersion}</code>
                      {logCves.length > 0 && (
                        <Badge variant="critical" className="text-[10px] px-1 py-0 ml-1">
                          {logCves.length} CVE
                        </Badge>
                      )}
                      <span className="ml-auto text-muted-foreground">
                        {formatDate(log.changedAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
