"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/config";
import { FlaskConical, CheckCircle, XCircle, Loader2, FileText, Shield, Calendar, ExternalLink } from "lucide-react";
import { RenderedContent } from "@/components/ui/rendered-content";

interface SourceData {
  id?: string;
  name: string;
  type: string;
  config: string;
  description: string;
  isBuiltIn?: boolean;
}

interface SourceFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: SourceData) => Promise<void>;
  source?: SourceData | null;
  testOnly?: boolean;
}

interface TestResult {
  success: boolean;
  version: string | null;
  duration: number;
  releaseNotes?: string | null;
  releaseDate?: string | null;
  releaseUrl?: string | null;
  cves?: string[] | null;
  description?: string | null;
}

interface TestParamDescriptor {
  key: string;
  placeholder: string;
}

const EMPTY_SOURCE: SourceData = {
  name: "",
  type: "json_api",
  config: "",
  description: "",
};

function parseConfig(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

function buildConfig(type: string, fields: Record<string, string>): string {
  const obj: Record<string, unknown> = {};
  if (type === "json_api") {
    if (fields.url) obj.url = fields.url;
    if (fields.jsonPath) obj.jsonPath = fields.jsonPath;
    if (fields.releaseNotesPath) obj.releaseNotesPath = fields.releaseNotesPath;
    if (fields.releaseDatePath) obj.releaseDatePath = fields.releaseDatePath;
    if (fields.releaseUrlPath) obj.releaseUrlPath = fields.releaseUrlPath;
    if (fields.headers) {
      try { obj.headers = JSON.parse(fields.headers); } catch { /* skip */ }
    }
  } else if (type === "html") {
    if (fields.url) obj.url = fields.url;
    if (fields.selector) obj.selector = fields.selector;
    if (fields.regex) obj.regex = fields.regex;
    if (fields.releaseNotesSelector) obj.releaseNotesSelector = fields.releaseNotesSelector;
    if (fields.releaseDateSelector) obj.releaseDateSelector = fields.releaseDateSelector;
    if (fields.releaseUrlSelector) obj.releaseUrlSelector = fields.releaseUrlSelector;
    if (fields.headers) {
      try { obj.headers = JSON.parse(fields.headers); } catch { /* skip */ }
    }
  }
  return JSON.stringify(obj, null, 2);
}

const PARAM_ONLY_TYPES = [
  "dockerhub", "github", "appstore", "playstore", "msstore",
  "chrome", "endoflife", "npm", "pypi", "repology",
  "homebrew", "wordpress", "winget", "csv_data",
  "maven", "nuget", "gitlab", "packagist", "crates",
  "rubygems", "goproxy", "helm", "snap", "flathub",
  "terraform", "chocolatey",
  "pub", "hex", "conda", "cocoapods", "cpan", "fdroid",
  "firefox_addon", "vscode", "jetbrains", "openvsx",
  "aur", "ansible", "quay", "bitbucket", "libraries_io",
];

function getTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    dockerhub: "Docker Hub uses built-in logic. The Docker image is configured per item.",
    github: "GitHub Releases uses built-in logic. The repository is configured per item.",
    appstore: "Apple App Store uses the iTunes Lookup API. The bundle ID is configured per item.",
    playstore: "Google Play Store uses web scraping. The app ID is configured per item.",
    msstore: "Microsoft Store uses web scraping. The product ID is configured per item.",
    chrome: "Queries the Google Version History API. Platform and channel are configured per item.",
    endoflife: "Uses the EndOfLife.date API for versions and support data. The product name is configured per item.",
    npm: "Queries the NPM registry. The package name is configured per item.",
    pypi: "Queries the Python Package Index (PyPI). The package name is configured per item.",
    repology: "Queries the Repology API for package versions. The project name is configured per item.",
    homebrew: "Queries the Homebrew Formulae API. The formula name is configured per item.",
    wordpress: "Queries the WordPress.org Plugin API. The plugin slug is configured per item.",
    winget: "Queries the winget.run API (API key required). The package ID is configured per item.",
    csv_data: "Looks up versions in the uploaded CSV data. The item name is configured per item.",
    maven: "Queries Maven Central. The artifact is configured per item as groupId:artifactId.",
    nuget: "Queries the NuGet Gallery. The package name is configured per item.",
    gitlab: "Queries the GitLab Releases API (token optional). The project path is configured per item.",
    packagist: "Queries Packagist (PHP/Composer). The package is configured per item as vendor/package.",
    crates: "Queries Crates.io (Rust). The crate name is configured per item.",
    rubygems: "Queries RubyGems.org. The gem name is configured per item.",
    goproxy: "Queries Go Module Proxy. The module path is configured per item.",
    helm: "Queries Artifact Hub for Helm charts. The chart is configured per item as repo/chart.",
    snap: "Queries the Snap Store. The snap name is configured per item.",
    flathub: "Queries Flathub. The Flatpak app ID is configured per item.",
    terraform: "Queries Terraform Registry. The module (namespace/name/provider) or provider: prefix is configured per item.",
    chocolatey: "Queries the Chocolatey community repository. The package ID is configured per item.",
    pub: "Queries Pub.dev (Dart/Flutter). The package name is configured per item.",
    hex: "Queries Hex.pm (Elixir/Erlang). The package name is configured per item.",
    conda: "Queries Anaconda.org. The package is configured per item as channel/package (defaults to conda-forge).",
    cocoapods: "Queries CocoaPods trunk. The pod name is configured per item.",
    cpan: "Queries MetaCPAN (Perl). The distribution name is configured per item.",
    fdroid: "Queries the F-Droid repository. The app ID is configured per item.",
    firefox_addon: "Queries the Firefox Add-ons API (AMO). The addon slug is configured per item.",
    vscode: "Queries the VS Code Marketplace. The extension ID (publisher.name) is configured per item.",
    jetbrains: "Queries the JetBrains Marketplace. The plugin ID is configured per item.",
    openvsx: "Queries the Open VSX Registry. The extension ID (publisher.name) is configured per item.",
    aur: "Queries the Arch User Repository (AUR). The package name is configured per item.",
    ansible: "Queries Ansible Galaxy. The collection (namespace.name) is configured per item.",
    quay: "Queries Quay.io container tags. The repository (namespace/repo) is configured per item.",
    bitbucket: "Queries Bitbucket tags. The repository (workspace/repo) is configured per item.",
    libraries_io: "Queries Libraries.io API (API key required). Platform and package name are configured per item.",
  };
  return descriptions[type] || "";
}

