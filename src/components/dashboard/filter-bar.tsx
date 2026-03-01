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
    { value: "end_of_life", label: t.itemDetail.eolReached },
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
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <Select
        options={typeOptions}
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className="w-full sm:w-40"
      />
      <Select
        options={statusOptions}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-full sm:w-40"
      />
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
      {onExportCsv && (
        <Button onClick={onExportCsv} size="sm" variant="outline" className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-1" />
          {t.items.exportCsv}
        </Button>
      )}
      {onPrint && (
        <Button onClick={onPrint} size="sm" variant="outline" className="w-full sm:w-auto">
          <Printer className="h-4 w-4 mr-1" />
          {t.items.printTable}
        </Button>
      )}
    </div>
  );
}
