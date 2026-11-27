"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpCircle, Bell, CalendarX, CheckCheck, Flame, ShieldAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatAppDate } from "@/lib/format-date";
import { getHtmlLang, useDateSettings, useLocale, useTranslation } from "@/i18n/config";
import {
  describeNotification,
  notificationHref,
  useNotifications,
  type AppNotification,
} from "./notifications-provider";

const TYPE_ICONS: Record<string, LucideIcon> = {
  version_new: ArrowUpCircle,
  cve_new: ShieldAlert,
  kev_new: Flame,
  eol: CalendarX,
  check_failed: AlertTriangle,
};

/** Same status tokens as the badges: info = blue, warning = amber, critical = red. */
const SEVERITY_CLASSES: Record<string, string> = {
  info: "border-st-info-border bg-st-info-bg text-st-info",
  warning: "border-st-warn-border bg-st-warn-bg text-st-warn",
  critical: "border-st-bad-border bg-st-bad-bg text-st-bad",
};

function useRelativeTime() {
  const { locale } = useLocale();
  return useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(getHtmlLang(locale), { numeric: "auto", style: "short" });
    return (iso: string) => {
      const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
      const abs = Math.abs(seconds);
      if (abs < 60) return rtf.format(seconds, "second");
      if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
      if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
      return rtf.format(Math.round(seconds / 86400), "day");
    };
  }, [locale]);
}

function NotificationRow({
  n,
  onNavigate,
  relative,
  formatDate,
}: {
  n: AppNotification;
  onNavigate: () => void;
  relative: (iso: string) => string;
  formatDate: (iso: string) => string;
}) {
  const t = useTranslation();
  const dateSettings = useDateSettings();
  const Icon = TYPE_ICONS[n.type] ?? Bell;
  const { title, text } = describeNotification(n, t, (iso) => formatAppDate(iso, dateSettings, "date"));
  return (
    <li>
      <Link
        href={notificationHref(n)}
        onClick={onNavigate}
        className={cn(
          "flex gap-3 px-4 py-3 transition-colors hover:bg-control-hover focus-visible:bg-control-hover focus-visible:outline-none",
          n.unread && "bg-primary/[0.04]"
        )}
      >
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border",
            SEVERITY_CLASSES[n.severity] ?? SEVERITY_CLASSES.info
          )}
          aria-hidden="true"
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn("truncate text-sm", n.unread ? "font-semibold" : "font-medium")}>{title}</span>
            <time
              dateTime={n.createdAt}
              title={formatDate(n.createdAt)}
              className="shrink-0 text-xs text-muted-foreground"
            >
              {relative(n.createdAt)}
            </time>
          </span>
          <span className="mt-0.5 block break-words text-[13px] leading-snug text-muted-foreground">{text}</span>
        </span>
        {n.unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
      </Link>
    </li>
  );
}

/** Bell in the page header: unread count, and the latest findings of the checks in a panel. */
export function NotificationBell() {
  const ctx = useNotifications();
  const t = useTranslation();
  const dateSettings = useDateSettings();
  const relative = useRelativeTime();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ctx) return null;
  const { notifications, unreadCount, markAllRead, refresh } = ctx;
  const tn = t.notifications;
  const label = unreadCount > 0 ? `${tn.open} (${tn.unread.replace("{count}", String(unreadCount))})` : tn.open;
  const formatDate = (iso: string) => formatAppDate(iso, dateSettings);

  return (
    <div ref={rootRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void refresh();
        }}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-background"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label={tn.title}
          className="fixed inset-x-2 top-14 z-50 flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{tn.title}</p>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">{tn.unread.replace("{count}", String(unreadCount))}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
              <CheckCheck />
              {tn.markAllRead}
            </Button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Bell className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium">{tn.empty}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tn.emptyHint}</p>
            </div>
          ) : (
            <ul className="flex-1 divide-y overflow-y-auto">
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  relative={relative}
                  formatDate={formatDate}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 border-t px-4 py-2">
            <Link href="/timeline" onClick={() => setOpen(false)} className="text-[13px] text-primary underline-offset-4 hover:underline">
              {tn.viewTimeline}
            </Link>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="text-[13px] text-primary underline-offset-4 hover:underline">
              {tn.viewDashboard}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
