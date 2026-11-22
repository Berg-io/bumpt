"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Shows a spinner in the thumb and blocks input while a change is being saved. */
  loading?: boolean;
  size?: "sm" | "md";
  className?: string;
  title?: string;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * On = primary track, off = neutral track; the thumb is always white.
 * md = 36x20 (forms), sm = 28x16 (table rows). The thumb travel is derived from the size.
 */
const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, loading = false, size = "md", title, ...aria }, ref) => {
    const sm = size === "sm";
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-busy={loading || undefined}
        title={title}
        disabled={disabled || loading}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-45",
          loading && "cursor-progress disabled:opacity-100",
          sm ? "h-4 w-7" : "h-5 w-9",
          checked ? "bg-primary" : "bg-switch-off",
          !disabled && !loading && "hover:brightness-95",
          className
        )}
        {...aria}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-0.5 top-0.5 grid place-items-center rounded-full bg-white text-primary shadow-sm transition-transform duration-150",
            sm ? "size-3" : "size-4",
            checked && (sm ? "translate-x-3" : "translate-x-4")
          )}
        >
          {loading && <Loader2 className={cn("animate-spin", sm ? "size-2.5" : "size-3")} aria-hidden="true" />}
        </span>
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
