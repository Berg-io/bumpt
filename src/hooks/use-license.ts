"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  createElement,
} from "react";

export interface LicenseStatus {
  edition: "community" | "professional";
  valid: boolean;
  maxItems: number;
  currentItems: number;
  ssoEnabled: boolean;
  apiKeysEnabled: boolean;
  aiEnabled: boolean;
  webhooksEnabled: boolean;
  reportsEnabled: boolean;
  expiresAt: string | null;
  message: string | null;
}

interface LicenseContextValue {
  license: LicenseStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_LICENSE: LicenseStatus = {
  edition: "community",
  valid: true,
  maxItems: 25,
  currentItems: 0,
  ssoEnabled: false,
  apiKeysEnabled: false,
  aiEnabled: false,
  webhooksEnabled: false,
  reportsEnabled: false,
  expiresAt: null,
  message: null,
};

const LicenseContext = createContext<LicenseContextValue>({
  license: null,
  loading: true,
  refresh: async () => {},
});

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/license");
      if (res.ok) {
        setLicense(await res.json());
      } else {
        setLicense(DEFAULT_LICENSE);
      }
    } catch {
      setLicense(DEFAULT_LICENSE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return createElement(
    LicenseContext.Provider,
    { value: { license, loading, refresh } },
    children
  );
}

export function useLicense() {
  return useContext(LicenseContext);
}
