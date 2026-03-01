"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { useTranslation } from "@/i18n/config";

interface CheckSource {
  id: string;
  name: string;
  type: string;
}

interface ItemData {
  id?: string;
  name: string;
  userNote?: string | null;
  type: string;
  currentVersion: string;
  latestVersion: string;
  checkMethod: string;
  checkConfig: string;
  sourceId: string;
  sourceParams: string;
  status: string;
  assetCriticality?: number | null;
  environment?: string | null;
  networkExposure?: string | null;
  hostsSensitiveData?: boolean | null;
  hasPrivilegedAccess?: boolean | null;
  hasCompensatingControls?: boolean | null;
  tags?: string[];
}

interface ItemFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ItemData) => Promise<void>;
  item?: ItemData | null;
}

const EMPTY_ITEM: ItemData = {
  name: "",
  userNote: "",
  type: "software",
  currentVersion: "",
  latestVersion: "",
  checkMethod: "manual",
  checkConfig: "",
  sourceId: "",
  sourceParams: "",
  status: "up_to_date",
  assetCriticality: null,
  environment: null,
  networkExposure: null,
  hostsSensitiveData: null,
  hasPrivilegedAccess: null,
  hasCompensatingControls: null,
};

function boolToSelect(value: boolean | null | undefined): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