function getTestJsonPlaceholder(type: string): string {
  const placeholders: Record<string, string> = {
    chrome: '{"platform": "win64", "channel": "stable"}',
    libraries_io: '{"platform": "npm", "package": "react"}',
  };
  return placeholders[type] || "{}";
}

function getSimpleTestParamDescriptor(type: string): TestParamDescriptor | null {
  const descriptors: Record<string, TestParamDescriptor> = {
    dockerhub: { key: "image", placeholder: "library/nginx" },
    github: { key: "repo", placeholder: "grafana/grafana" },
    appstore: { key: "bundleId", placeholder: "1113153706" },
    playstore: { key: "appId", placeholder: "com.microsoft.teams" },
    msstore: { key: "productId", placeholder: "9wzdncrfj364" },
    endoflife: { key: "product", placeholder: "nodejs" },
    npm: { key: "package", placeholder: "react" },
    pypi: { key: "package", placeholder: "django" },
    repology: { key: "project", placeholder: "firefox" },
    homebrew: { key: "formula", placeholder: "nginx" },
    wordpress: { key: "slug", placeholder: "woocommerce" },
    winget: { key: "packageId", placeholder: "Google.Chrome" },
    csv_data: { key: "itemName", placeholder: "Google Chrome" },
    maven: { key: "artifact", placeholder: "org.apache.maven:maven-core" },
    nuget: { key: "package", placeholder: "Newtonsoft.Json" },
    gitlab: { key: "project", placeholder: "gitlab-org/gitlab" },
    packagist: { key: "package", placeholder: "laravel/framework" },
    crates: { key: "crate", placeholder: "serde" },
    rubygems: { key: "gem", placeholder: "rails" },
    goproxy: { key: "module", placeholder: "github.com/gin-gonic/gin" },
    helm: { key: "chart", placeholder: "bitnami/nginx" },
    snap: { key: "snap", placeholder: "firefox" },
    flathub: { key: "appId", placeholder: "org.mozilla.firefox" },
    terraform: { key: "module", placeholder: "hashicorp/consul/aws" },
    chocolatey: { key: "package", placeholder: "googlechrome" },
    pub: { key: "package", placeholder: "flutter" },
    hex: { key: "package", placeholder: "phoenix" },
    conda: { key: "package", placeholder: "conda-forge/numpy" },
    cocoapods: { key: "pod", placeholder: "Alamofire" },
    cpan: { key: "distribution", placeholder: "Moose" },
    fdroid: { key: "appId", placeholder: "org.mozilla.fennec_fdroid" },
    firefox_addon: { key: "slug", placeholder: "ublock-origin" },
    vscode: { key: "extensionId", placeholder: "ms-python.python" },
    jetbrains: { key: "pluginId", placeholder: "7322" },
    openvsx: { key: "extensionId", placeholder: "redhat.java" },
    aur: { key: "package", placeholder: "yay" },
    ansible: { key: "collection", placeholder: "community.general" },
    quay: { key: "repository", placeholder: "prometheus/prometheus" },
    bitbucket: { key: "repo", placeholder: "atlassian/python-bitbucket" },
  };
  return descriptors[type] || null;
}

