"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/config";

interface SsoStatus {
  saml: { enabled: boolean; buttonLabel?: string; imageUrl?: string };
  oidc: { enabled: boolean; buttonLabel?: string; imageUrl?: string };
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoStatus, setSsoStatus] = useState<SsoStatus | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslation();

  useEffect(() => {
    fetch("/api/auth/sso/status")
      .then((res) => res.json())
      .then((data) => setSsoStatus(data))
      .catch(() => {});

    const ssoError = searchParams.get("error");
    if (ssoError) {
      const errorMap: Record<string, string> = {
        sso_auth_failed: t.auth.ssoError,
        sso_no_email: t.auth.ssoNoEmail,
        sso_not_configured: t.auth.ssoNotConfigured,
        sso_invalid_response: t.auth.ssoError,
        sso_invalid_state: t.auth.ssoError,
      };
      setError(errorMap[ssoError] || t.auth.ssoError);
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        const redirect = searchParams.get("redirect") || "/dashboard";
        router.push(redirect);
        router.refresh();
      } else {
        setError(data.error || t.auth.loginError);
      }
    } catch {
      setError(t.auth.loginError);
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = (type: "saml" | "oidc") => {
    const redirect = searchParams.get("redirect") || "/dashboard";
    window.location.href = `/api/auth/${type}/login?redirect=${encodeURIComponent(redirect)}`;
  };

  const hasSso = ssoStatus && (ssoStatus.saml.enabled || ssoStatus.oidc.enabled);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Decorative background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          {/* Logo & branding */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <svg viewBox="0 0 64 64" className="h-9 w-9">
                <path
                  fillRule="evenodd"
                  d="M20 4L8 18h6v38a4 4 0 004 4h14C46 60 54 52 54 44 54 36 46 28 32 28h-6V18h6ZM26 35h6c6 0 10 4 10 9s-4 9-10 9h-6V35z"
                  className="fill-primary"
                />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight">
                bum<span className="text-primary">.</span>pt
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.auth.loginSubtitle}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                placeholder={t.auth.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="flex h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                placeholder={t.auth.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="flex h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <Button type="submit" className="w-full h-10 font-semibold" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {loading ? t.common.loading : t.auth.loginButton}
            </Button>
          </form>

          {/* SSO */}
          {hasSso && (
            <div className="mt-6 space-y-4">
              <div className="relative flex items-center">
                <div className="flex-grow border-t" />
                <span className="mx-3 flex-shrink text-xs text-muted-foreground uppercase tracking-wider">
                  {t.auth.orContinueWith}
                </span>
                <div className="flex-grow border-t" />
              </div>

              <div className="flex flex-col gap-2">
                {ssoStatus?.saml.enabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10"
                    onClick={() => handleSsoLogin("saml")}
                  >
                    {ssoStatus.saml.imageUrl ? (
                      <img
                        src={ssoStatus.saml.imageUrl}
                        alt=""
                        className="h-5 w-5 mr-2 object-contain"
                      />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    {ssoStatus.saml.buttonLabel || t.auth.ssoDefaultSaml}
                  </Button>
                )}

                {ssoStatus?.oidc.enabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-10"
                    onClick={() => handleSsoLogin("oidc")}
                  >
                    {ssoStatus.oidc.imageUrl ? (
                      <img
                        src={ssoStatus.oidc.imageUrl}
                        alt=""
                        className="h-5 w-5 mr-2 object-contain"
                      />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    {ssoStatus.oidc.buttonLabel || t.auth.ssoDefaultOidc}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Update Monitoring Dashboard
        </p>
      </div>
    </div>
  );
}
