"use client";

import { createContext, useContext, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  href?: string;
}

export interface ToastOptions {
  /** Makes the message a link (e.g. to the page that shows the finding). */
  href?: string;
  /** Milliseconds before the toast goes away. Default 4000. */
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"], options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info", options?: ToastOptions) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, href: options?.href }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, options?.duration ?? 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm",
              "animate-in slide-in-from-right-full",
              t.type === "success" && "border-success/30 bg-success/10 text-success",
              t.type === "error" && "border-critical/30 bg-critical/10 text-critical",
              t.type === "info" && "border-primary/30 bg-primary/10 text-primary"
            )}
          >
            {t.type === "success" && <CheckCircle className="h-4 w-4 shrink-0" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
            {t.type === "info" && <Info className="h-4 w-4 shrink-0" />}
            {t.href ? (
              <Link href={t.href} onClick={() => dismiss(t.id)} className="text-sm underline-offset-2 hover:underline">
                {t.message}
              </Link>
            ) : (
              <span className="text-sm">{t.message}</span>
            )}
            <button onClick={() => dismiss(t.id)} className="ml-2 shrink-0">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
