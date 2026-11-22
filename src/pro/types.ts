/**
 * Contracts between shared code and src/pro. The Community edition ships
 * community-stubs/src/pro instead, which must export the same names.
 */
export type LicenseSource = "database" | "environment" | "none";

export interface LicenseActivationProps {
  license: { edition: string } | null | undefined;
  licenseSource: LicenseSource;
  onSourceChange: (source: LicenseSource) => void;
  onLicenseChange: () => Promise<void> | void;
  toast: (message: string, variant: "success" | "error" | "info") => void;
}
