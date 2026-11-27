"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Info, Moon, Sun, Crown, type LucideIcon } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { EDITION } from "@/pro/edition";
import { cn } from "@/utils/cn";

/** True in the Professional build. The Community build ships without the Pro doc pages. */
export const IS_PRO_EDITION = (EDITION as string) === "pro";

/** Theme toggle shared by the documentation pages (same storage key as the app). */
export function useDocsTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (stored === "system" && prefersDark) || (!stored && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return { isDark, toggleTheme };
}

export function DocsThemeToggle() {
  const { isDark, toggleTheme } = useDocsTheme();
  return (
    <IconButton
      icon={isDark ? Sun : Moon}
      label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
    />
  );
}

interface DocsLink {
  href: string;
  label: string;
  /** Professional-only page: hidden in the Community build. */
  pro?: boolean;
}

export const DOCS_LINKS: DocsLink[] = [
  { href: "/docs/guide", label: "User guide" },
  { href: "/docs/scoring", label: "Risk scoring" },
  { href: "/docs/agent", label: "Agent", pro: true },
  { href: "/docs/api", label: "REST API", pro: true },
  { href: "/docs/mcp", label: "MCP", pro: true },
];

export function DocsHeader({ title, icon: Icon, current }: { title: string; icon?: LucideIcon; current?: string }) {
  const links = DOCS_LINKS.filter((link) => (IS_PRO_EDITION || !link.pro) && link.href !== current);
  return (
    <header className="sticky top-0 z-10 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2 lg:px-8">
      <div className="flex items-center gap-3">
        {current && (
          <a
            href="/docs"
            className="inline-grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
            aria-label="Back to docs"
            title="Back to docs"
          >
            <ArrowLeft className="size-4" />
          </a>
        )}
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <span className="font-semibold text-sm">{title}</span>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-1" aria-label="Documentation">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-control-hover transition-colors"
          >
            {link.label}
          </a>
        ))}
        <a
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-control-hover transition-colors"
        >
          Dashboard
        </a>
        <DocsThemeToggle />
      </nav>
    </header>
  );
}

export function DocsSection({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DocsCallout({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "pro" }) {
  const IconCmp = tone === "pro" ? Crown : Info;
  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-sm",
        tone === "pro" ? "border-amber-500/30 bg-amber-500/5" : "bg-card text-muted-foreground"
      )}
    >
      <p className="flex items-start gap-2">
        <IconCmp
          className={cn("h-4 w-4 mt-0.5 shrink-0", tone === "pro" ? "text-amber-600 dark:text-amber-400" : "text-primary")}
        />
        <span>{children}</span>
      </p>
    </div>
  );
}

export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
      <Crown className="h-3 w-3" /> Professional
    </span>
  );
}

/** Table of contents shown at the top of the long pages. */
export function DocsToc({ entries }: { entries: Array<{ id: string; label: string }> }) {
  return (
    <nav aria-label="On this page" className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">On this page</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a href={`#${entry.id}`} className="text-primary hover:underline">
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Inline code. */
export function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

/** Pre-formatted shell or config snippet without JSON highlighting. */
export function Snippet({ children, label }: { children: string; label?: string }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      {label && <div className="border-b bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">{label}</div>}
      <pre className="overflow-x-auto bg-muted/20 p-4 text-xs leading-relaxed font-mono">{children}</pre>
    </div>
  );
}
