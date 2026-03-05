"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/config";

type PageSizeValue = number | "all";

interface PaginationControlsProps {
  page: number;
  pageSize: PageSizeValue;
  totalItems: number;
  pageSizeOptions?: PageSizeValue[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeValue) => void;
}

export function PaginationControls({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [25, 50, 100, 500, "all"],
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const t = useTranslation();
  const normalizedPage = Math.max(1, page);
  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const start =
    totalItems === 0
      ? 0
      : pageSize === "all"
        ? 1
        : (normalizedPage - 1) * pageSize + 1;
  const end =
    totalItems === 0
      ? 0
      : pageSize === "all"
        ? totalItems
        : Math.min(normalizedPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t.common.rowsPerPage}</span>
        <select
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {pageSizeOptions.map((size) => (
            <option key={String(size)} value={String(size)}>
              {size === "all" ? "all" : String(size)}
            </option>
          ))}
        </select>
        <span className="ml-2 tabular-nums">
          {start}-{end} / {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground tabular-nums">
          {t.common.pageOf
            .replace("{page}", String(normalizedPage))
            .replace("{total}", String(totalPages))}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, normalizedPage - 1))}
          disabled={normalizedPage <= 1 || pageSize === "all" || totalItems === 0}
        >
          {t.common.previousPage}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, normalizedPage + 1))}
          disabled={normalizedPage >= totalPages || pageSize === "all" || totalItems === 0}
        >
          {t.common.nextPage}
        </Button>
      </div>
    </div>
  );
}
