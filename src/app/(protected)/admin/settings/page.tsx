"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useTranslation, useLocale, useDateSettings, SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/config";
import { formatAppDate } from "@/lib/format-date";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/use-auth";
import { useLicense } from "@/hooks/use-license";
import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import {
  Key,
  Shield,
  Globe,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Database,
  Download,
  Upload,
  Trash2,
  HardDrive,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Copy,
  Check,
  ExternalLink,
  Crown,
  Bot,
  Server,
  Bell,
  Plus,
  Send,
} from "lucide-react";

type Tab = "apiKeys" | "sso" | "general" | "database" | "csvData" | "ai" | "notifications" | "license";

const COMMON_TIMEZONES = [
  "UTC",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Zurich",
  "Europe/Rome", "Europe/Madrid", "Europe/Amsterdam", "Europe/Brussels",
  "Europe/Vienna", "Europe/Warsaw", "Europe/Prague", "Europe/Budapest",
  "Europe/Bucharest", "Europe/Athens", "Europe/Helsinki", "Europe/Moscow",
  "Europe/Istanbul",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
  "America/Mexico_City", "America/Toronto", "America/Vancouver",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Singapore",
  "Asia/Seoul", "Asia/Kolkata", "Asia/Dubai", "Asia/Tehran",
  "Asia/Riyadh", "Asia/Bangkok", "Asia/Jakarta",
  "Australia/Sydney", "Australia/Melbourne",
  "Pacific/Auckland", "Pacific/Honolulu",
  "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos",
];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD.MM.YYYY"];

function formatTzLabel(tz: string): string {
  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const local = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const diff = (local.getTime() - utc.getTime()) / 60000;
    const sign = diff >= 0 ? "+" : "-";
    const h = String(Math.floor(Math.abs(diff) / 60)).padStart(2, "0");
    const m = String(Math.abs(diff) % 60).padStart(2, "0");
    return `(UTC${sign}${h}:${m}) ${tz.replace(/_/g, " ")}`;
  } catch {
    return tz;
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { result.push(field); field = ""; }
      else field += ch;
    }
  }
  result.push(field);
  return result;
}

