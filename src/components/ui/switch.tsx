"use client";

import { forwardRef } from "react";
import { cn } from "@/utils/cn";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, disabled, title }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        title={title}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        style={{
          backgroundColor: checked ? "hsl(var(--muted-foreground))" : "hsl(var(--input))",
          borderColor: checked ? "hsl(var(--muted-foreground))" : "hsl(var(--input))",
        }}
      >
        <span
          className="pointer-events-none block h-4 w-4 rounded-full shadow-md ring-0 transition-transform duration-200"
          style={{
            transform: checked ? "translateX(20px)" : "translateX(2px)",
            backgroundColor: checked ? "hsl(var(--card))" : "hsl(var(--muted-foreground))",
          }}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
