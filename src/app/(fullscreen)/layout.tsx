"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/components/i18n-provider";

function FullscreenContent({ children }: { children: React.ReactNode }) {
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
    <main className="h-screen">{children}</main>
  );
}

export default function FullscreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <I18nProvider>
        <ToastProvider>
          <FullscreenContent>{children}</FullscreenContent>
        </ToastProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
