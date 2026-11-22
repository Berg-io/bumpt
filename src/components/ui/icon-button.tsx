"use client";

import { forwardRef } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  /** Required: used as tooltip (title) and accessible name (aria-label). */
  label: string;
  /** "danger" stays neutral at rest and turns red on hover/focus only. */
  tone?: "neutral" | "danger" | "success";
  size?: "sm" | "md";
  loading?: boolean;
  iconClassName?: string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, label, tone = "neutral", size = "sm", loading = false, disabled, className, iconClassName, title, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-grid shrink-0 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-[background-color,color,box-shadow] duration-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        size === "sm" ? "size-8" : "size-9",
        tone === "neutral" && "hover:bg-control-hover hover:text-foreground",
        tone === "danger" && "hover:bg-destructive-soft hover:text-destructive focus-visible:text-destructive",
        tone === "success" && "hover:bg-st-ok-bg hover:text-st-ok",
        loading && "cursor-progress disabled:opacity-100",
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className={cn("size-4", iconClassName)} aria-hidden="true" />
      )}
    </button>
  )
);

IconButton.displayName = "IconButton";

export { IconButton };
