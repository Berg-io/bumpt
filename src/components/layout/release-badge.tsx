"use client";

import pkg from "../../../package.json";
import { useLicense } from "@/hooks/use-license";

export function ReleaseBadge() {
  const { license } = useLicense();
  const edition = license?.edition === "professional" ? "pro" : "community";
  const version = typeof pkg.version === "string" ? pkg.version : "0.0.0";

  return (
    <div className="w-full flex justify-end px-3 pb-2 mt-2" aria-hidden="true">
      <span className="pointer-events-none text-[10px] text-muted-foreground/35 select-none">
        {edition}/v{version}
      </span>
    </div>
  );
}
