"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-soft"
  | "link"
  // Legacy names, kept so existing call sites keep working.
  | "default"
  | "outline"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm" | "default";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner in place of the leading icon, disables the button and sets aria-busy. */
  loading?: boolean;
}

const VARIANT_ALIASES: Record<string, string> = {
  default: "primary",
  outline: "secondary",
  destructive: "danger",
};

const variantClasses: Record<string, string> = {
  primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
  secondary:
    "border border-border bg-card text-foreground shadow-xs hover:bg-control-hover hover:border-input dark:bg-secondary",
  ghost: "text-foreground hover:bg-control-hover",
  danger: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive-hover",
  "danger-soft": "border border-st-bad-border text-destructive hover:bg-destructive-soft",
  link: "h-auto px-0.5 text-primary underline-offset-4 hover:underline",
};

const sizeClasses: Record<string, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px] [&_svg]:size-3.5",
  md: "h-9 gap-2 px-3.5 text-sm [&_svg]:size-4",
  lg: "h-10 gap-2 px-[18px] text-[15px] [&_svg]:size-4",
  icon: "size-9 [&_svg]:size-4",
  "icon-sm": "size-8 [&_svg]:size-4",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    const v = VARIANT_ALIASES[variant] ?? variant;
    const s = size === "default" ? "md" : size;
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        className={cn(
          "relative inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-medium leading-none transition-[background-color,border-color,color,box-shadow] duration-100",
          "[&_svg]:shrink-0 [&_svg]:mr-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
          "data-[loading]:cursor-progress data-[loading]:opacity-80",
          variantClasses[v],
          v !== "link" && sizeClasses[s],
          // A loading button hides its own leading icon: the spinner takes its place.
          loading && "[&>svg:not(.btn-spinner):first-of-type]:hidden",
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="btn-spinner animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