function selectToBool(value: string): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function ItemForm({ open, onClose, onSave, item }: ItemFormProps) {
  const [data, setData] = useState<ItemData>(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [sources, setSources] = useState<CheckSource[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [paramFields, setParamFields] = useState<Record<string, string>>({
    image: "", repo: "", bundleId: "", country: "de", appId: "", productId: "",
    product: "", package: "", project: "", formula: "", slug: "", packageId: "",
    platform: "win64", channel: "stable", itemName: "",
    artifact: "", crate: "", gem: "", module: "", chart: "", snap: "",
    pod: "", distribution: "", collection: "", extensionId: "", pluginId: "",
    repository: "",
  });
  const t = useTranslation();

  useEffect(() => {
    if (open) {
      fetch("/api/sources")
        .then((r) => r.json())
        .then((d) => setSources(d.data || []))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (item) {
      setData(item);
      let parsed: string[] = [];
      if (Array.isArray(item.tags)) parsed = item.tags;
      else if (typeof item.tags === "string") {
        try { parsed = JSON.parse(item.tags); } catch { /* skip */ }
        if (!Array.isArray(parsed)) parsed = [];
      }
      setTags(parsed);
      setTagInput("");
      let params: Record<string, string> = {};
      if (item.sourceParams) {
        try { params = JSON.parse(item.sourceParams); } catch { /* skip */ }
      }
      setParamFields({
        image: params.image || "", repo: params.repo || "",
        bundleId: params.bundleId || "", country: params.country || "de",
        appId: params.appId || "", productId: params.productId || "",
        product: params.product || "", package: params.package || "",
        project: params.project || "", formula: params.formula || "",
        slug: params.slug || "", packageId: params.packageId || "",
        platform: params.platform || "win64", channel: params.channel || "stable",
        itemName: params.itemName || "",
        artifact: params.artifact || "", crate: params.crate || "",
        gem: params.gem || "", module: params.module || "",
        chart: params.chart || "", snap: params.snap || "",
        pod: params.pod || "", distribution: params.distribution || "",
        collection: params.collection || "", extensionId: params.extensionId || "",
        pluginId: params.pluginId || "", repository: params.repository || "",
      });
    } else {
      setData(EMPTY_ITEM);
      setTags([]);
      setTagInput("");
      setParamFields({
        image: "", repo: "", bundleId: "", country: "de", appId: "", productId: "",
        product: "", package: "", project: "", formula: "", slug: "", packageId: "",
        platform: "win64", channel: "stable", itemName: "",
        artifact: "", crate: "", gem: "", module: "", chart: "", snap: "",
        pod: "", distribution: "", collection: "", extensionId: "", pluginId: "",
        repository: "",
      });
    }
  }, [item, open]);

  const selectedSource = sources.find((s) => s.id === data.sourceId);

  const handleSourceChange = (sourceId: string) => {
    if (sourceId) {
      setData({ ...data, sourceId, checkMethod: "api" });
    } else {
      setData({ ...data, sourceId: "", checkMethod: "manual", sourceParams: "" });
      setParamFields({
        image: "", repo: "", bundleId: "", country: "de", appId: "", productId: "",
        product: "", package: "", project: "", formula: "", slug: "", packageId: "",
        platform: "win64", channel: "stable", itemName: "",
        artifact: "", crate: "", gem: "", module: "", chart: "", snap: "",
        pod: "", distribution: "", collection: "", extensionId: "", pluginId: "",
        repository: "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const finalData = { ...data, tags };
    finalData.userNote = (finalData.userNote ?? "").trim() || null;

    if (selectedSource) {
      if (selectedSource.type === "dockerhub") {
        finalData.sourceParams = JSON.stringify({ image: paramFields.image });
        finalData.checkConfig = JSON.stringify({ source: "dockerhub", image: paramFields.image });
      } else if (selectedSource.type === "github") {
        finalData.sourceParams = JSON.stringify({ repo: paramFields.repo });
        finalData.checkConfig = JSON.stringify({ source: "github", repo: paramFields.repo });
      } else if (selectedSource.type === "appstore") {
        finalData.sourceParams = JSON.stringify({ bundleId: paramFields.bundleId, country: paramFields.country || "de" });
      } else if (selectedSource.type === "playstore") {
        finalData.sourceParams = JSON.stringify({ appId: paramFields.appId });
      } else if (selectedSource.type === "msstore") {
        finalData.sourceParams = JSON.stringify({ productId: paramFields.productId });
      } else if (selectedSource.type === "endoflife") {
        finalData.sourceParams = JSON.stringify({ product: paramFields.product });
      } else if (selectedSource.type === "npm") {
        finalData.sourceParams = JSON.stringify({ package: paramFields.package });
      } else if (selectedSource.type === "pypi") {
        finalData.sourceParams = JSON.stringify({ package: paramFields.package });
      } else if (selectedSource.type === "repology") {
        finalData.sourceParams = JSON.stringify({ project: paramFields.project });
      } else if (selectedSource.type === "homebrew") {
        finalData.sourceParams = JSON.stringify({ formula: paramFields.formula });
      } else if (selectedSource.type === "wordpress") {
        finalData.sourceParams = JSON.stringify({ slug: paramFields.slug });
      } else if (selectedSource.type === "winget") {
        finalData.sourceParams = JSON.stringify({ packageId: paramFields.packageId });
      } else if (selectedSource.type === "chrome") {
        finalData.sourceParams = JSON.stringify({ platform: paramFields.platform || "win64", channel: paramFields.channel || "stable" });
      } else if (selectedSource.type === "csv_data") {
        finalData.sourceParams = JSON.stringify({ itemName: paramFields.itemName });
      } else if (selectedSource.type === "maven") {
        finalData.sourceParams = JSON.stringify({ artifact: paramFields.artifact });
      } else if (selectedSource.type === "nuget" || selectedSource.type === "packagist" || selectedSource.type === "chocolatey") {
        finalData.sourceParams = JSON.stringify({ package: paramFields.package });
      } else if (selectedSource.type === "gitlab") {
        finalData.sourceParams = JSON.stringify({ project: paramFields.project });
      } else if (selectedSource.type === "crates") {
        finalData.sourceParams = JSON.stringify({ crate: paramFields.crate });
      } else if (selectedSource.type === "rubygems") {
        finalData.sourceParams = JSON.stringify({ gem: paramFields.gem });
      } else if (selectedSource.type === "goproxy" || selectedSource.type === "terraform") {
        finalData.sourceParams = JSON.stringify({ module: paramFields.module });
      } else if (selectedSource.type === "helm") {
        finalData.sourceParams = JSON.stringify({ chart: paramFields.chart });
      } else if (selectedSource.type === "snap") {
        finalData.sourceParams = JSON.stringify({ snap: paramFields.snap });
      } else if (selectedSource.type === "flathub") {
        finalData.sourceParams = JSON.stringify({ appId: paramFields.appId });
      } else if (selectedSource.type === "pub" || selectedSource.type === "hex" || selectedSource.type === "conda" || selectedSource.type === "aur") {
        finalData.sourceParams = JSON.stringify({ package: paramFields.package });
      } else if (selectedSource.type === "cocoapods") {
        finalData.sourceParams = JSON.stringify({ pod: paramFields.pod });
      } else if (selectedSource.type === "cpan") {
        finalData.sourceParams = JSON.stringify({ distribution: paramFields.distribution });
      } else if (selectedSource.type === "fdroid") {
        finalData.sourceParams = JSON.stringify({ appId: paramFields.appId });
      } else if (selectedSource.type === "firefox_addon") {
        finalData.sourceParams = JSON.stringify({ slug: paramFields.slug });
      } else if (selectedSource.type === "vscode" || selectedSource.type === "openvsx") {
        finalData.sourceParams = JSON.stringify({ extensionId: paramFields.extensionId });
      } else if (selectedSource.type === "jetbrains") {
        finalData.sourceParams = JSON.stringify({ pluginId: paramFields.pluginId });
      } else if (selectedSource.type === "ansible") {
        finalData.sourceParams = JSON.stringify({ collection: paramFields.collection });
      } else if (selectedSource.type === "quay") {
        finalData.sourceParams = JSON.stringify({ repository: paramFields.repository });
      } else if (selectedSource.type === "bitbucket") {
        finalData.sourceParams = JSON.stringify({ repo: paramFields.repo });
      } else {
        finalData.sourceParams = "{}";
      }
      finalData.checkMethod = "api";
    } else {
      finalData.sourceId = "";
      finalData.sourceParams = "";
    }

    await onSave(finalData);
    setSaving(false);
    onClose();
  };

  const typeOptions = [
    { value: "software", label: t.items.types.software },
    { value: "system", label: t.items.types.system },
    { value: "docker", label: t.items.types.docker },
    { value: "service", label: t.items.types.service },
    { value: "firmware", label: t.items.types.firmware },
    { value: "plugin", label: t.items.types.plugin },
    { value: "library", label: t.items.types.library },
    { value: "database", label: t.items.types.database },
    { value: "network", label: t.items.types.network },
    { value: "mobile_app", label: t.items.types.mobile_app },
    { value: "desktop_app", label: t.items.types.desktop_app },
    { value: "web_app", label: t.items.types.web_app },
    { value: "os", label: t.items.types.os },
    { value: "driver", label: t.items.types.driver },
    { value: "iot", label: t.items.types.iot },
  ];

  const statusOptions = [
    { value: "up_to_date", label: t.items.statuses.up_to_date },
    { value: "outdated", label: t.items.statuses.outdated },
    { value: "end_of_life", label: t.itemDetail.eolReached },
  ];

  const sourceOptions = [
    { value: "", label: t.items.noSource },
    ...sources.map((s) => ({
      value: s.id,
      label: `${s.name} (${t.sources.types[s.type as keyof typeof t.sources.types] || s.type})`,
    })),
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? t.items.editItem : t.items.addItem}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label={t.items.name}
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          required
        />
        <Input
          id="userNote"
          label="Note"
          value={data.userNote ?? ""}
          onChange={(e) => setData({ ...data, userNote: e.target.value.slice(0, 30) })}
          placeholder="Note"
          maxLength={30}
        />
        <p className="text-xs text-muted-foreground -mt-2 text-right">
          {(data.userNote ?? "").length}/30
        </p>

        <div>
          <label className="text-sm font-medium leading-none mb-1.5 block">{t.items.tags}</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((v) => v !== tag))}
                  className="hover:text-destructive ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder={t.items.addTag}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                e.preventDefault();
                const newTag = tagInput.trim().slice(0, 30);
                if (newTag && !tags.includes(newTag) && tags.length < 10) {
                  setTags([...tags, newTag]);
                }
                setTagInput("");
              }
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t.items.tagHint ?? "Separate tags with Enter or comma"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            id="type"
            label={t.items.type}
            options={typeOptions}
            value={data.type}
            onChange={(e) => setData({ ...data, type: e.target.value })}
          />
          <Select
            id="status"
            label={t.items.status}
            options={statusOptions}
            value={data.status}
            onChange={(e) => setData({ ...data, status: e.target.value })}
          />
        </div>

        <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
          <p className="text-sm font-medium">{t.items.riskContextTitle}</p>
          <p className="text-xs text-muted-foreground">
            {t.items.riskContextHint}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Select
              id="assetCriticality"
              label={t.items.assetCriticality}
              options={[
                { value: "", label: t.items.notSpecified },
                { value: "0", label: `0 - ${t.itemDetail.bptLow}` },
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: `3 - ${t.itemDetail.bptMedium}` },
                { value: "4", label: "4" },
                { value: "5", label: `5 - ${t.itemDetail.bptCritical}` },
              ]}
              value={data.assetCriticality === null || data.assetCriticality === undefined ? "" : String(data.assetCriticality)}
              onChange={(e) => setData({
                ...data,
                assetCriticality: e.target.value === "" ? null : Number(e.target.value),
              })}
            />
            <Select
              id="environment"
              label={t.items.environment}
              options={[
                { value: "", label: t.items.notSpecified },
                { value: "prod", label: t.items.environmentProd },
                { value: "preprod", label: t.items.environmentPreprod },
                { value: "test", label: t.items.environmentTest },
                { value: "dev", label: t.items.environmentDev },
              ]}
              value={data.environment ?? ""}
              onChange={(e) => setData({ ...data, environment: e.target.value || null })}
            />
            <Select
              id="networkExposure"
              label={t.items.networkExposure}
              options={[
                { value: "", label: t.items.notSpecified },
                { value: "internet", label: t.items.networkExposureInternet },
                { value: "intranet", label: t.items.networkExposureIntranet },
                { value: "isolated", label: t.items.networkExposureIsolated },
              ]}
              value={data.networkExposure ?? ""}
              onChange={(e) => setData({ ...data, networkExposure: e.target.value || null })}
            />
            <Select
              id="hostsSensitiveData"
              label={t.items.sensitiveData}
              options={[
                { value: "", label: t.items.notSpecified },
                { value: "yes", label: t.common.yes },
                { value: "no", label: t.common.no },
              ]}
              value={boolToSelect(data.hostsSensitiveData)}
              onChange={(e) => setData({ ...data, hostsSensitiveData: selectToBool(e.target.value) })}
            />
            <Select
              id="hasPrivilegedAccess"
              label={t.items.privilegedAccess}
              options={[
                { value: "", label: t.items.notSpecified },
                { value: "yes", label: t.common.yes },
                { value: "no", label: t.common.no },
              ]}
              value={boolToSelect(data.hasPrivilegedAccess)}
              onChange={(e) => setData({ ...data, hasPrivilegedAccess: selectToBool(e.target.value) })}
            />
            <Select
              id="hasCompensatingControls"
              label={t.items.compensatingControls}
              options={[
                { value: "", label: t.items.notSpecified },
                { value: "yes", label: t.common.yes },
                { value: "no", label: t.common.no },
              ]}
              value={boolToSelect(data.hasCompensatingControls)}
              onChange={(e) => setData({ ...data, hasCompensatingControls: selectToBool(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="currentVersion"
            label={t.items.currentVersion}
            value={data.currentVersion}
            onChange={(e) => setData({ ...data, currentVersion: e.target.value })}
            placeholder="1.0.0"
          />
          <Input
            id="latestVersion"
            label={t.items.latestVersion}
            value={data.latestVersion}
            onChange={(e) => setData({ ...data, latestVersion: e.target.value })}
            placeholder="1.0.0"
          />
        </div>

        <Select
          id="source"
          label={t.items.source}
          options={sourceOptions}
          value={data.sourceId}
          onChange={(e) => handleSourceChange(e.target.value)}
        />

        {selectedSource?.type === "dockerhub" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="dockerImage"
              label={t.sources.fields.image}
              value={paramFields.image}
              onChange={(e) => setParamFields({ ...paramFields, image: e.target.value })}
              placeholder={t.sources.placeholders.image}
              required
            />
          </div>
        )}

        {selectedSource?.type === "github" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="githubRepo"
              label={t.sources.fields.repo}
              value={paramFields.repo}
              onChange={(e) => setParamFields({ ...paramFields, repo: e.target.value })}
              placeholder={t.sources.placeholders.repo}
              required
            />
          </div>
        )}

        {selectedSource?.type === "appstore" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="bundleId"
              label={t.sources.fields.bundleId}
              value={paramFields.bundleId}
              onChange={(e) => setParamFields({ ...paramFields, bundleId: e.target.value })}
              placeholder={t.sources.placeholders.bundleId}
              required
            />
            <Input
              id="country"
              label={t.sources.fields.country}
              value={paramFields.country}
              onChange={(e) => setParamFields({ ...paramFields, country: e.target.value })}
              placeholder={t.sources.placeholders.country}
            />
          </div>
        )}

        {selectedSource?.type === "playstore" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="appId"
              label={t.sources.fields.appId}
              value={paramFields.appId}
              onChange={(e) => setParamFields({ ...paramFields, appId: e.target.value })}
              placeholder={t.sources.placeholders.appId}
              required
            />
          </div>
        )}

        {selectedSource?.type === "msstore" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="productId"
              label={t.sources.fields.productId}
              value={paramFields.productId}
              onChange={(e) => setParamFields({ ...paramFields, productId: e.target.value })}
              placeholder={t.sources.placeholders.productId}
              required
            />
          </div>
        )}

        {selectedSource?.type === "endoflife" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="product"
              label={t.sources.fields.product}
              value={paramFields.product}
              onChange={(e) => setParamFields({ ...paramFields, product: e.target.value })}
              placeholder={t.sources.placeholders.product}
              required
            />
          </div>
        )}

        {(selectedSource?.type === "npm" || selectedSource?.type === "pypi") && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="package"
              label={t.sources.fields.package}
              value={paramFields.package}
              onChange={(e) => setParamFields({ ...paramFields, package: e.target.value })}
              placeholder={t.sources.placeholders.package}
              required
            />
          </div>
        )}

        {selectedSource?.type === "repology" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="project"
              label={t.sources.fields.project}
              value={paramFields.project}
              onChange={(e) => setParamFields({ ...paramFields, project: e.target.value })}
              placeholder={t.sources.placeholders.project}
              required
            />
          </div>
        )}

        {selectedSource?.type === "homebrew" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="formula"
              label={t.sources.fields.formula}
              value={paramFields.formula}
              onChange={(e) => setParamFields({ ...paramFields, formula: e.target.value })}
              placeholder={t.sources.placeholders.formula}
              required
            />
          </div>
        )}

        {selectedSource?.type === "wordpress" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="slug"
              label={t.sources.fields.slug}
              value={paramFields.slug}
              onChange={(e) => setParamFields({ ...paramFields, slug: e.target.value })}
              placeholder={t.sources.placeholders.slug}
              required
            />
          </div>
        )}

        {selectedSource?.type === "winget" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="packageId"
              label={t.sources.fields.packageId}
              value={paramFields.packageId}
              onChange={(e) => setParamFields({ ...paramFields, packageId: e.target.value })}
              placeholder={t.sources.placeholders.packageId}
              required
            />
          </div>
        )}

        {selectedSource?.type === "csv_data" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="itemName"
              label={t.sources.fields.itemName}
              value={paramFields.itemName}
              onChange={(e) => setParamFields({ ...paramFields, itemName: e.target.value })}
              placeholder={t.sources.placeholders.itemName}
              required
            />
          </div>
        )}

        {selectedSource?.type === "chrome" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="platform"
              label={t.sources.fields.platform}
              value={paramFields.platform}
              onChange={(e) => setParamFields({ ...paramFields, platform: e.target.value })}
              placeholder={t.sources.placeholders.platform}
            />
            <Input
              id="channel"
              label={t.sources.fields.channel}
              value={paramFields.channel}
              onChange={(e) => setParamFields({ ...paramFields, channel: e.target.value })}
              placeholder={t.sources.placeholders.channel}
            />
          </div>
        )}

        {selectedSource?.type === "maven" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="artifact"
              label={t.sources.fields.artifact}
              value={paramFields.artifact}
              onChange={(e) => setParamFields({ ...paramFields, artifact: e.target.value })}
              placeholder={t.sources.placeholders.artifact}
              required
            />
          </div>
        )}

        {(selectedSource?.type === "nuget" || selectedSource?.type === "packagist" || selectedSource?.type === "chocolatey") && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="packageNew"
              label={selectedSource.type === "chocolatey" ? t.sources.fields.chocoPackage : t.sources.fields.package}
              value={paramFields.package}
              onChange={(e) => setParamFields({ ...paramFields, package: e.target.value })}
              placeholder={
                selectedSource.type === "nuget" ? "e.g. Newtonsoft.Json"
                : selectedSource.type === "packagist" ? "e.g. laravel/framework"
                : t.sources.placeholders.chocoPackage
              }
              required
            />
          </div>
        )}

        {selectedSource?.type === "gitlab" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="gitlabProject"
              label={t.sources.fields.gitlabProject}
              value={paramFields.project}
              onChange={(e) => setParamFields({ ...paramFields, project: e.target.value })}
              placeholder={t.sources.placeholders.gitlabProject}
              required
            />
          </div>
        )}

        {selectedSource?.type === "crates" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="crate"
              label={t.sources.fields.crate}
              value={paramFields.crate}
              onChange={(e) => setParamFields({ ...paramFields, crate: e.target.value })}
              placeholder={t.sources.placeholders.crate}
              required
            />
          </div>
        )}

        {selectedSource?.type === "rubygems" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="gem"
              label={t.sources.fields.gem}
              value={paramFields.gem}
              onChange={(e) => setParamFields({ ...paramFields, gem: e.target.value })}
              placeholder={t.sources.placeholders.gem}
              required
            />
          </div>
        )}

        {(selectedSource?.type === "goproxy" || selectedSource?.type === "terraform") && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="module"
              label={selectedSource.type === "terraform" ? t.sources.fields.terraformModule : t.sources.fields.module}
              value={paramFields.module}
              onChange={(e) => setParamFields({ ...paramFields, module: e.target.value })}
              placeholder={selectedSource.type === "terraform" ? t.sources.placeholders.terraformModule : t.sources.placeholders.module}
              required
            />
          </div>
        )}

        {selectedSource?.type === "helm" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="chart"
              label={t.sources.fields.chart}
              value={paramFields.chart}
              onChange={(e) => setParamFields({ ...paramFields, chart: e.target.value })}
              placeholder={t.sources.placeholders.chart}
              required
            />
          </div>
        )}

        {selectedSource?.type === "snap" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="snap"
              label={t.sources.fields.snap}
              value={paramFields.snap}
              onChange={(e) => setParamFields({ ...paramFields, snap: e.target.value })}
              placeholder={t.sources.placeholders.snapPkg}
              required
            />
          </div>
        )}

        {selectedSource?.type === "flathub" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="flatpakAppId"
              label={t.sources.fields.appIdFlathub}
              value={paramFields.appId}
              onChange={(e) => setParamFields({ ...paramFields, appId: e.target.value })}
              placeholder={t.sources.placeholders.appIdFlathub}
              required
            />
          </div>
        )}

        {(selectedSource?.type === "pub" || selectedSource?.type === "hex" || selectedSource?.type === "conda" || selectedSource?.type === "aur") && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="newPkgParam"
              label={t.sources.fields.package}
              value={paramFields.package}
              onChange={(e) => setParamFields({ ...paramFields, package: e.target.value })}
              placeholder={
                selectedSource.type === "pub" ? "e.g. flutter"
                : selectedSource.type === "hex" ? "e.g. phoenix"
                : selectedSource.type === "conda" ? "e.g. conda-forge/numpy"
                : "e.g. yay"
              }
              required
            />
          </div>
        )}

        {selectedSource?.type === "cocoapods" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="pod"
              label={t.sources.fields.pod}
              value={paramFields.pod}
              onChange={(e) => setParamFields({ ...paramFields, pod: e.target.value })}
              placeholder={t.sources.placeholders.pod}
              required
            />
          </div>
        )}

        {selectedSource?.type === "cpan" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="distribution"
              label={t.sources.fields.distribution}
              value={paramFields.distribution}
              onChange={(e) => setParamFields({ ...paramFields, distribution: e.target.value })}
              placeholder={t.sources.placeholders.distribution}
              required
            />
          </div>
        )}

        {selectedSource?.type === "fdroid" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="fdroidAppId"
              label={t.sources.fields.appId}
              value={paramFields.appId}
              onChange={(e) => setParamFields({ ...paramFields, appId: e.target.value })}
              placeholder="e.g. org.mozilla.fennec_fdroid"
              required
            />
          </div>
        )}

        {selectedSource?.type === "firefox_addon" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="firefoxSlug"
              label={t.sources.fields.slug}
              value={paramFields.slug}
              onChange={(e) => setParamFields({ ...paramFields, slug: e.target.value })}
              placeholder="e.g. ublock-origin"
              required
            />
          </div>
        )}

        {(selectedSource?.type === "vscode" || selectedSource?.type === "openvsx") && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="extensionId"
              label={t.sources.fields.extensionId}
              value={paramFields.extensionId}
              onChange={(e) => setParamFields({ ...paramFields, extensionId: e.target.value })}
              placeholder={t.sources.placeholders.extensionId}
              required
            />
          </div>
        )}

        {selectedSource?.type === "jetbrains" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="pluginId"
              label={t.sources.fields.pluginId}
              value={paramFields.pluginId}
              onChange={(e) => setParamFields({ ...paramFields, pluginId: e.target.value })}
              placeholder={t.sources.placeholders.pluginId}
              required
            />
          </div>
        )}

        {selectedSource?.type === "ansible" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="collection"
              label={t.sources.fields.collection}
              value={paramFields.collection}
              onChange={(e) => setParamFields({ ...paramFields, collection: e.target.value })}
              placeholder={t.sources.placeholders.collection}
              required
            />
          </div>
        )}

        {selectedSource?.type === "quay" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="repository"
              label={t.sources.fields.repository}
              value={paramFields.repository}
              onChange={(e) => setParamFields({ ...paramFields, repository: e.target.value })}
              placeholder={t.sources.placeholders.repository}
              required
            />
          </div>
        )}

        {selectedSource?.type === "bitbucket" && (
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <Input
              id="bitbucketRepo"
              label={t.sources.fields.repo}
              value={paramFields.repo}
              onChange={(e) => setParamFields({ ...paramFields, repo: e.target.value })}
              placeholder="e.g. atlassian/python-bitbucket"
              required
            />
          </div>
        )}

        {selectedSource && ["json_api", "html"].includes(selectedSource.type) && (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              ✓ {t.sources.types[selectedSource.type as keyof typeof t.sources.types]}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t.common.loading : t.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
