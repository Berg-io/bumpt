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
  ChevronRight,
  History,
  Server,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useLicense } from "@/hooks/use-license";
import { useTranslation } from "@/i18n/config";
import { ROUTE_ROLES } from "@/lib/route-access";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  licenseFeature?: "reportsEnabled" | "webhooksEnabled" | "apiKeysEnabled" | "ssoEnabled" | "aiEnabled";
  /** Shown only with a valid Professional license. */
  professionalOnly?: boolean;
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
      href: "/timeline",
      label: t.nav.timeline,
      icon: <History className="h-5 w-5" />,
    },
    {
      href: "/admin/items",
      label: t.nav.items,
      icon: <Package className="h-5 w-5" />,
      roles: ROUTE_ROLES["/admin/items"],
    },
    {
      href: "/admin/sources",
      label: t.nav.sources,
      icon: <Plug className="h-5 w-5" />,
      roles: ROUTE_ROLES["/admin/sources"],
    },
    {
      href: "/admin/agents",
      label: t.nav.agents,
      icon: <Server className="h-5 w-5" />,
      roles: ROUTE_ROLES["/admin/agents"],
      professionalOnly: true,
    },
    {
      href: "/admin/users",
      label: t.nav.users,
      icon: <Users className="h-5 w-5" />,
      roles: ROUTE_ROLES["/admin/users"],
    },
    {
      href: "/admin/logs",
      label: t.nav.logs,
      icon: <FileText className="h-5 w-5" />,
      roles: ROUTE_ROLES["/admin/logs"],
    },
    {
      href: "/admin/reports",
      label: t.nav.reports,
      icon: <Calendar className="h-5 w-5" />,
      roles: ROUTE_ROLES["/admin/reports"],
      licenseFeature: "reportsEnabled",
    },
    {
      href: "/admin/settings",
      label: t.nav.settings,
      icon: <Settings className="h-5 w-5" />,
      roles: ROUTE_ROLES["/admin/settings"],
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (item.roles && (!user || !item.roles.includes(user.role))) return false;
    if (item.licenseFeature && !license?.[item.licenseFeature]) return false;
    if (item.professionalOnly && !(license?.valid && license.edition === "professional")) return false;
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

      <div className="border-t p-3 space-y-1">
        {user && (
          <Link
            href="/account"
            onClick={() => setMobileOpen(false)}
            aria-label={t.nav.account}
            title={`${t.nav.account} · ${user.email}`}
            aria-current={isActive("/account") ? "page" : undefined}
            className={cn(
              "group flex items-center rounded-md py-2 transition-colors",
              showLabels ? "gap-3 px-3" : "justify-center px-2",
              isActive("/account") ? "bg-accent text-primary" : "hover:bg-accent"
            )}
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary"
            >
              {user.email.slice(0, 2)}
            </span>
            {showLabels && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user.email}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t.users.roles[user.role as keyof typeof t.users.roles] || user.role}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Link>
        )}
        <button
          onClick={logout}
          title={showLabels ? undefined : t.auth.logout}
          aria-label={t.auth.logout}
          className={cn(
            "flex w-full items-center rounded-md py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer",
            showLabels ? "gap-3 px-3" : "justify-center px-2.5"
          )}
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
          aria-label={t.nav.openMenu}
          aria-expanded={false}
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
          aria-label={t.common.close}
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
          aria-label={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
          title={collapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
          className="absolute -right-3 top-14 z-40 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
        >
          <span className="text-xs">{collapsed ? "→" : "←"}</span>
        </button>
      </div>
    </>
  );
}
