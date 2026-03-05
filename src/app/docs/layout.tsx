"use client";

import { LicenseProvider } from "@/hooks/use-license";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <LicenseProvider>{children}</LicenseProvider>;
}
