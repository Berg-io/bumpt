import { AlertTriangle } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

/**
 * Item status pill. Colour = severity for the software; grey = the tool could not get an answer.
 * Vulnerable is a filled red pill, end of life a red outline with a hollow dot.
 */
const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  up_to_date: "success",
  outdated: "warning",
  critical: "critical",
  end_of_life: "eol",
  check_failed: "neutral",
};

interface StatusBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  status: string;
  label: string;
}

export function StatusBadge({ status, label, ...props }: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? "neutral";
  return (
    <Badge variant={variant} {...props}>
      {status === "check_failed" && <AlertTriangle aria-hidden="true" />}
      {label}
    </Badge>
  );
}
