"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { LicenseProvider } from "@/hooks/use-license";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { canAccessPath } from "@/lib/route-access";
import { useTranslation } from "@/i18n/config";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LicenseBanner } from "@/components/license-banner";
import { I18nProvider } from "@/components/i18n-provider";
import { ReleaseBadge } from "@/components/layout/release-badge";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const t = useTranslation();
  const allowed = !user || canAccessPath(pathname, user.role);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // A page the role may not use: one consistent answer, whatever the page.
  useEffect(() => {
    if (!loading && user && !allowed) {
      toast(t.common.accessDenied, "error");
      router.replace("/dashboard");
    }
  }, [loading, user, allowed, router, toast, t.common.accessDenied]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !allowed) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <LicenseBanner />
        <main className="flex flex-1 flex-col">{children}</main>
        <ReleaseBadge />
      </div>
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <I18nProvider>
        <LicenseProvider>
          <ToastProvider>
            <NotificationsProvider>
              <ProtectedContent>{children}</ProtectedContent>
            </NotificationsProvider>
          </ToastProvider>
        </LicenseProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