export default function SettingsPage() {
  const t = useTranslation();
  const { locale, setLocale } = useLocale();
  const { user } = useAuth();
  const { license, refresh: refreshLicense } = useLicense();
  const dateSettings = useDateSettings();
  const { toast: addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasValues, setHasValues] = useState<Record<string, boolean>>({});

  const [githubToken, setGithubToken] = useState("");
  const [gitlabToken, setGitlabToken] = useState("");
  const [bitbucketToken, setBitbucketToken] = useState("");
  const [wingetApiKey, setWingetApiKey] = useState("");
  const [nvdApiKey, setNvdApiKey] = useState("");
  const [librariesIoApiKey, setLibrariesIoApiKey] = useState("");
  const [vulndbClientId, setVulndbClientId] = useState("");
  const [vulndbClientSecret, setVulndbClientSecret] = useState("");
  const [cveEnrichmentEnabled, setCveEnrichmentEnabled] = useState(true);

  const [aiProvider, setAiProvider] = useState("none");
  const [aiEnrichmentEnabled, setAiEnrichmentEnabled] = useState(true);
  const [aiOpenaiKey, setAiOpenaiKey] = useState("");
  const [aiOpenaiModel, setAiOpenaiModel] = useState("");
  const [aiAnthropicKey, setAiAnthropicKey] = useState("");
  const [aiAnthropicModel, setAiAnthropicModel] = useState("");
  const [aiMistralKey, setAiMistralKey] = useState("");
  const [aiMistralModel, setAiMistralModel] = useState("");
  const [aiSelfHostedUrl, setAiSelfHostedUrl] = useState("");
  const [aiSelfHostedKey, setAiSelfHostedKey] = useState("");
  const [aiSelfHostedModel, setAiSelfHostedModel] = useState("");
  const [showAiKey, setShowAiKey] = useState(false);

  const [samlEnabled, setSamlEnabled] = useState(false);
  const [samlEntityId, setSamlEntityId] = useState("");
  const [samlSsoUrl, setSamlSsoUrl] = useState("");
  const [samlCertificate, setSamlCertificate] = useState("");
  const [samlCallbackUrl, setSamlCallbackUrl] = useState("");
  const [samlButtonLabel, setSamlButtonLabel] = useState("");
  const [samlImageUrl, setSamlImageUrl] = useState("");

  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcClientId, setOidcClientId] = useState("");
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [oidcIssuer, setOidcIssuer] = useState("");
  const [oidcCallbackUrl, setOidcCallbackUrl] = useState("");
  const [oidcScope, setOidcScope] = useState("openid profile email");
  const [oidcButtonLabel, setOidcButtonLabel] = useState("");
  const [oidcImageUrl, setOidcImageUrl] = useState("");
  const [showOidcSecret, setShowOidcSecret] = useState(false);

  const [appLanguage, setAppLanguage] = useState(locale);
  const [appTimezone, setAppTimezone] = useState("Europe/Zurich");
  const [appDateFormat, setAppDateFormat] = useState("DD.MM.YYYY");
  const [appTimeFormat, setAppTimeFormat] = useState("24h");

  const [dbType, setDbType] = useState("sqlite");
  const [dbHost, setDbHost] = useState("");
  const [dbPort, setDbPort] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbSsl, setDbSsl] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);

  const [dbInfo, setDbInfo] = useState<{
    type: string;
    url: string;
    fileSize: number | null;
    tables: Record<string, number>;
  } | null>(null);
  const [dbActionLoading, setDbActionLoading] = useState<string | null>(null);
  const [wipeConfirmInput, setWipeConfirmInput] = useState("");
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showGitlabToken, setShowGitlabToken] = useState(false);
  const [showBitbucketToken, setShowBitbucketToken] = useState(false);
  const [showWingetKey, setShowWingetKey] = useState(false);
  const [showNvdKey, setShowNvdKey] = useState(false);
  const [showLibrariesIoKey, setShowLibrariesIoKey] = useState(false);
  const [showVulndbId, setShowVulndbId] = useState(false);
  const [showVulndbSecret, setShowVulndbSecret] = useState(false);

  const [csvEntries, setCsvEntries] = useState<{ id: string; name: string; version: string; uploadedAt: string }[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [showCsvClearConfirm, setShowCsvClearConfirm] = useState(false);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);

  // Webhooks / Notifications state
  interface WebhookData {
    id: string;
    name: string;
    url: string;
    type: string;
    events: string;
    headers: string;
    secret: string | null;
    enabled: boolean;
    fromEnv: boolean;
    _count?: { logs: number };
  }
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [webhookForm, setWebhookForm] = useState({ name: "", url: "", type: "custom", events: [] as string[], headers: "{}", secret: "", enabled: true });
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpTestRecipient, setSmtpTestRecipient] = useState("");
  const [smtpTesting, setSmtpTesting] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [apiKeys, setApiKeys] = useState<{
    id: string; name: string; keyPrefix: string; userId: string; userEmail: string;
    role: string; expiresAt: string | null; lastUsedAt: string | null;
    createdAt: string; revokedAt: string | null;
  }[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState<number | null>(null);
  const [newKeyRole, setNewKeyRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [licenseSource, setLicenseSource] = useState<"database" | "environment" | "none">("none");

  const loadDatabaseInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/database");
      if (res.ok) {
        const data = await res.json();
        setDbInfo(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  const loadCsvData = useCallback(async () => {
    setCsvLoading(true);
    try {
      const res = await fetch("/api/csv-data");
      if (res.ok) {
        const data = await res.json();
        setCsvEntries(data.entries || []);
      }
    } catch {
      // silently fail
    } finally {
      setCsvLoading(false);
    }
  }, []);

  const loadApiKeys = useCallback(async () => {
    setApiKeysLoading(true);
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setApiKeysLoading(false);
    }
  }, []);

  const loadWebhooks = useCallback(async () => {
    setWebhooksLoading(true);
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.data || []);
      }
    } catch { /* silently fail */ }
    finally { setWebhooksLoading(false); }

    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings as Record<string, string>;
        setSmtpConfigured(s.smtp_configured === "true" || !!s.smtp_host);
      }
    } catch { /* silently fail */ }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      const s = data.settings as Record<string, string>;
      setHasValues(data.hasValues || {});

      setGithubToken(s.github_token || "");
      setGitlabToken(s.gitlab_token || "");
      setBitbucketToken(s.bitbucket_token || "");
      setWingetApiKey(s.winget_api_key || "");
      setNvdApiKey(s.nvd_api_key || "");
      setLibrariesIoApiKey(s.libraries_io_api_key || "");
      setVulndbClientId(s.vulndb_client_id || "");
      setVulndbClientSecret(s.vulndb_client_secret || "");
      setCveEnrichmentEnabled(s.cve_enrichment_enabled !== "false");
      setAiProvider(s.ai_provider || "none");
      setAiEnrichmentEnabled(s.ai_enrichment_enabled !== "false");
      setAiOpenaiKey(s.ai_openai_key || "");
      setAiOpenaiModel(s.ai_openai_model || "");
      setAiAnthropicKey(s.ai_anthropic_key || "");
      setAiAnthropicModel(s.ai_anthropic_model || "");
      setAiMistralKey(s.ai_mistral_key || "");
      setAiMistralModel(s.ai_mistral_model || "");
      setAiSelfHostedUrl(s.ai_self_hosted_url || "");
      setAiSelfHostedKey(s.ai_self_hosted_key || "");
      setAiSelfHostedModel(s.ai_self_hosted_model || "");
      setSamlEnabled(s.saml_enabled === "true");
      setSamlEntityId(s.saml_entity_id || "");
      setSamlSsoUrl(s.saml_sso_url || "");
      setSamlCertificate(s.saml_certificate || "");
      setSamlCallbackUrl(s.saml_callback_url || "");
      setSamlButtonLabel(s.saml_button_label || "");
      setSamlImageUrl(s.saml_image_url || "");
      setOidcEnabled(s.oidc_enabled === "true");
      setOidcClientId(s.oidc_client_id || "");
      setOidcClientSecret(s.oidc_client_secret || "");
      setOidcIssuer(s.oidc_issuer || "");
      setOidcCallbackUrl(s.oidc_callback_url || "");
      setOidcScope(s.oidc_scope || "openid profile email");
      setOidcButtonLabel(s.oidc_button_label || "");
      setOidcImageUrl(s.oidc_image_url || "");
      setSmtpConfigured(s.smtp_configured === "true" || !!s.smtp_host);
      setSmtpHost(s.smtp_host || "");
      setSmtpPort(s.smtp_port || "587");
      setSmtpSecure(s.smtp_secure === "true");
      setSmtpUser(s.smtp_user || "");
      setSmtpPassword(s.smtp_password || "");
      setSmtpFrom(s.smtp_from || "");
      setAppLanguage((s.app_language || "de") as SupportedLocale);
      setAppTimezone(s.app_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      setAppDateFormat(s.app_date_format || "DD.MM.YYYY");
      setAppTimeFormat(s.app_time_format || "24h");
      setDbType(s.db_type || "sqlite");
      setDbHost(s.db_host || "");
      setDbPort(s.db_port || "");
      setDbName(s.db_name || "");
      setDbUser(s.db_user || "");
      setDbPassword(s.db_password || "");
      setDbSsl(s.db_ssl === "true");
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLicenseSource = useCallback(async () => {
    try {
      const res = await fetch("/api/license");
      if (res.ok) {
        const data = await res.json();
        setLicenseSource(data.source || "none");
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    loadSettings();
    loadDatabaseInfo();
    loadCsvData();
    loadApiKeys();
    loadWebhooks();
    loadLicenseSource();
  }, [loadSettings, loadDatabaseInfo, loadCsvData, loadApiKeys, loadWebhooks, loadLicenseSource]);

  useEffect(() => {
    if (user?.email && !smtpTestRecipient) {
      setSmtpTestRecipient(user.email);
    }
  }, [user?.email, smtpTestRecipient]);

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  const saveSettings = async (entries: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: entries }),
      });

      if (res.ok) {
        addToast(t.settings.saved, "success");
        await loadSettings();
      } else {
        addToast(t.settings.saveError, "error");
      }
    } catch {
      addToast(t.settings.saveError, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiKeys = () => {
    const entries: Record<string, string> = {};
    if (githubToken !== "***") entries.github_token = githubToken;
    if (gitlabToken !== "***") entries.gitlab_token = gitlabToken;
    if (bitbucketToken !== "***") entries.bitbucket_token = bitbucketToken;
    if (wingetApiKey !== "***") entries.winget_api_key = wingetApiKey;
    if (nvdApiKey !== "***") entries.nvd_api_key = nvdApiKey;
    if (librariesIoApiKey !== "***") entries.libraries_io_api_key = librariesIoApiKey;
    if (vulndbClientId !== "***") entries.vulndb_client_id = vulndbClientId;
    if (vulndbClientSecret !== "***") entries.vulndb_client_secret = vulndbClientSecret;
    entries.cve_enrichment_enabled = cveEnrichmentEnabled ? "true" : "false";
    if (Object.keys(entries).length > 0) saveSettings(entries);
  };

  const handleSaveSaml = () => {
    const entries: Record<string, string> = {
      saml_enabled: samlEnabled ? "true" : "false",
      saml_entity_id: samlEntityId,
      saml_sso_url: samlSsoUrl,
      saml_callback_url: samlCallbackUrl,
      saml_button_label: samlButtonLabel,
      saml_image_url: samlImageUrl,
    };
    if (samlCertificate !== "***") entries.saml_certificate = samlCertificate;
    saveSettings(entries);
  };

  const handleSaveOidc = () => {
    const entries: Record<string, string> = {
      oidc_enabled: oidcEnabled ? "true" : "false",
      oidc_client_id: oidcClientId,
      oidc_issuer: oidcIssuer,
      oidc_callback_url: oidcCallbackUrl,
      oidc_scope: oidcScope,
      oidc_button_label: oidcButtonLabel,
      oidc_image_url: oidcImageUrl,
    };
    if (oidcClientSecret !== "***") entries.oidc_client_secret = oidcClientSecret;
    saveSettings(entries);
  };

  const handleSaveGeneral = async () => {
    await saveSettings({
      app_language: appLanguage,
      app_timezone: appTimezone,
      app_date_format: appDateFormat,
      app_time_format: appTimeFormat,
    });
    setLocale(appLanguage as SupportedLocale);
  };

  const handleSaveDatabase = () => {
    // DB settings are read-only (managed via .env)
  };

  const handleSaveAi = () => {
    const entries: Record<string, string> = {
      ai_provider: aiProvider,
      ai_enrichment_enabled: aiEnrichmentEnabled ? "true" : "false",
      ai_openai_model: aiOpenaiModel,
      ai_anthropic_model: aiAnthropicModel,
      ai_mistral_model: aiMistralModel,
      ai_self_hosted_url: aiSelfHostedUrl,
      ai_self_hosted_model: aiSelfHostedModel,
    };
    if (aiOpenaiKey !== "***") entries.ai_openai_key = aiOpenaiKey;
    if (aiAnthropicKey !== "***") entries.ai_anthropic_key = aiAnthropicKey;
    if (aiMistralKey !== "***") entries.ai_mistral_key = aiMistralKey;
    if (aiSelfHostedKey !== "***") entries.ai_self_hosted_key = aiSelfHostedKey;
    saveSettings(entries);
  };

  const handleSaveSmtp = () => {
    const entries: Record<string, string> = {
      smtp_configured: smtpConfigured ? "true" : "false",
      smtp_host: smtpHost.trim(),
      smtp_port: smtpPort.trim() || "587",
      smtp_secure: smtpSecure ? "true" : "false",
      smtp_user: smtpUser.trim(),
      smtp_from: smtpFrom.trim(),
    };
    if (smtpPassword !== "***") entries.smtp_password = smtpPassword;
    saveSettings(entries);
  };

  const handleTestSmtp = async () => {
    if (!smtpTestRecipient.trim()) {
      addToast(t.settings.smtp.testRecipientRequired, "error");
      return;
    }
    setSmtpTesting(true);
    try {
      const res = await fetch("/api/settings/smtp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: smtpTestRecipient.trim() }),
      });
      if (res.ok) {
        addToast(t.settings.smtp.testSuccess, "success");
      } else {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || t.settings.smtp.testError, "error");
      }
    } catch {
      addToast(t.settings.smtp.testError, "error");
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleBackup = async () => {
    setDbActionLoading("backup");
    try {
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      if (res.ok) {
        const { data, filename, format } = await res.json();
        const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
        const mimeType = format === "json" ? "application/json" : "application/octet-stream";
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        addToast(t.settings.database.backupSuccess, "success");
      } else {
        addToast(t.settings.database.backupError, "error");
      }
    } catch {
      addToast(t.settings.database.backupError, "error");
    } finally {
      setDbActionLoading(null);
    }
  };

  const handleRestore = async (file: File) => {
    setDbActionLoading("restore");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const isJson = file.name.endsWith(".json");
        const res = await fetch("/api/database", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore", data: base64, format: isJson ? "json" : "binary" }),
        });
        if (res.ok) {
          addToast(t.settings.database.restoreSuccess, "success");
          await loadDatabaseInfo();
        } else {
          const err = await res.json().catch(() => null);
          addToast(err?.error || t.settings.database.restoreError, "error");
        }
        setDbActionLoading(null);
      };
      reader.readAsDataURL(file);
    } catch {
      addToast(t.settings.database.restoreError, "error");
      setDbActionLoading(null);
    }
  };

  const handleWipe = async () => {
    if (wipeConfirmInput !== t.settings.database.wipeConfirmWord) return;
    setDbActionLoading("wipe");
    try {
      const res = await fetch("/api/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "wipe" }),
      });
      if (res.ok) {
        addToast(t.settings.database.wipeSuccess, "success");
        setShowWipeConfirm(false);
        setWipeConfirmInput("");
        await loadDatabaseInfo();
      } else {
        addToast(t.settings.database.wipeError, "error");
      }
    } catch {
      addToast(t.settings.database.wipeError, "error");
    } finally {
      setDbActionLoading(null);
    }
  };

  const handleCsvUpload = async (file: File) => {
    setCsvUploading(true);
    try {
      const text = await file.text();
      const cleanText = text.replace(/^\uFEFF/, "");
      const lines = cleanText.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        addToast(t.settings.csvData.invalidFile, "error");
        setCsvUploading(false);
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const nameIdx = headers.indexOf("name");
      const versionIdx = headers.indexOf("version");

      if (nameIdx === -1 || versionIdx === -1) {
        addToast(t.settings.csvData.missingColumns, "error");
        setCsvUploading(false);
        return;
      }

      const entries: { name: string; version: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const name = cols[nameIdx]?.trim();
        const version = cols[versionIdx]?.trim();
        if (name && version) {
          entries.push({ name, version });
        }
      }

      if (entries.length === 0) {
        addToast(t.settings.csvData.invalidFile, "error");
        setCsvUploading(false);
        return;
      }

      const res = await fetch("/api/csv-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      if (res.ok) {
        const result = await res.json();
        addToast(
          `${t.settings.csvData.uploadSuccess} (${result.created} ${t.settings.csvData.created}, ${result.updated} ${t.settings.csvData.updated})`,
          "success"
        );
        await loadCsvData();
      } else {
        addToast(t.settings.csvData.uploadError, "error");
      }
    } catch {
      addToast(t.settings.csvData.uploadError, "error");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleCsvClearAll = async () => {
    try {
      const res = await fetch("/api/csv-data", { method: "DELETE" });
      if (res.ok) {
        addToast(t.settings.csvData.clearSuccess, "success");
        setShowCsvClearConfirm(false);
        await loadCsvData();
      } else {
        addToast(t.settings.csvData.clearError, "error");
      }
    } catch {
      addToast(t.settings.csvData.clearError, "error");
    }
  };

  const handleCsvDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/csv-data?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await loadCsvData();
      }
    } catch {
      // silently fail
    }
  };

  const handleGenerateApiKey = async () => {
    if (!newKeyName.trim()) return;
    setGeneratingKey(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresInDays: newKeyExpiry,
          role: newKeyRole,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.key);
        setNewKeyName("");
        setNewKeyExpiry(null);
        setNewKeyRole("ADMIN");
        await loadApiKeys();
      } else {
        const err = await res.json().catch(() => null);
        addToast(err?.error || t.common.error, "error");
      }
    } catch {
      addToast(t.common.error, "error");
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRevokeConfirmId(null);
        await loadApiKeys();
      } else {
        addToast(t.common.error, "error");
      }
    } catch {
      addToast(t.common.error, "error");
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const getKeyStatus = (key: { revokedAt: string | null; expiresAt: string | null }) => {
    if (key.revokedAt) return "revoked";
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) return "expired";
    return "active";
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDefaultPort = (type: string) => {
    switch (type) {
      case "postgresql": return "5432";
      case "mysql": return "3306";
      default: return "";
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: t.settings.tabs.general, icon: <Globe className="h-4 w-4" /> },
    { id: "sso", label: t.settings.tabs.sso, icon: <Shield className="h-4 w-4" /> },
    { id: "apiKeys", label: t.settings.tabs.apiKeys, icon: <Key className="h-4 w-4" /> },
    { id: "csvData", label: t.settings.tabs.csvData, icon: <FileSpreadsheet className="h-4 w-4" /> },
    { id: "ai", label: t.settings.tabs.ai, icon: <Bot className="h-4 w-4" /> },
    { id: "notifications", label: t.settings.tabs.notifications, icon: <Bell className="h-4 w-4" /> },
    { id: "database", label: t.settings.tabs.database, icon: <Database className="h-4 w-4" /> },
    { id: "license", label: t.settings.tabs.license, icon: <Crown className="h-4 w-4" /> },
  ];

  const renderProFeatureGate = (featureName: string) => (
    <Card className="p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <Crown className="h-7 w-7 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{featureName}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t.license.featureDisabled}</p>
        </div>
        <a
          href="https://bum.pt"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          {t.license.upgrade} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Header title={t.settings.title} />
      <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="inline-flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg border w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "apiKeys" && (
        <div className="space-y-6">
          {/* Connector API Keys */}
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">{t.settings.apiKeys.title}</h2>
              <p className="text-sm text-muted-foreground">{t.settings.apiKeys.description}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.apiKeys.githubToken}</label>
                <div className="relative">
                  <Input
                    id="githubToken"
                    type={showGithubToken ? "text" : "password"}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder={hasValues.github_token ? "••••••••" : "ghp_..."}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken(!showGithubToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGithubToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.settings.apiKeys.githubTokenHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.apiKeys.gitlabToken}</label>
                <div className="relative">
                  <Input
                    id="gitlabToken"
                    type={showGitlabToken ? "text" : "password"}
                    value={gitlabToken}
                    onChange={(e) => setGitlabToken(e.target.value)}
                    placeholder={hasValues.gitlab_token ? "••••••••" : "glpat-..."}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGitlabToken(!showGitlabToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showGitlabToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.settings.apiKeys.gitlabTokenHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.apiKeys.bitbucketToken}</label>
                <div className="relative">
                  <Input
                    id="bitbucketToken"
                    type={showBitbucketToken ? "text" : "password"}
                    value={bitbucketToken}
                    onChange={(e) => setBitbucketToken(e.target.value)}
                    placeholder={hasValues.bitbucket_token ? "••••••••" : "username:app_password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowBitbucketToken(!showBitbucketToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showBitbucketToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.settings.apiKeys.bitbucketTokenHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.apiKeys.wingetApiKey}</label>
                <div className="relative">
                  <Input
                    id="wingetApiKey"
                    type={showWingetKey ? "text" : "password"}
                    value={wingetApiKey}
                    onChange={(e) => setWingetApiKey(e.target.value)}
                    placeholder={hasValues.winget_api_key ? "••••••••" : "wgr_..."}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWingetKey(!showWingetKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showWingetKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.settings.apiKeys.wingetApiKeyHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.apiKeys.nvdApiKey}</label>
                <div className="relative">
                  <Input
                    id="nvdApiKey"
                    type={showNvdKey ? "text" : "password"}
                    value={nvdApiKey}
                    onChange={(e) => setNvdApiKey(e.target.value)}
                    placeholder={hasValues.nvd_api_key ? "••••••••" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNvdKey(!showNvdKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNvdKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.settings.apiKeys.nvdApiKeyHint}{" "}
                  <a href="https://nvd.nist.gov/developers/request-an-api-key" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    nvd.nist.gov
                  </a>
                </p>
              </div>

              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3">{t.settings.apiKeys.paidServicesTitle}</h3>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.apiKeys.librariesIoApiKey}</label>
                <div className="relative">
                  <Input
                    id="librariesIoApiKey"
                    type={showLibrariesIoKey ? "text" : "password"}
                    value={librariesIoApiKey}
                    onChange={(e) => setLibrariesIoApiKey(e.target.value)}
                    placeholder={hasValues.libraries_io_api_key ? "••••••••" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLibrariesIoKey(!showLibrariesIoKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showLibrariesIoKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.settings.apiKeys.librariesIoApiKeyHint}{" "}
                  <a href="https://libraries.io/account" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    libraries.io
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.apiKeys.vulndbClientId}</label>
                <div className="relative">
                  <Input
                    id="vulndbClientId"
                    type={showVulndbId ? "text" : "password"}
                    value={vulndbClientId}
                    onChange={(e) => setVulndbClientId(e.target.value)}
                    placeholder={hasValues.vulndb_client_id ? "••••••••" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowVulndbId(!showVulndbId)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showVulndbId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.settings.apiKeys.vulndbClientIdHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.apiKeys.vulndbClientSecret}</label>
                <div className="relative">
                  <Input
                    id="vulndbClientSecret"
                    type={showVulndbSecret ? "text" : "password"}
                    value={vulndbClientSecret}
                    onChange={(e) => setVulndbClientSecret(e.target.value)}
                    placeholder={hasValues.vulndb_client_secret ? "••••••••" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowVulndbSecret(!showVulndbSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showVulndbSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.settings.apiKeys.vulndbClientSecretHint}{" "}
                  <a href="https://vulndb.cyberriskanalytics.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    vulndb.cyberriskanalytics.com
                  </a>
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">{t.settings.apiKeys.cveEnrichment}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.apiKeys.cveEnrichmentHint}</p>
                </div>
                <Switch
                  checked={cveEnrichmentEnabled}
                  onCheckedChange={setCveEnrichmentEnabled}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveApiKeys} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t.common.save}
              </Button>
            </div>
          </Card>

          {/* External API Keys */}
          {!license?.apiKeysEnabled ? (
            <div className="space-y-6">
              {renderProFeatureGate("REST API Authentication")}
              {renderProFeatureGate("MCP Server")}
            </div>
          ) : (
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t.settings.externalApi.title}</h2>
                <p className="text-sm text-muted-foreground">{t.settings.externalApi.description}</p>
              </div>
              <a
                href="/docs/api"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/15 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t.settings.externalApi.openApiUrl}
              </a>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <h3 className="text-sm font-semibold">{t.settings.externalApi.generateKey}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">{t.settings.externalApi.keyName}</label>
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t.settings.externalApi.keyNamePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{t.users.role}</label>
                  <select
                    value={newKeyRole}
                    onChange={(e) => setNewKeyRole(e.target.value as "ADMIN" | "SUPER_ADMIN")}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="ADMIN">{t.users.roles.ADMIN}</option>
                    <option value="SUPER_ADMIN">{t.users.roles.SUPER_ADMIN}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{t.settings.externalApi.expiresIn}</label>
                  <select
                    value={newKeyExpiry ?? ""}
                    onChange={(e) => setNewKeyExpiry(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">{t.settings.externalApi.expiresNever}</option>
                    <option value="30">{t.settings.externalApi.expires30}</option>
                    <option value="90">{t.settings.externalApi.expires90}</option>
                    <option value="365">{t.settings.externalApi.expires365}</option>
                  </select>
                </div>
              </div>
              <Button
                onClick={handleGenerateApiKey}
                disabled={generatingKey || !newKeyName.trim()}
              >
                {generatingKey ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                {t.settings.externalApi.generateKey}
              </Button>
            </div>

            {generatedKey && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">
                    {t.settings.externalApi.generatedKey}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background rounded px-3 py-2 font-mono break-all border">
                    {generatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedKey)}
                  >
                    {keyCopied ? (
                      <><Check className="h-4 w-4 mr-1" />{t.settings.externalApi.copied}</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-1" />{t.settings.externalApi.copyKey}</>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{t.settings.externalApi.generatedKeyWarning}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setGeneratedKey(null)}>
                  <X className="h-4 w-4 mr-1" /> {t.common.cancel}
                </Button>
              </div>
            )}

            {apiKeysLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t.settings.externalApi.noKeys}
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">{t.settings.externalApi.keyName}</th>
                        <th className="text-left px-4 py-2 font-medium">Prefix</th>
                        <th className="text-left px-4 py-2 font-medium">{t.users.role}</th>
                        <th className="text-left px-4 py-2 font-medium">Status</th>
                        <th className="text-left px-4 py-2 font-medium">{t.settings.externalApi.lastUsed}</th>
                        <th className="text-left px-4 py-2 font-medium">{t.settings.externalApi.createdBy}</th>
                        <th className="w-10 px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {apiKeys.map((key) => {
                        const status = getKeyStatus(key);
                        return (
                          <tr key={key.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2 font-medium">{key.name}</td>
                            <td className="px-4 py-2">
                              <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">
                                {key.keyPrefix}...
                              </code>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                key.role === "SUPER_ADMIN"
                                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              }`}>
                                {t.users.roles[key.role as keyof typeof t.users.roles] || key.role}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                status === "active"
                                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                  : status === "expired"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "bg-red-500/10 text-red-700 dark:text-red-400"
                              }`}>
                                {status === "active"
                                  ? t.settings.externalApi.active
                                  : status === "expired"
                                  ? t.settings.externalApi.expired
                                  : t.settings.externalApi.revoked}
                              </span>
                              {key.expiresAt && status === "active" && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  → {formatAppDate(key.expiresAt, dateSettings, "date")}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">
                              {key.lastUsedAt
                                ? formatAppDate(key.lastUsedAt, dateSettings)
                                : t.settings.externalApi.never}
                            </td>
                            <td className="px-4 py-2 text-xs text-muted-foreground">{key.userEmail}</td>
                            <td className="px-4 py-2">
                              {status === "active" && (
                                revokeConfirmId === key.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleRevokeApiKey(key.id)}
                                      className="text-xs text-destructive hover:underline"
                                    >
                                      {t.common.confirm}
                                    </button>
                                    <button
                                      onClick={() => setRevokeConfirmId(null)}
                                      className="text-xs text-muted-foreground hover:underline ml-1"
                                    >
                                      {t.common.cancel}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setRevokeConfirmId(key.id)}
                                    className="text-xs text-destructive hover:underline"
                                  >
                                    {t.settings.externalApi.revoke}
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
          )}

          {license?.apiKeysEnabled && (
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold">{t.settings.externalApi.mcpTitle}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{t.settings.externalApi.mcpDescription}</p>
              </div>
              <a
                href="/docs/mcp"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/15 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t.settings.externalApi.mcpDocs}
              </a>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t.settings.externalApi.mcpEndpoint}</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono break-all border">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp"}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";
                      navigator.clipboard.writeText(url);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.settings.externalApi.mcpAuthHint}
              </p>
            </div>
          </Card>
          )}
        </div>
      )}

      {activeTab === "sso" && !license?.ssoEnabled && (
        renderProFeatureGate("Authentication")
      )}

      {activeTab === "sso" && license?.ssoEnabled && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">{t.settings.sso.title}</h2>
            <p className="text-sm text-muted-foreground">{t.settings.sso.description}</p>
          </div>

          {/* SAML 2.0 Card */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t.settings.saml.title}</h3>
                <p className="text-sm text-muted-foreground">{t.settings.saml.description}</p>
              </div>
              <Switch
                checked={samlEnabled}
                onCheckedChange={setSamlEnabled}
                title={samlEnabled ? t.settings.saml.enabled : t.settings.saml.enabledHint}
              />
            </div>

            <div className="space-y-4">
              <Input
                id="samlEntityId"
                label={t.settings.saml.entityId}
                value={samlEntityId}
                onChange={(e) => setSamlEntityId(e.target.value)}
                placeholder="https://your-app.example.com/saml/metadata"
                disabled={!samlEnabled}
              />
              <p className="text-xs text-muted-foreground -mt-3">{t.settings.saml.entityIdHint}</p>

              <Input
                id="samlSsoUrl"
                label={t.settings.saml.ssoUrl}
                value={samlSsoUrl}
                onChange={(e) => setSamlSsoUrl(e.target.value)}
                placeholder="https://idp.example.com/saml/sso"
                disabled={!samlEnabled}
              />
              <p className="text-xs text-muted-foreground -mt-3">{t.settings.saml.ssoUrlHint}</p>

              <Input
                id="samlCallbackUrl"
                label={t.settings.saml.callbackUrl}
                value={samlCallbackUrl}
                onChange={(e) => setSamlCallbackUrl(e.target.value)}
                placeholder="https://your-app.example.com/api/auth/saml/callback"
                disabled={!samlEnabled}
              />
              <p className="text-xs text-muted-foreground -mt-3">{t.settings.saml.callbackUrlHint}</p>

              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.saml.certificate}</label>
                <textarea
                  value={samlCertificate}
                  onChange={(e) => setSamlCertificate(e.target.value)}
                  placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                  disabled={!samlEnabled}
                  rows={5}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground mt-1">{t.settings.saml.certificateHint}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="samlButtonLabel"
                    label={t.settings.saml.buttonLabel}
                    value={samlButtonLabel}
                    onChange={(e) => setSamlButtonLabel(e.target.value)}
                    placeholder={t.auth.ssoDefaultSaml}
                    disabled={!samlEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t.settings.saml.buttonLabelHint}</p>
                </div>
                <div>
                  <Input
                    id="samlImageUrl"
                    label={t.settings.saml.imageUrl}
                    value={samlImageUrl}
                    onChange={(e) => setSamlImageUrl(e.target.value)}
                    placeholder="https://example.com/icon.svg"
                    disabled={!samlEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t.settings.saml.imageUrlHint}</p>
                </div>
              </div>

              {samlEnabled && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-600 dark:text-blue-400">{t.settings.saml.metadataUrl}</p>
                    <code className="text-xs text-muted-foreground break-all">
                      {typeof window !== "undefined" ? `${window.location.origin}/api/auth/saml/metadata` : "/api/auth/saml/metadata"}
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">{t.settings.saml.metadataUrlHint}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveSaml} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t.common.save}
              </Button>
            </div>
          </Card>

          {/* OpenID Connect Card */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t.settings.oidc.title}</h3>
                <p className="text-sm text-muted-foreground">{t.settings.oidc.description}</p>
              </div>
              <Switch
                checked={oidcEnabled}
                onCheckedChange={setOidcEnabled}
                title={oidcEnabled ? t.settings.oidc.enabled : t.settings.oidc.enabledHint}
              />
            </div>

            <div className="space-y-4">
              <Input
                id="oidcIssuer"
                label={t.settings.oidc.issuer}
                value={oidcIssuer}
                onChange={(e) => setOidcIssuer(e.target.value)}
                placeholder="https://accounts.google.com"
                disabled={!oidcEnabled}
              />
              <p className="text-xs text-muted-foreground -mt-3">{t.settings.oidc.issuerHint}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="oidcClientId"
                    label={t.settings.oidc.clientId}
                    value={oidcClientId}
                    onChange={(e) => setOidcClientId(e.target.value)}
                    placeholder="your-client-id"
                    disabled={!oidcEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t.settings.oidc.clientIdHint}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.settings.oidc.clientSecret}</label>
                  <div className="relative">
                    <Input
                      id="oidcClientSecret"
                      type={showOidcSecret ? "text" : "password"}
                      value={oidcClientSecret}
                      onChange={(e) => setOidcClientSecret(e.target.value)}
                      placeholder={hasValues.oidc_client_secret ? "••••••••" : "your-client-secret"}
                      disabled={!oidcEnabled}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOidcSecret(!showOidcSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showOidcSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.settings.oidc.clientSecretHint}</p>
                </div>
              </div>

              <Input
                id="oidcCallbackUrl"
                label={t.settings.oidc.callbackUrl}
                value={oidcCallbackUrl}
                onChange={(e) => setOidcCallbackUrl(e.target.value)}
                placeholder="https://your-app.example.com/api/auth/oidc/callback"
                disabled={!oidcEnabled}
              />
              <p className="text-xs text-muted-foreground -mt-3">{t.settings.oidc.callbackUrlHint}</p>

              <Input
                id="oidcScope"
                label={t.settings.oidc.scope}
                value={oidcScope}
                onChange={(e) => setOidcScope(e.target.value)}
                placeholder="openid profile email"
                disabled={!oidcEnabled}
              />
              <p className="text-xs text-muted-foreground -mt-3">{t.settings.oidc.scopeHint}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="oidcButtonLabel"
                    label={t.settings.oidc.buttonLabel}
                    value={oidcButtonLabel}
                    onChange={(e) => setOidcButtonLabel(e.target.value)}
                    placeholder={t.auth.ssoDefaultOidc}
                    disabled={!oidcEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t.settings.oidc.buttonLabelHint}</p>
                </div>
                <div>
                  <Input
                    id="oidcImageUrl"
                    label={t.settings.oidc.imageUrl}
                    value={oidcImageUrl}
                    onChange={(e) => setOidcImageUrl(e.target.value)}
                    placeholder="https://example.com/icon.svg"
                    disabled={!oidcEnabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t.settings.oidc.imageUrlHint}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveOidc} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t.common.save}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "general" && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">{t.settings.general.title}</h2>
            <p className="text-sm text-muted-foreground">{t.settings.general.description}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t.settings.general.language}</label>
              <select
                value={appLanguage}
                onChange={(e) => setAppLanguage(e.target.value as SupportedLocale)}
                className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {SUPPORTED_LOCALES.map((loc) => (
                  <option key={loc} value={loc}>
                    {t.settings.general.languages[loc as keyof typeof t.settings.general.languages]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{t.settings.general.languageHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t.settings.general.timezone}</label>
              <select
                value={appTimezone}
                onChange={(e) => setAppTimezone(e.target.value)}
                className="w-full max-w-md rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {formatTzLabel(tz)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{t.settings.general.timezoneHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t.settings.general.dateFormat}</label>
              <select
                value={appDateFormat}
                onChange={(e) => setAppDateFormat(e.target.value)}
                className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {DATE_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">{t.settings.general.dateFormatHint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t.settings.general.timeFormat}</label>
              <select
                value={appTimeFormat}
                onChange={(e) => setAppTimeFormat(e.target.value)}
                className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="24h">{t.settings.general.timeFormats["24h"]}</option>
                <option value="12h">{t.settings.general.timeFormats["12h"]}</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">{t.settings.general.timeFormatHint}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveGeneral} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {t.common.save}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "database" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">{t.settings.database.title}</h2>
              <p className="text-sm text-muted-foreground">{t.settings.database.description}</p>
            </div>

            {dbInfo && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t.settings.database.currentType}:</span>
                  <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {t.settings.database.types[dbInfo.type as keyof typeof t.settings.database.types] || dbInfo.type}
                  </span>
                  {dbInfo.fileSize !== null && (
                    <span className="text-xs text-muted-foreground ml-2">({formatBytes(dbInfo.fileSize)})</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                  {Object.entries(dbInfo.tables).map(([table, count]) => (
                    <div key={table} className="flex justify-between bg-background rounded px-2 py-1">
                      <span className="capitalize">{table.replace(/([A-Z])/g, " $1").trim()}</span>
                      <span className="font-mono font-medium text-foreground">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-600 dark:text-blue-400">{t.settings.database.readOnly}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{t.settings.database.readOnlyHint}</p>
              </div>
            </div>

            <div className="space-y-4 opacity-80">
              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.database.type}</label>
                <select
                  value={dbType}
                  disabled
                  className="w-full max-w-xs rounded-md border bg-muted px-3 py-2 text-sm cursor-not-allowed"
                >
                  <option value="sqlite">{t.settings.database.types.sqlite}</option>
                  <option value="postgresql">{t.settings.database.types.postgresql}</option>
                  <option value="mariadb">{t.settings.database.types.mariadb ?? "MariaDB"}</option>
                  <option value="mysql">{t.settings.database.types.mysql}</option>
                </select>
              </div>

              {dbType !== "sqlite" && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        id="dbHost"
                        label={t.settings.database.host}
                        value={dbHost}
                        disabled
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <Input
                        id="dbPort"
                        label={t.settings.database.port}
                        value={dbPort}
                        disabled
                        placeholder={getDefaultPort(dbType)}
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      id="dbName"
                      label={t.settings.database.dbName}
                      value={dbName}
                      disabled
                      placeholder="it_update_monitor"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Input
                        id="dbUser"
                        label={t.settings.database.username}
                        value={dbUser}
                        disabled
                        placeholder="admin"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t.settings.database.password}</label>
                      <Input
                        id="dbPassword"
                        type="password"
                        value={dbPassword}
                        disabled
                        placeholder={hasValues.db_password ? "••••••••" : ""}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={dbSsl}
                      disabled
                      title={t.settings.database.sslEnabled}
                    />
                    <div>
                      <p className="text-sm font-medium">{t.settings.database.sslEnabled}</p>
                      <p className="text-xs text-muted-foreground">{t.settings.database.sslHint}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">{t.settings.database.backup}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{t.settings.database.backupDescription}</p>
              <Button
                onClick={handleBackup}
                disabled={dbActionLoading !== null}
                variant="outline"
                className="w-full"
              >
                {dbActionLoading === "backup" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t.settings.database.backupButton}
              </Button>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">{t.settings.database.restore}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{t.settings.database.restoreDescription}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,.sqlite,.sqlite3,.bak,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setRestoreFile(file);
                    setShowRestoreDialog(true);
                  }
                  e.target.value = "";
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={dbActionLoading !== null}
                variant="outline"
                className="w-full"
              >
                {dbActionLoading === "restore" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {t.settings.database.restoreButton}
              </Button>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-destructive">{t.settings.database.wipe}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{t.settings.database.wipeDescription}</p>
              {!showWipeConfirm ? (
                <Button
                  onClick={() => setShowWipeConfirm(true)}
                  disabled={dbActionLoading !== null}
                  variant="outline"
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t.settings.database.wipeButton}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{t.settings.database.wipeConfirm}</span>
                  </div>
                  <Input
                    value={wipeConfirmInput}
                    onChange={(e) => setWipeConfirmInput(e.target.value)}
                    placeholder={t.settings.database.wipeConfirmWord}
                    className="font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleWipe}
                      disabled={wipeConfirmInput !== t.settings.database.wipeConfirmWord || dbActionLoading !== null}
                      variant="outline"
                      className="flex-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                    >
                      {dbActionLoading === "wipe" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {t.common.confirm}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowWipeConfirm(false);
                        setWipeConfirmInput("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      {t.common.cancel}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === "ai" && !license?.aiEnabled && (
        renderProFeatureGate("AI Assistant")
      )}

      {activeTab === "ai" && license?.aiEnabled && (
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">{t.settings.ai.title}</h2>
              <p className="text-sm text-muted-foreground">{t.settings.ai.description}</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{t.settings.ai.enrichmentToggle}</p>
                <p className="text-xs text-muted-foreground">{t.settings.ai.enrichmentToggleHint}</p>
              </div>
              <Switch
                checked={aiEnrichmentEnabled}
                onCheckedChange={setAiEnrichmentEnabled}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t.settings.ai.provider}</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="none">{t.settings.ai.providerNone}</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="mistral">Mistral</option>
                  <option value="self_hosted">{t.settings.ai.providerSelfHosted}</option>
                </select>
              </div>

              {aiProvider === "openai" && (
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-green-500" />
                    <h3 className="text-sm font-semibold">OpenAI</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.apiKey}</label>
                    <div className="relative">
                      <Input
                        type={showAiKey ? "text" : "password"}
                        value={aiOpenaiKey}
                        onChange={(e) => setAiOpenaiKey(e.target.value)}
                        placeholder={hasValues.ai_openai_key ? "••••••••" : "sk-..."}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAiKey(!showAiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.model}</label>
                    <Input
                      value={aiOpenaiModel}
                      onChange={(e) => setAiOpenaiModel(e.target.value)}
                      placeholder="gpt-4o-mini"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t.settings.ai.modelHint}</p>
                  </div>
                </div>
              )}

              {aiProvider === "anthropic" && (
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-orange-500" />
                    <h3 className="text-sm font-semibold">Anthropic</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.apiKey}</label>
                    <div className="relative">
                      <Input
                        type={showAiKey ? "text" : "password"}
                        value={aiAnthropicKey}
                        onChange={(e) => setAiAnthropicKey(e.target.value)}
                        placeholder={hasValues.ai_anthropic_key ? "••••••••" : "sk-ant-..."}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAiKey(!showAiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.model}</label>
                    <Input
                      value={aiAnthropicModel}
                      onChange={(e) => setAiAnthropicModel(e.target.value)}
                      placeholder="claude-sonnet-4-20250514"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t.settings.ai.modelHint}</p>
                  </div>
                </div>
              )}

              {aiProvider === "mistral" && (
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold">Mistral</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.apiKey}</label>
                    <div className="relative">
                      <Input
                        type={showAiKey ? "text" : "password"}
                        value={aiMistralKey}
                        onChange={(e) => setAiMistralKey(e.target.value)}
                        placeholder={hasValues.ai_mistral_key ? "••••••••" : ""}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAiKey(!showAiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.model}</label>
                    <Input
                      value={aiMistralModel}
                      onChange={(e) => setAiMistralModel(e.target.value)}
                      placeholder="mistral-small-latest"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t.settings.ai.modelHint}</p>
                  </div>
                </div>
              )}

              {aiProvider === "self_hosted" && (
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-semibold">{t.settings.ai.providerSelfHosted}</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.selfHostedUrl}</label>
                    <Input
                      value={aiSelfHostedUrl}
                      onChange={(e) => setAiSelfHostedUrl(e.target.value)}
                      placeholder="http://ollama:11434"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t.settings.ai.selfHostedUrlHint}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.apiKey} ({t.settings.ai.optional})</label>
                    <div className="relative">
                      <Input
                        type={showAiKey ? "text" : "password"}
                        value={aiSelfHostedKey}
                        onChange={(e) => setAiSelfHostedKey(e.target.value)}
                        placeholder={hasValues.ai_self_hosted_key ? "••••••••" : ""}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAiKey(!showAiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t.settings.ai.model}</label>
                    <Input
                      value={aiSelfHostedModel}
                      onChange={(e) => setAiSelfHostedModel(e.target.value)}
                      placeholder="llama3.1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t.settings.ai.modelHint}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveAi} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t.common.save}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "csvData" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">{t.settings.csvData.title}</h2>
              <p className="text-sm text-muted-foreground">{t.settings.csvData.description}</p>
            </div>

            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-600 dark:text-blue-400">{t.settings.csvData.uploadHint}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  CSV format: name,version
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvUpload(file);
                  e.target.value = "";
                }}
              />
              <Button
                onClick={() => csvFileInputRef.current?.click()}
                disabled={csvUploading}
                variant="outline"
              >
                {csvUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {t.settings.csvData.uploadButton}
              </Button>

              {csvEntries.length > 0 && (
                <Button
                  onClick={() => setShowCsvClearConfirm(true)}
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  disabled={csvUploading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t.settings.csvData.clearAll}
                </Button>
              )}
            </div>

            {showCsvClearConfirm && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{t.settings.csvData.clearConfirm}</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCsvClearAll} variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10">
                    {t.common.confirm}
                  </Button>
                  <Button onClick={() => setShowCsvClearConfirm(false)} variant="outline" size="sm">
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            )}

            {csvLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : csvEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t.settings.csvData.noEntries}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {t.settings.csvData.entries}: <span className="text-primary">{csvEntries.length}</span>
                  </p>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">{t.settings.csvData.name}</th>
                          <th className="text-left px-4 py-2 font-medium">{t.settings.csvData.version}</th>
                          <th className="w-10 px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {csvEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2 font-mono text-xs">{entry.name}</td>
                            <td className="px-4 py-2">
                              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                                {entry.version}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handleCsvDeleteEntry(entry.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title={t.settings.csvData.deleteEntry}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "notifications" && !license?.webhooksEnabled && (
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
              <Crown className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t.settings.tabs.notifications}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t.license.featureDisabled}</p>
            </div>
            <a
              href="https://bum.pt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {t.license.upgrade} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </Card>
      )}

      {activeTab === "notifications" && license?.webhooksEnabled && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t.settings.smtp.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.settings.smtp.description}
                </p>
              </div>
              <div className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
                {smtpConfigured ? t.settings.smtp.statusEnabled : t.settings.smtp.statusDisabled}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t.settings.smtp.enable}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.smtp.enableHint}</p>
                </div>
                <Switch checked={smtpConfigured} onCheckedChange={setSmtpConfigured} />
              </div>

              <Input
                label={t.settings.smtp.host}
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.example.com"
              />
              <Input
                label={t.settings.smtp.port}
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
              />
              <div className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.settings.smtp.secure}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.smtp.secureHint}</p>
                </div>
                <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} />
              </div>
              <Input
                label={t.settings.smtp.user}
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="noreply@example.com"
              />
              <div className="relative">
                <Input
                  label={t.settings.smtp.password}
                  type={showSmtpPassword ? "text" : "password"}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={hasValues.smtp_password ? "••••••••" : ""}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPassword((v) => !v)}
                  className="absolute right-3 top-[34px] text-muted-foreground hover:text-foreground"
                  aria-label={showSmtpPassword ? t.settings.smtp.passwordHide : t.settings.smtp.passwordShow}
                >
                  {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                label={t.settings.smtp.from}
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                placeholder="bum.pt <noreply@example.com>"
              />
            </div>

            <div className="flex justify-end">
              <div className="w-full flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="w-full md:max-w-sm">
                  <Input
                    label={t.settings.smtp.testRecipient}
                    value={smtpTestRecipient}
                    onChange={(e) => setSmtpTestRecipient(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button onClick={handleTestSmtp} disabled={saving || smtpTesting}>
                    {smtpTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    {t.settings.smtp.testButton}
                  </Button>
                  <Button onClick={handleSaveSmtp} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {t.common.save}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t.settings.tabs.notifications}</h3>
                <p className="text-sm text-muted-foreground">{t.webhooks.description}</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setEditingWebhook(null);
                  setWebhookForm({ name: "", url: "", type: "custom", events: ["version.new", "version.critical", "cve.detected", "check.failed"], headers: "{}", secret: "", enabled: true });
                  setShowWebhookForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t.webhooks.addWebhook}
              </Button>
            </div>

            {webhooksLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t.webhooks.noWebhooks}
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((wh) => {
                  let events: string[] = [];
                  try { events = JSON.parse(wh.events); } catch { /* empty */ }
                  return (
                    <div key={wh.id} className="flex items-center gap-4 rounded-lg border p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{wh.name}</span>
                          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium uppercase">
                            {t.webhooks.types[wh.type as keyof typeof t.webhooks.types] || wh.type}
                          </span>
                          {wh.fromEnv && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">ENV</span>
                          )}
                          {!wh.enabled && (
                            <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-medium">OFF</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">{wh.url}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {events.map((ev) => (
                            <span key={ev} className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px]">
                              {t.webhooks.eventTypes[ev as keyof typeof t.webhooks.eventTypes] || ev}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            setTestingWebhookId(wh.id);
                            try {
                              const res = await fetch(`/api/webhooks/${wh.id}/test`, { method: "POST" });
                              if (res.ok) addToast(t.webhooks.testSuccess, "success");
                              else addToast(t.webhooks.testFailed, "error");
                            } catch { addToast(t.webhooks.testFailed, "error"); }
                            finally { setTestingWebhookId(null); }
                          }}
                          title={t.webhooks.test}
                        >
                          {testingWebhookId === wh.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingWebhook(wh);
                            let evts: string[] = [];
                            try { evts = JSON.parse(wh.events); } catch { /* empty */ }
                            setWebhookForm({
                              name: wh.name, url: wh.url, type: wh.type,
                              events: evts, headers: wh.headers, secret: wh.secret || "", enabled: wh.enabled,
                            });
                            setShowWebhookForm(true);
                          }}
                          title={t.common.edit}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteWebhookId(wh.id)}
                          title={t.common.delete}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "license" && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">{t.settings.licenseTab.title}</h2>
            <p className="text-sm text-muted-foreground">{t.settings.licenseTab.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{t.settings.licenseTab.edition}</p>
              <p className="text-sm font-semibold">
                {license?.edition === "professional" ? (
                  <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Crown className="h-4 w-4" />
                    {t.license.professional}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t.license.community}</span>
                )}
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{t.settings.licenseTab.status}</p>
              <p className="text-sm font-semibold">
                {license?.edition === "professional" ? (
                  <span className="text-green-600 dark:text-green-400">{t.settings.licenseTab.statusValid}</span>
                ) : license?.message === "license_expired" ? (
                  <span className="text-red-600 dark:text-red-400">{t.settings.licenseTab.statusExpired}</span>
                ) : (
                  <span className="text-muted-foreground">{t.settings.licenseTab.statusNone}</span>
                )}
              </p>
            </div>
            {license?.expiresAt && (
              <div className="rounded-lg border p-4 space-y-1">
                <p className="text-xs text-muted-foreground">{t.settings.licenseTab.expiresAt}</p>
                <p className="text-sm font-semibold">{formatAppDate(license.expiresAt, dateSettings, "date")}</p>
              </div>
            )}
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{t.settings.licenseTab.source}</p>
              <p className="text-sm font-semibold">
                {licenseSource === "database"
                  ? t.settings.licenseTab.sourceDb
                  : licenseSource === "environment"
                    ? t.settings.licenseTab.sourceEnv
                    : t.settings.licenseTab.sourceNone}
              </p>
            </div>
          </div>

          {license?.edition === "professional" && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t.settings.licenseTab.features}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { enabled: true, label: t.settings.licenseTab.featureUnlimited },
                  { enabled: license.aiEnabled, label: t.settings.licenseTab.featureAi },
                  { enabled: license.webhooksEnabled, label: t.settings.licenseTab.featureWebhooks },
                  { enabled: license.reportsEnabled, label: t.settings.licenseTab.featureReports },
                  { enabled: license.ssoEnabled, label: t.settings.licenseTab.featureSso },
                  { enabled: license.apiKeysEnabled, label: t.settings.licenseTab.featureApiKeys },
                  { enabled: license.apiKeysEnabled, label: t.settings.licenseTab.featureMcp },
                ].map((f) => (
                  <span
                    key={f.label}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      f.enabled
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {f.enabled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="border-t pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              License activation is not available in this repository.
            </p>
          </div>

          {license?.edition === "community" && (
            <div className="border-t pt-6">
              <a
                href="https://bum.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {t.license.upgrade}
              </a>
            </div>
          )}
        </Card>
      )}

      <Dialog
        open={showWebhookForm}
        onClose={() => setShowWebhookForm(false)}
        title={editingWebhook ? t.webhooks.editWebhook : t.webhooks.addWebhook}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setWebhookSaving(true);
            try {
              const body = { ...webhookForm };
              if (editingWebhook) {
                await fetch(`/api/webhooks/${editingWebhook.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
              } else {
                await fetch("/api/webhooks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
              }
              setShowWebhookForm(false);
              loadWebhooks();
            } catch { addToast(t.settings.saveError, "error"); }
            finally { setWebhookSaving(false); }
          }}
          className="space-y-4"
        >
          <Input
            id="wh-name"
            label={t.webhooks.name}
            value={webhookForm.name}
            onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
            required
          />
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t.webhooks.type}</label>
            <select
              value={webhookForm.type}
              onChange={(e) => setWebhookForm({ ...webhookForm, type: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="slack">{t.webhooks.types.slack}</option>
              <option value="discord">{t.webhooks.types.discord}</option>
              <option value="teams">{t.webhooks.types.teams}</option>
              <option value="email">{t.webhooks.types.email}</option>
              <option value="custom">{t.webhooks.types.custom}</option>
            </select>
          </div>
          <Input
            id="wh-url"
            label={webhookForm.type === "email" ? t.webhooks.emailRecipients : t.webhooks.url}
            value={webhookForm.url}
            onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
            placeholder={t.webhooks.placeholders[webhookForm.type as keyof typeof t.webhooks.placeholders] || ""}
            required
          />
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t.webhooks.events}</label>
            <div className="space-y-2">
              {(["version.new", "version.critical", "cve.detected", "item.eol", "check.failed"] as const).map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={webhookForm.events.includes(ev)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWebhookForm({ ...webhookForm, events: [...webhookForm.events, ev] });
                      } else {
                        setWebhookForm({ ...webhookForm, events: webhookForm.events.filter((x) => x !== ev) });
                      }
                    }}
                    className="rounded border-input"
                  />
                  {t.webhooks.eventTypes[ev as keyof typeof t.webhooks.eventTypes] || ev}
                </label>
              ))}
            </div>
          </div>
          {webhookForm.type === "custom" && (
            <>
              <Input
                id="wh-secret"
                label={t.webhooks.secret}
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                placeholder={t.webhooks.secretHint}
              />
              <Input
                id="wh-headers"
                label={t.webhooks.headers}
                value={webhookForm.headers}
                onChange={(e) => setWebhookForm({ ...webhookForm, headers: e.target.value })}
                placeholder='{"Authorization": "Bearer ..."}'
              />
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={webhookForm.enabled}
              onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, enabled: checked })}
            />
            <span className="text-sm">{t.webhooks.enabled}</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowWebhookForm(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={webhookSaving}>
              {webhookSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t.common.save}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={showRestoreDialog}
        onClose={() => {
          setShowRestoreDialog(false);
          setRestoreFile(null);
        }}
        title={t.settings.database.restore}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">{t.settings.database.restoreConfirm}</p>
            </div>
          </div>

          {restoreFile && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono truncate">{restoreFile.name}</span>
              <span className="text-muted-foreground ml-auto text-xs">
                {restoreFile.size < 1024 * 1024
                  ? `${(restoreFile.size / 1024).toFixed(1)} KB`
                  : `${(restoreFile.size / (1024 * 1024)).toFixed(1)} MB`}
              </span>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRestoreDialog(false);
                setRestoreFile(null);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (restoreFile) {
                  handleRestore(restoreFile);
                  setShowRestoreDialog(false);
                  setRestoreFile(null);
                }
              }}
              disabled={dbActionLoading === "restore"}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {dbActionLoading === "restore" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t.settings.database.restoreButton}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>

      <Dialog
        open={!!deleteWebhookId}
        onClose={() => setDeleteWebhookId(null)}
        title={t.common.delete}
      >
        <p className="text-sm text-muted-foreground mb-4">
          {t.webhooks.deleteConfirm}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteWebhookId(null)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="outline"
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={async () => {
              if (!deleteWebhookId) return;
              await fetch(`/api/webhooks/${deleteWebhookId}`, { method: "DELETE" });
              loadWebhooks();
              setDeleteWebhookId(null);
            }}
          >
            {t.common.delete}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
