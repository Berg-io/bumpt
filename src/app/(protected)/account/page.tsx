"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/config";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/use-auth";

interface MfaSetup {
  secret: string;
  qrCode: string;
}

export default function AccountPage() {
  const t = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [authType, setAuthType] = useState<string>("local");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/mfa");
      if (res.ok) {
        const data = await res.json();
        setMfaEnabled(Boolean(data.enabled));
        setAuthType(data.authType || "local");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError(t.account.passwordMismatch);
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(data.error || t.common.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast(t.account.passwordChanged, "success");
    } finally {
      setSavingPassword(false);
    }
  };

  const mfaAction = async (action: "setup" | "enable" | "disable") => {
    setMfaError("");
    setMfaBusy(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMfaError(action === "setup" ? data.error || t.common.error : t.account.invalidCode);
        return;
      }
      if (action === "setup") {
        setSetup({ secret: data.secret, qrCode: data.qrCode });
        setCode("");
      } else if (action === "enable") {
        setMfaEnabled(true);
        setSetup(null);
        setCode("");
        toast(t.account.mfaActivated, "success");
      } else {
        setMfaEnabled(false);
        setCode("");
        toast(t.account.mfaDeactivated, "success");
      }
    } finally {
      setMfaBusy(false);
    }
  };

  const isLocal = authType === "local";

  return (
    <>
      <Header title={t.account.title} subtitle={user?.email ?? t.account.subtitle} />
      <div className="grid flex-1 content-start items-start gap-6 p-4 lg:p-8 xl:grid-cols-2 xl:max-w-6xl">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{t.account.passwordTitle}</h2>
            </div>
            {!loading && !isLocal ? (
              <p className="text-sm text-muted-foreground">{t.account.passwordSsoManaged}</p>
            ) : (
              <form onSubmit={changePassword} className="space-y-3">
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  label={t.account.currentPassword}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  label={t.account.newPassword}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <p className="-mt-1 text-xs text-muted-foreground">{t.users.passwordHint}</p>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  label={t.account.confirmPassword}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                  error={passwordError || undefined}
                />
                <Button type="submit" size="sm" disabled={savingPassword}>
                  {t.account.savePassword}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {isLocal && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">{t.account.mfaTitle}</h2>
                </div>
                {!loading && (
                  <Badge variant={mfaEnabled ? "default" : "outline"}>
                    {mfaEnabled ? t.account.mfaEnabled : t.account.mfaDisabled}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t.account.mfaDescription}</p>

              {!mfaEnabled && !setup && (
                <Button size="sm" onClick={() => mfaAction("setup")} disabled={mfaBusy || loading}>
                  {t.account.mfaSetup}
                </Button>
              )}

              {!mfaEnabled && setup && (
                <div className="space-y-3">
                  <p className="text-sm">{t.account.mfaScan}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setup.qrCode} alt="QR code" width={220} height={220} className="rounded-md border bg-white p-2" />
                  <div className="flex items-center gap-2">
                    <code className="block min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 text-sm">{setup.secret}</code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(setup.secret);
                          toast(t.account.mfaKeyCopied, "success");
                        } catch {
                          toast(t.common.error, "error");
                        }
                      }}
                    >
                      {t.account.mfaCopyKey}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.account.mfaRecoveryHint}</p>
                  <Input
                    id="mfa-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    label={t.auth.mfaCode}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    error={mfaError || undefined}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => mfaAction("enable")} disabled={mfaBusy || code.length < 6}>
                      {t.account.mfaConfirm}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSetup(null);
                        setCode("");
                      }}
                      disabled={mfaBusy}
                    >
                      {t.common.cancel}
                    </Button>
                  </div>
                </div>
              )}

              {mfaEnabled && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t.account.mfaDisableHint}</p>
                  <Input
                    id="mfa-disable-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    label={t.auth.mfaCode}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    error={mfaError || undefined}
                  />
                  <Button size="sm" variant="outline" onClick={() => mfaAction("disable")} disabled={mfaBusy || code.length < 6}>
                    {t.account.mfaDisable}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