const SOURCES_REQUIRING_CREDENTIALS: Record<string, string> = {
  bitbucket: "bitbucket_token",
};

export function SourceForm({ open, onClose, onSave, source, testOnly }: SourceFormProps) {
  const [data, setData] = useState<SourceData>(EMPTY_SOURCE);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [testParams, setTestParams] = useState("");
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, boolean>>({});
  const t = useTranslation();

  const loadConfiguredKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const json = await res.json();
        setConfiguredKeys(json.hasValues || {});
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) loadConfiguredKeys();
  }, [open, loadConfiguredKeys]);

  const emptyConfigFields: Record<string, string> = {
    url: "",
    jsonPath: "",
    headers: "",
    selector: "",
    regex: "",
    releaseNotesPath: "",
    releaseDatePath: "",
    releaseUrlPath: "",
    releaseNotesSelector: "",
    releaseDateSelector: "",
    releaseUrlSelector: "",
  };

  const [configFields, setConfigFields] = useState<Record<string, string>>(emptyConfigFields);

  useEffect(() => {
    if (source) {
      setData(source);
      const cfg = parseConfig(source.config);
      setConfigFields({
        ...emptyConfigFields,
        url: (cfg.url as string) || "",
        jsonPath: (cfg.jsonPath as string) || "",
        headers: cfg.headers ? JSON.stringify(cfg.headers, null, 2) : "",
        selector: (cfg.selector as string) || "",
        regex: (cfg.regex as string) || "",
        releaseNotesPath: (cfg.releaseNotesPath as string) || "",
        releaseDatePath: (cfg.releaseDatePath as string) || "",
        releaseUrlPath: (cfg.releaseUrlPath as string) || "",
        releaseNotesSelector: (cfg.releaseNotesSelector as string) || "",
        releaseDateSelector: (cfg.releaseDateSelector as string) || "",
        releaseUrlSelector: (cfg.releaseUrlSelector as string) || "",
      });
    } else {
      setData(EMPTY_SOURCE);
      setConfigFields(emptyConfigFields);
    }
    setTestResult(null);
    setTestParams("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, open]);

  const handleTypeChange = (newType: string) => {
    setData({ ...data, type: newType });
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const finalConfig =
      data.type === "json_api" || data.type === "html"
        ? buildConfig(data.type, configFields)
        : "{}";

    await onSave({ ...data, config: finalConfig });
    setSaving(false);
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    const finalConfig =
      data.type === "json_api" || data.type === "html"
        ? buildConfig(data.type, configFields)
        : "{}";

    const tempData = { ...data, config: finalConfig };

    try {
      let sourceId = tempData.id;

      if (testOnly && sourceId) {
        // Built-in test-only mode: skip create/update, use existing source directly
      } else if (!sourceId) {
        const createRes = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tempData),
        });
        if (!createRes.ok) { setTesting(false); return; }
        const created = await createRes.json();
        sourceId = created.id;
      } else {
        await fetch(`/api/sources/${sourceId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tempData),
        });
      }

      let params: Record<string, string> = {};
      if (testParams.trim()) {
        try {
          params = JSON.parse(testParams);
        } catch {
          if (testParamDescriptor) {
            params = { [testParamDescriptor.key]: testParams.trim() };
          }
        }
      }

      const res = await fetch(`/api/sources/${sourceId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params }),
      });
      const result = await res.json();
      setTestResult({
        success: result.success,
        version: result.version,
        duration: result.duration,
        releaseNotes: result.releaseNotes,
        releaseDate: result.releaseDate,
        releaseUrl: result.releaseUrl,
        cves: result.cves,
        description: result.description,
      });

      if (!tempData.id) {
        setData({ ...data, id: sourceId });
      }
    } catch {
      setTestResult({ success: false, version: null, duration: 0 });
    } finally {
      setTesting(false);
    }
  };

  function isSourceMissingCredentials(type: string): boolean {
    const settingKey = SOURCES_REQUIRING_CREDENTIALS[type];
    if (!settingKey) return false;
    return !configuredKeys[settingKey];
  }

  const typeOptions = [
    "json_api", "html", "dockerhub", "github", "appstore", "playstore",
    "msstore", "chrome", "endoflife", "npm", "pypi", "repology",
    "homebrew", "wordpress", "winget", "csv_data", "maven", "nuget",
    "gitlab", "packagist", "crates", "rubygems", "goproxy", "helm",
    "snap", "flathub", "terraform", "chocolatey", "pub", "hex",
    "conda", "cocoapods", "cpan", "fdroid", "firefox_addon", "vscode",
    "jetbrains", "openvsx", "aur", "ansible", "quay", "bitbucket",
    "libraries_io",
  ].map((type) => {
    const label = t.sources.types[type as keyof typeof t.sources.types] || type;
    const missing = isSourceMissingCredentials(type);
    return {
      value: type,
      label: missing ? `${label} (${t.sources.credentialsRequired})` : label,
      disabled: missing,
    };
  });

  const isBuiltIn = source?.isBuiltIn ?? false;
  const needsParams = PARAM_ONLY_TYPES.includes(data.type);
  const testParamDescriptor = getSimpleTestParamDescriptor(data.type);
  const testParamLabel = testParamDescriptor
    ? `${t.sources.testParams} (${t.sources.fields[testParamDescriptor.key as keyof typeof t.sources.fields] || testParamDescriptor.key})`
    : t.sources.testParams;
  const testParamPlaceholder = testParamDescriptor
    ? testParamDescriptor.placeholder
    : getTestJsonPlaceholder(data.type);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={testOnly ? t.sources.testSource : (source ? t.sources.editSource : t.sources.addSource)}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!testOnly && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="name"
                label={t.sources.name}
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                placeholder={t.sources.placeholders.name}
                required
              />
              <Select
                id="type"
                label={t.sources.type}
                options={typeOptions}
                value={data.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                disabled={isBuiltIn}
              />
            </div>

            <Input
              id="description"
              label={t.sources.description}
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder={t.sources.placeholders.description}
            />
          </>
        )}

        {!testOnly && data.type === "json_api" && (
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <p className="text-sm font-medium text-muted-foreground">JSON API configuration</p>
            <Input
              id="url"
              label={t.sources.fields.url}
              value={configFields.url}
              onChange={(e) => setConfigFields({ ...configFields, url: e.target.value })}
              placeholder={t.sources.placeholders.url}
              required
            />
            <Input
              id="jsonPath"
              label={t.sources.fields.jsonPath}
              value={configFields.jsonPath}
              onChange={(e) => setConfigFields({ ...configFields, jsonPath: e.target.value })}
              placeholder={t.sources.placeholders.jsonPath}
              required
            />
            <Input
              id="headers"
              label={t.sources.fields.headers}
              value={configFields.headers}
              onChange={(e) => setConfigFields({ ...configFields, headers: e.target.value })}
              placeholder={t.sources.placeholders.headers}
            />
            <div className="border-t pt-3 mt-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t.sources.metadataOptional}</p>
              <div className="space-y-2">
                <Input
                  id="releaseNotesPath"
                  label={t.sources.fields.releaseNotesPath}
                  value={configFields.releaseNotesPath}
                  onChange={(e) => setConfigFields({ ...configFields, releaseNotesPath: e.target.value })}
                  placeholder={t.sources.placeholders.releaseNotesPath}
                />
                <Input
                  id="releaseDatePath"
                  label={t.sources.fields.releaseDatePath}
                  value={configFields.releaseDatePath}
                  onChange={(e) => setConfigFields({ ...configFields, releaseDatePath: e.target.value })}
                  placeholder={t.sources.placeholders.releaseDatePath}
                />
                <Input
                  id="releaseUrlPath"
                  label={t.sources.fields.releaseUrlPath}
                  value={configFields.releaseUrlPath}
                  onChange={(e) => setConfigFields({ ...configFields, releaseUrlPath: e.target.value })}
                  placeholder={t.sources.placeholders.releaseUrlPath}
                />
              </div>
            </div>
          </div>
        )}

        {!testOnly && data.type === "html" && (
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <p className="text-sm font-medium text-muted-foreground">HTML Scraping configuration</p>
            <Input
              id="url"
              label={t.sources.fields.url}
              value={configFields.url}
              onChange={(e) => setConfigFields({ ...configFields, url: e.target.value })}
              placeholder={t.sources.placeholders.url}
              required
            />
            <Input
              id="selector"
              label={t.sources.fields.selector}
              value={configFields.selector}
              onChange={(e) => setConfigFields({ ...configFields, selector: e.target.value })}
              placeholder={t.sources.placeholders.selector}
              required
            />
            <Input
              id="regex"
              label={t.sources.fields.regex}
              value={configFields.regex}
              onChange={(e) => setConfigFields({ ...configFields, regex: e.target.value })}
              placeholder={t.sources.placeholders.regex}
            />
            <Input
              id="htmlHeaders"
              label={t.sources.fields.headers}
              value={configFields.headers}
              onChange={(e) => setConfigFields({ ...configFields, headers: e.target.value })}
              placeholder={t.sources.placeholders.headers}
            />
            <div className="border-t pt-3 mt-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t.sources.metadataOptional}</p>
              <div className="space-y-2">
                <Input
                  id="releaseNotesSelector"
                  label={t.sources.fields.releaseNotesSelector}
                  value={configFields.releaseNotesSelector}
                  onChange={(e) => setConfigFields({ ...configFields, releaseNotesSelector: e.target.value })}
                  placeholder={t.sources.placeholders.releaseNotesSelector}
                />
                <Input
                  id="releaseDateSelector"
                  label={t.sources.fields.releaseDateSelector}
                  value={configFields.releaseDateSelector}
                  onChange={(e) => setConfigFields({ ...configFields, releaseDateSelector: e.target.value })}
                  placeholder={t.sources.placeholders.releaseDateSelector}
                />
                <Input
                  id="releaseUrlSelector"
                  label={t.sources.fields.releaseUrlSelector}
                  value={configFields.releaseUrlSelector}
                  onChange={(e) => setConfigFields({ ...configFields, releaseUrlSelector: e.target.value })}
                  placeholder={t.sources.placeholders.releaseUrlSelector}
                />
              </div>
            </div>
          </div>
        )}

        {!testOnly && PARAM_ONLY_TYPES.includes(data.type) && !isBuiltIn && (
          <div className="rounded-lg border p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              {getTypeDescription(data.type)}
            </p>
          </div>
        )}

        {/* Test section */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              {t.sources.testSource}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleTest}
              disabled={testing || (!data.name)}
            >
              {testing ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> {t.sources.testRunning}</>
              ) : (
                t.sources.testSource
              )}
            </Button>
          </div>

          {needsParams && (
            <div className="space-y-1.5">
              <Input
                id="testParams"
                label={testParamLabel}
                value={testParams}
                onChange={(e) => setTestParams(e.target.value)}
                placeholder={testParamPlaceholder}
              />
              {testParamDescriptor && (
                <p className="text-xs text-muted-foreground">
                  {t.sources.fields[testParamDescriptor.key as keyof typeof t.sources.fields]}: <code>{testParamDescriptor.placeholder}</code>
                </p>
              )}
            </div>
          )}

          {testResult && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                {testResult.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-medium text-emerald-600">{t.sources.testVersion}:</span>{" "}
                      <Badge variant="success">{testResult.version}</Badge>
                      <span className="ml-2 text-muted-foreground">({testResult.duration}ms)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                    <span className="text-destructive">{t.sources.testFailed}</span>
                  </>
                )}
              </div>
              {testResult.success && (testResult.releaseNotes || testResult.releaseDate || testResult.releaseUrl || testResult.cves || testResult.description) && (
                <div className="ml-8 space-y-1 text-xs text-muted-foreground border-l-2 pl-3">
                  {testResult.description && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{testResult.description}</span>
                    </div>
                  )}
                  {testResult.releaseNotes && (
                    <div className="flex items-start gap-1.5">
                      <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                      <div className="max-h-40 overflow-y-auto w-full">
                        <RenderedContent content={testResult.releaseNotes} />
                      </div>
                    </div>
                  )}
                  {testResult.releaseDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{testResult.releaseDate}</span>
                    </div>
                  )}
                  {testResult.releaseUrl && (
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <a href={testResult.releaseUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                        {testResult.releaseUrl}
                      </a>
                    </div>
                  )}
                  {testResult.cves && testResult.cves.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 shrink-0 text-destructive" />
                      <div className="flex flex-wrap gap-1">
                        {testResult.cves.map((cve) => (
                          <Badge key={cve} variant="critical" className="text-[10px] px-1 py-0">
                            {cve}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {testOnly ? t.common.close : t.common.cancel}
          </Button>
          {!testOnly && (
            <Button type="submit" disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
