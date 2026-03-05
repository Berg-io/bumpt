"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  Plug,
  Settings,
  ArrowUpCircle,
  Calendar,
  BookOpen,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useLicense } from "@/hooks/use-license";
import { useTranslation } from "@/i18n/config";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  licenseFeature?: "reportsEnabled" | "webhooksEnabled" | "apiKeysEnabled" | "ssoEnabled" | "aiEnabled";
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { license } = useLicense();
  const t = useTranslation();

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: t.nav.dashboard,
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: "/admin/items",
      label: t.nav.items,
      icon: <Package className="h-5 w-5" />,
    },
    {
      href: "/admin/sources",
      label: t.nav.sources,
      icon: <Plug className="h-5 w-5" />,
    },
    {
      href: "/admin/users",
      label: t.nav.users,
      icon: <Users className="h-5 w-5" />,
      roles: ["SUPER_ADMIN"],
    },
    {
      href: "/admin/logs",
      label: t.nav.logs,
      icon: <FileText className="h-5 w-5" />,
    },
    {
      href: "/admin/reports",
      label: t.nav.reports,
      icon: <Calendar className="h-5 w-5" />,
      roles: ["SUPER_ADMIN"],
      licenseFeature: "reportsEnabled",
    },
    {
      href: "/admin/settings",
      label: t.nav.settings,
      icon: <Settings className="h-5 w-5" />,
      roles: ["SUPER_ADMIN"],
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (item.roles && (!user || !item.roles.includes(user.role))) return false;
    if (item.licenseFeature && !license?.[item.licenseFeature]) return false;
    return true;
  });

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const renderSidebarContent = (showLabels: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <ArrowUpCircle className="h-7 w-7 text-primary shrink-0" />
        {showLabels && (
          <span className="text-lg font-bold tracking-tight">bum.pt</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {filteredItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center rounded-md py-2.5 text-sm font-medium transition-colors",
              showLabels ? "gap-3 px-3" : "justify-center px-2.5",
              isActive(item.href)
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-primary"
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {item.icon}
            </span>
            {showLabels && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-1">
        <Link
          href="/docs"
          target="_blank"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center rounded-md py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            showLabels ? "gap-3 px-3" : "justify-center px-2.5"
          )}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </span>
          {showLabels && <span>{t.nav.docs}</span>}
        </Link>
      </div>

      <div className="border-t p-3">
        {showLabels && user && (
          <div className="mb-2 px-3 py-1">
            <p className="text-sm font-medium truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          {showLabels && <span>{t.auth.logout}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle - visible only when sidebar is closed */}
      {!mobileOpen && (
        <button
          className="fixed left-4 top-4 z-50 rounded-md border p-2 shadow-sm lg:hidden"
          style={{ backgroundColor: "hsl(var(--background))" }}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(16rem,85vw)] border-r shadow-xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "hsl(var(--background))" }}
      >
        <button
          className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        {renderSidebarContent(true)}
      </aside>

      {/* Desktop sidebar */}
      <div
        className={cn(
          "relative hidden transition-all lg:block",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <aside className="flex h-full flex-col border-r bg-background">
          {renderSidebarContent(!collapsed)}
        </aside>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-14 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
        >
          <span className="text-xs">{collapsed ? "→" : "←"}</span>
        </button>
      </div>
    </>
  );
}
