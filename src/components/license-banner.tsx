"use client";

import { AlertTriangle, Crown } from "lucide-react";
import { useLicense } from "@/hooks/use-license";
import { useTranslation } from "@/i18n/config";

export function LicenseBanner() {
  const { license, loading } = useLicense();
  const t = useTranslation();

  if (loading || !license) return null;

  const isPro = license.edition === "professional";
  const isExpired =
    license.expiresAt && new Date(license.expiresAt) < new Date();
  const isNearLimit =
    !isPro &&
    license.maxItems > 0 &&
    license.currentItems >= license.maxItems * 0.8;
  const isAtLimit =
    !isPro &&
    license.maxItems > 0 &&
    license.currentItems >= license.maxItems;

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-amber-800 dark:text-amber-200">
          {t.license.expired}{" "}
          <a
            href="https://bum.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            {t.license.renew}
          </a>
        </span>
      </div>
    );
  }

  if (isAtLimit) {
    return (
      <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-amber-800 dark:text-amber-200">
          {t.license.limitReached
            .replace("{current}", String(license.currentItems))
            .replace("{max}", String(license.maxItems))}{" "}
          <a
            href="https://bum.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            {t.license.upgrade}
          </a>
        </span>
      </div>
    );
  }

  if (isNearLimit) {
    return (
      <div className="flex items-center gap-3 border-b border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm">
        <Crown className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="text-blue-700 dark:text-blue-300">
          {t.license.nearLimit
            .replace("{current}", String(license.currentItems))
            .replace("{max}", String(license.maxItems))}{" "}
          <a
            href="https://bum.pt"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            {t.license.upgrade}
          </a>
        </span>
      </div>
    );
  }

  return null;
}
