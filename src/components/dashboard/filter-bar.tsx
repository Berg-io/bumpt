"use client";

import { Search, Download, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/config";

interface FilterBarProps {
  type: string;
  status: string;
  search: string;
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onSearchChange: (search: string) => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  availableTags?: string[];
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  /** Origin filter ("" all, "manual", "agent"); shown only when onOriginChange is set. */
  origin?: string;
  onOriginChange?: (origin: string) => void;
}

export function FilterBar({
  type,
  status,
  search,
  onTypeChange,
  onStatusChange,
  onSearchChange,
  onExportCsv,
  onPrint,
  availableTags = [],
  selectedTags = [],
  onTagsChange,
  origin = "",
  onOriginChange,
}: FilterBarProps) {
  const t = useTranslation();

  const typeOptions = [
    { value: "", label: t.items.allTypes },
    { value: "software", label: t.items.types.software },
    { value: "system", label: t.items.types.system },
    { value: "docker", label: t.items.types.docker },
    { value: "service", label: t.items.types.service },
    { value: "firmware", label: t.items.types.firmware },
    { value: "plugin", label: t.items.types.plugin },
    { value: "library", label: t.items.types.library },
    { value: "database", label: t.items.types.database },
    { value: "network", label: t.items.types.network },
    { value: "mobile_app", label: t.items.types.mobile_app },
    { value: "desktop_app", label: t.items.types.desktop_app },
    { value: "web_app", label: t.items.types.web_app },
    { value: "os", label: t.items.types.os },
    { value: "driver", label: t.items.types.driver },
    { value: "iot", label: t.items.types.iot },
  ];

  const statusOptions = [
    { value: "", label: t.items.allStatuses },
    { value: "up_to_date", label: t.items.statuses.up_to_date },
    { value: "outdated", label: t.items.statuses.outdated },
    { value: "check_failed", label: t.dashboard.checkFailed },
    { value: "critical", label: t.items.statuses.critical },
    { value: "end_of_life", label: t.itemDetail.eolReached },
    { value: "at_risk", label: t.dashboard.atRiskFilter },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t.common.search}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={t.common.search}
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      {/* Phones: the two filters share a row instead of taking a full screen. */}
      <div className="grid grid-cols-2 gap-3 sm:contents">
      <Select
        options={typeOptions}
        aria-label={t.items.type}
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className="w-full sm:w-40"
      />
      <Select
        options={statusOptions}
        aria-label={t.items.status}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-full sm:w-40"
      />
      {onOriginChange && (
        <Select
          aria-label={t.items.origin}
          options={[
            { value: "", label: t.items.allOrigins },
            { value: "manual", label: t.items.originManual },
            { value: "agent", label: t.items.originAgent },
          ]}
          value={origin}
          onChange={(e) => onOriginChange(e.target.value)}
          className="w-full sm:w-40"
        />
      )}
      {onTagsChange && availableTags.length > 0 && (
        <Select
          options={[
            { value: "", label: t.items.allTags },
            ...availableTags.map((tag) => ({ value: tag, label: tag })),
          ]}
          value={selectedTags[0] || ""}
          onChange={(e) => onTagsChange(e.target.value ? [e.target.value] : [])}
          className="w-full sm:w-40"
        />
      )}
      </div>
      <div className="flex gap-2 sm:contents">
      {onExportCsv && (
        <Button onClick={onExportCsv} size="sm" variant="outline" className="flex-1 sm:flex-none">
          <Download className="h-4 w-4 mr-1" />
          {t.items.exportCsv}
        </Button>
      )}
      {onPrint && (
        <Button onClick={onPrint} size="sm" variant="outline" className="flex-1 sm:flex-none">
          <Printer className="h-4 w-4 mr-1" />
          {t.items.printTable}
        </Button>
      )}
      </div>
    </div>
  );
}
