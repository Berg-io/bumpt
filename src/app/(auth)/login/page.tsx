"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { I18nProvider } from "@/components/i18n-provider";

export default function LoginPage() {
  return (
    <I18nProvider>
      <Suspense>
        <LoginForm />
      </Suspense>
    </I18nProvider>
  );
}
