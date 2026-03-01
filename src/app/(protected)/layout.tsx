"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { LicenseProvider } from "@/hooks/use-license";
import { ToastProvider } from "@/components/ui/toast";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LicenseBanner } from "@/components/license-banner";
import { I18nProvider } from "@/components/i18n-provider";
import { ReleaseBadge } from "@/components/layout/release-badge";

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

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
            <ProtectedContent>{children}</ProtectedContent>
          </ToastProvider>
        </LicenseProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
