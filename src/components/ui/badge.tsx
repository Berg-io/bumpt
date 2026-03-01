import { cn } from "@/utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "critical" | "outline" | "info";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all",
        variant === "default" && "bg-primary/10 text-primary",
        variant === "success" &&
          "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/25",
        variant === "warning" &&
          "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-400/25",
        variant === "critical" &&
          "bg-red-500/15 text-red-700 ring-1 ring-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-400/25",
        variant === "info" &&
          "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/20 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-400/25",
        variant === "outline" && "border border-border text-foreground",
        className
      )}
      {...props}
    >
      {(variant === "success" || variant === "warning" || variant === "critical" || variant === "info") && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-emerald-500 dark:bg-emerald-400",
            variant === "warning" && "bg-amber-500 dark:bg-amber-400",
            variant === "critical" && "bg-red-500 dark:bg-red-400 animate-pulse",
            variant === "info" && "bg-sky-500 dark:bg-sky-400"
          )}
        />
      )}
      {children}
    </span>
  );
}
