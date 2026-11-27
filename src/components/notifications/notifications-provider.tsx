"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { useDateSettings, useTranslation } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import type { TranslationKeys } from "@/i18n/de";

export interface AppNotification {
  id: string;
  type: "version_new" | "cve_new" | "kev_new" | "eol" | "check_failed" | string;
  severity: "info" | "warning" | "critical" | string;
  itemId: string | null;
  itemName: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  unread: boolean;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** null outside the protected layout (e.g. the full-screen overview): the bell then hides itself. */
export function useNotifications() {
  return useContext(NotificationsContext);
}

const POLL_MS = 60_000;
/** More than this many new findings at once: one summary toast instead of one each. */
const MAX_SINGLE_TOASTS = 3;
const WELCOME_TOAST_KEY = "bumpt_notifications_welcome_toast";

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry : entry && typeof entry === "object" ? str((entry as { name?: unknown }).name) : ""))
    .filter(Boolean);
}

function withMore(values: string[], total: number): string {
  const shown = values.join(", ");
  return total > values.length ? `${shown} +${total - values.length}` : shown;
}

/** Title (the item, or "Scheduled check") and one line of text, in the user's language. */
export function describeNotification(n: AppNotification, t: TranslationKeys, formatDate?: (iso: string) => string) {
  const tn = t.notifications;
  const d = n.data;
  const count = num(d.count);
  const cves = withMore(list(d.cveIds), count);
  let text = "";
  switch (n.type) {
    case "version_new":
      text = (d.major ? tn.versionMajor : tn.versionNew)
        .replace("{latest}", str(d.latestVersion))
        .replace("{current}", str(d.currentVersion) || "?");
      break;
    case "cve_new":
      text = (count > 1 ? tn.cveNewMany : tn.cveNewOne).replace("{count}", String(count)).replace("{cves}", cves);
      if (num(d.kevCount) > 0) text += ` · ${tn.cveKev.replace("{count}", String(num(d.kevCount)))}`;
      break;
    case "kev_new":
      text = (count > 1 ? tn.kevNewMany : tn.kevNewOne).replace("{count}", String(count)).replace("{cves}", cves);
      if (d.knownRansomware) text += ` · ${tn.ransomware}`;
      break;
    case "eol": {
      const date = str(d.eolDate);
      text = date ? tn.eol.replace("{date}", formatDate ? formatDate(date) : date.slice(0, 10)) : tn.eolNoDate;
      break;
    }
    case "check_failed": {
      const items = withMore(list(d.items), count);
      text = (count > 1 ? tn.checkFailedMany : tn.checkFailedOne)
        .replace("{count}", String(count))
        .replace("{total}", String(num(d.total)))
        .replace("{items}", items);
      break;
    }
    default:
      text = n.type;
  }
  return { title: n.itemName || tn.scheduledCheck, text };
}

/** Where a click on the finding leads. */
export function notificationHref(n: AppNotification): string {
  return n.type === "cve_new" || n.type === "kev_new" ? "/timeline" : "/dashboard";
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Newest createdAt already shown (or deliberately not toasted on first load).
  const cursorRef = useRef<string | null>(null);
  const tRef = useRef(t);
  tRef.current = t;
  const dateSettings = useDateSettings();
  const dateSettingsRef = useRef(dateSettings);
  dateSettingsRef.current = dateSettings;

  const announce = useCallback(
    (fresh: AppNotification[]) => {
      if (fresh.length === 0) return;
      const tr = tRef.current;
      if (fresh.length > MAX_SINGLE_TOASTS) {
        const critical = fresh.some((n) => n.severity === "critical");
        toast(tr.notifications.toastSummary.replace("{count}", String(fresh.length)), critical ? "error" : "info", {
          duration: 8000,
        });
        return;
      }
      // Oldest first, so the newest ends up at the bottom of the stack.
      for (const n of [...fresh].reverse()) {
        const { title, text } = describeNotification(n, tr, (iso) =>
          formatAppDate(iso, dateSettingsRef.current, "date")
        );
        toast(`${title} · ${text}`, n.severity === "critical" ? "error" : "info", {
          href: notificationHref(n),
          duration: 8000,
        });
      }
    },
    [toast]
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { notifications: AppNotification[]; unreadCount: number };
      const list = body.notifications ?? [];
      setNotifications(list);
      setUnreadCount(body.unreadCount ?? 0);

      const newest = list[0]?.createdAt ?? null;
      if (cursorRef.current === null) {
        // First load: no toast per finding, one reminder per browser session if some are unread.
        cursorRef.current = newest ?? new Date(0).toISOString();
        if ((body.unreadCount ?? 0) > 0 && !sessionStorage.getItem(WELCOME_TOAST_KEY)) {
          sessionStorage.setItem(WELCOME_TOAST_KEY, "1");
          toast(
            tRef.current.notifications.toastWhileAway.replace("{count}", String(body.unreadCount)),
            list.some((n) => n.unread && n.severity === "critical") ? "error" : "info",
            { duration: 8000 }
          );
        }
        return;
      }
      const cursor = cursorRef.current;
      const fresh = list.filter((n) => n.createdAt > cursor);
      if (newest && newest > cursor) cursorRef.current = newest;
      announce(fresh);
    } catch {
      // Offline or server restarting: try again at the next poll.
    } finally {
      setLoading(false);
    }
  }, [announce, toast]);

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await fetch("/api/notifications", { method: "POST" });
    } catch {
      // The next poll shows the real state.
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, refresh]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
