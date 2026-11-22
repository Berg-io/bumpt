import { cn } from "@/utils/cn";

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "info" | "danger" | "warning" | "success";
  /** Monospace, for technical identifiers (module, provider, CVE id). */
  mono?: boolean;
}

/** Small rectangle for metadata: tags, modules, LTS, counters. Statuses use <Badge>. */
export function Tag({ tone = "neutral", mono, className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded border px-1.5 text-[11px] font-medium leading-none [&_svg]:size-3 [&_svg]:shrink-0",
        mono && "font-mono text-[10.5px]",
        tone === "neutral" && "border-st-neutral-border bg-st-neutral-bg text-st-neutral",
        tone === "info" && "border-st-info-border bg-st-info-bg text-st-info",
        tone === "danger" && "border-st-bad-border bg-st-bad-bg text-st-bad",
        tone === "warning" && "border-st-warn-border bg-st-warn-bg text-st-warn",
        tone === "success" && "border-st-ok-border bg-st-ok-bg text-st-ok",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export type ScoreSeverity = "low" | "medium" | "high" | "critical" | string | null | undefined;

interface ScoreChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  value: number | string;
  severity: ScoreSeverity;
  /** Hide the label on narrow screens and keep only the value. */
  compactLabel?: boolean;
}

/** Two-part score chip: "BPT | 71", coloured by severity. */
export function ScoreChip({ label, value, severity, compactLabel, className, ...props }: ScoreChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-stretch overflow-hidden whitespace-nowrap rounded border text-[11px] font-semibold leading-none",
        severity === "low" && "border-st-ok-border text-st-ok [&>[data-v]]:bg-st-ok-bg",
        severity === "medium" && "border-st-warn-border text-st-warn [&>[data-v]]:bg-st-warn-bg",
        severity === "high" && "border-st-high-border text-st-high [&>[data-v]]:bg-st-high-bg",
        severity === "critical" && "border-st-bad-border text-st-bad [&>[data-v]]:bg-st-bad-bg",
        !["low", "medium", "high", "critical"].includes(severity ?? "") &&
          "border-st-neutral-border text-st-neutral [&>[data-v]]:bg-st-neutral-bg",
        className
      )}
      {...props}
    >
      <span className={cn("inline-flex items-center px-1.5 font-medium opacity-85", compactLabel && "hidden sm:inline-flex")}>
        {label}
      </span>
      <span data-v className="inline-flex items-center px-1.5 font-mono tabular-nums">
        {value}
      </span>
    </span>
  );
}
