import { cn } from "@/utils/cn";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "critical"
  | "eol"
  | "info"
  | "neutral"
  | "outline";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Leading colour dot. Defaults to true for status variants; pass false when the badge has its own icon. */
  dot?: boolean;
}

const DOT_VARIANTS: BadgeVariant[] = ["success", "warning", "critical", "eol"];

/**
 * Round pill. Reserved for states (item status, role, MFA...). For metadata (tags, counters,
 * modules, scores) use <Tag> / <ScoreChip> from ./tag instead.
 */
export function Badge({ className, variant = "default", dot, children, ...props }: BadgeProps) {
  const showDot = dot ?? DOT_VARIANTS.includes(variant);
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold [&_svg]:size-3 [&_svg]:shrink-0",
        variant === "default" && "border-primary/20 bg-primary/10 text-primary",
        variant === "success" && "border-st-ok-border bg-st-ok-bg text-st-ok",
        variant === "warning" && "border-st-warn-border bg-st-warn-bg text-st-warn",
        variant === "critical" && "border-st-bad-border bg-st-bad-bg text-st-bad",
        variant === "eol" && "border-st-bad-dot/70 bg-transparent text-st-bad",
        variant === "info" && "border-st-info-border bg-st-info-bg text-st-info",
        variant === "neutral" && "border-st-neutral-border bg-st-neutral-bg text-st-neutral",
        variant === "outline" && "border-border text-foreground",
        showDot && "pl-2",
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className={cn(
            "size-[7px] shrink-0 rounded-full",
            variant === "success" && "bg-st-ok-dot",
            variant === "warning" && "bg-st-warn-dot",
            variant === "critical" && "bg-st-bad-dot",
            variant === "eol" && "bg-transparent ring-2 ring-inset ring-st-bad-dot"
          )}
        />
      )}
      {children}
    </span>
  );
}
