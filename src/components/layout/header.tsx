"use client";

import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-2 lg:px-8">
      <div className="min-w-0 pl-12 lg:pl-0">
        <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
