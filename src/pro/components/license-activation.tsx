"use client";

import type { LicenseActivationProps } from "@/pro/types";

/** Community edition: license keys are used with the Professional image only. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function LicenseActivation(_props: LicenseActivationProps) {
  return (
    <div className="border-t pt-6 space-y-3">
      <p className="text-sm text-muted-foreground">
        License activation is not available in this repository.
      </p>
    </div>
  );
}
