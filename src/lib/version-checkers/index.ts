import { prisma } from "@/lib/prisma";
import { checkDockerHub } from "./docker-hub";
import { checkGitHubRelease } from "./github-release";
import { checkJsonApi } from "./json-api";
import { checkHtmlScraper } from "./html-scraper";
import { checkAppleAppStore } from "./apple-appstore";
import { checkGooglePlayStore } from "./google-playstore";
import { checkMicrosoftStore } from "./microsoft-store";
import { checkChromeVersion } from "./chrome";
import { checkEndOfLife } from "./endoflife";
import { checkNpmRegistry } from "./npm-registry";
import { checkPyPI } from "./pypi";
import { checkRepology } from "./repology";
import { checkHomebrew } from "./homebrew";
import { checkWordPress } from "./wordpress";
import { checkWinget } from "./winget";
import { checkCsvData } from "./csv-data";
import { checkMaven } from "./maven";
import { checkNuGet } from "./nuget";
import { checkGitLabRelease } from "./gitlab";
import { checkPackagist } from "./packagist";
import { checkCrates } from "./crates";
import { checkRubyGems } from "./rubygems";
import { checkGoProxy } from "./goproxy";
import { checkHelm } from "./helm";
import { checkSnap } from "./snap";
import { checkFlathub } from "./flathub";
import { checkTerraform } from "./terraform";
import { checkChocolatey } from "./chocolatey";
import { checkPub } from "./pub";
import { checkHex } from "./hex";
import { checkConda } from "./conda";
import { checkCocoaPods } from "./cocoapods";
import { checkCpan } from "./cpan";
import { checkFdroid } from "./fdroid";
import { checkFirefoxAddon } from "./firefox-addon";
import { checkVscodeMarketplace } from "./vscode-marketplace";
import { checkJetbrains } from "./jetbrains";
import { checkOpenVsx } from "./openvsx";
import { checkAur } from "./aur";
import { checkAnsible } from "./ansible";
import { checkQuay } from "./quay";
import { checkBitbucket } from "./bitbucket";
import { checkLibrariesIo } from "./libraries-io";
import { enrichItemCves } from "@/lib/cve-enrichment";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import type { VersionCheckResult } from "./types";

export type { VersionCheckResult };

interface MonitoredItem {
  id: string;
  name: string;
  type: string;
  currentVersion: string | null;
  latestVersion: string | null;
  checkMethod: string;
  checkConfig: string | null;
  sourceId: string | null;
  sourceParams: string | null;
  status: string;
  cves?: string | null;
  rawMetadata?: string | null;
}

export interface CheckResult {
  latestVersion: string | null;
  status: string;
  changed: boolean;
  releaseNotes?: string | null;
  releaseDate?: string | null;
  releaseUrl?: string | null;
  cves?: string[] | null;
  description?: string | null;
  downloadUrl?: string | null;
  eolDate?: string | null;
  isLts?: boolean | null;
}

function compareVersions(current: string | null, latest: string | null): string {
  if (!current || !latest) return "up_to_date";
  if (current === latest) return "up_to_date";
  return "outdated";
}

function deriveItemStatus(
  current: string | null,
  latest: string | null,
  eolDate?: string | null
): string {
  if (isEolPast(eolDate)) return "end_of_life";
  return compareVersions(current, latest);
}

function hasMajorUpgrade(current: string | null, latest: string | null): boolean {
  if (!current || !latest) return false;
  const currentMajor = Number(current.replace(/[^0-9.]/g, "").split(".")[0] || "0");
  const latestMajor = Number(latest.replace(/[^0-9.]/g, "").split(".")[0] || "0");
  return Number.isFinite(currentMajor) && Number.isFinite(latestMajor) && latestMajor > currentMajor;
}

function isEolPast(eolDate: string | null | undefined): boolean {
  if (!eolDate || eolDate === "false") return false;
  if (eolDate === "true") return true;
  const d = new Date(eolDate);
  return !isNaN(d.getTime()) && d < new Date();
}

export async function resolveVersion(
  sourceType: string,
  sourceConfig: Record<string, unknown>,
  itemParams: Record<string, string>
): Promise<VersionCheckResult> {
  switch (sourceType) {
    case "dockerhub":
      return checkDockerHub(itemParams.image ?? "");
    case "github":
      return checkGitHubRelease(itemParams.repo ?? "");
    case "appstore":
      return checkAppleAppStore(itemParams.bundleId ?? "", itemParams.country ?? "de");
    case "playstore":
      return checkGooglePlayStore(itemParams.appId ?? "");
    case "msstore":
      return checkMicrosoftStore(itemParams.productId ?? "");
    case "chrome":
      return checkChromeVersion(itemParams.platform ?? "win64", itemParams.channel ?? "stable");
    case "endoflife":
      return checkEndOfLife(itemParams.product ?? "", itemParams.currentVersion ?? null);
    case "npm":
      return checkNpmRegistry(itemParams.package ?? "");
    case "pypi":
      return checkPyPI(itemParams.package ?? "");
    case "repology":
      return checkRepology(itemParams.project ?? "");
    case "homebrew":
      return checkHomebrew(itemParams.formula ?? "");
    case "wordpress":
      return checkWordPress(itemParams.slug ?? "");
    case "winget":
      return checkWinget(itemParams.packageId ?? "");
    case "maven":
      return checkMaven(itemParams.artifact ?? "");
    case "nuget":
      return checkNuGet(itemParams.package ?? "");
    case "gitlab":
      return checkGitLabRelease(itemParams.project ?? "");
    case "packagist":
      return checkPackagist(itemParams.package ?? "");
    case "crates":
      return checkCrates(itemParams.crate ?? "");
    case "rubygems":
      return checkRubyGems(itemParams.gem ?? "");
    case "goproxy":
      return checkGoProxy(itemParams.module ?? "");
    case "helm":
      return checkHelm(itemParams.chart ?? "");
    case "snap":
      return checkSnap(itemParams.snap ?? "");
    case "flathub":
      return checkFlathub(itemParams.appId ?? "");
    case "terraform":
      return checkTerraform(itemParams.module ?? "");
    case "chocolatey":
      return checkChocolatey(itemParams.package ?? "");
    case "pub":
      return checkPub(itemParams.package ?? "");
    case "hex":
      return checkHex(itemParams.package ?? "");
    case "conda":
      return checkConda(itemParams.package ?? "");
    case "cocoapods":
      return checkCocoaPods(itemParams.pod ?? "");
    case "cpan":
      return checkCpan(itemParams.distribution ?? "");
    case "fdroid":
      return checkFdroid(itemParams.appId ?? "");
    case "firefox_addon":
      return checkFirefoxAddon(itemParams.slug ?? "");
    case "vscode":
      return checkVscodeMarketplace(itemParams.extensionId ?? "");
    case "jetbrains":
      return checkJetbrains(itemParams.pluginId ?? "");
    case "openvsx":
      return checkOpenVsx(itemParams.extensionId ?? "");
    case "aur":
      return checkAur(itemParams.package ?? "");
    case "ansible":
      return checkAnsible(itemParams.collection ?? "");
    case "quay":
      return checkQuay(itemParams.repository ?? "");
    case "bitbucket":
      return checkBitbucket(itemParams.repo ?? "");
    case "libraries_io":
      return checkLibrariesIo(itemParams.platform ?? "", itemParams.package ?? "");
    case "json_api":
      return checkJsonApi(
        sourceConfig as {
          url?: string;
          jsonPath?: string;
          releaseNotesPath?: string;
          releaseDatePath?: string;
          releaseUrlPath?: string;
          headers?: Record<string, string>;
        },
        itemParams
      );
    case "html":
      return checkHtmlScraper(
        sourceConfig as {
          url?: string;
          selector?: string;
          regex?: string;
          releaseNotesSelector?: string;
          releaseDateSelector?: string;
          releaseUrlSelector?: string;
          headers?: Record<string, string>;
        },
        itemParams
      );
    case "csv_data":
      return checkCsvData(itemParams.itemName ?? "");
    default:
      return { version: null };
  }
}

function buildCheckResult(
  result: VersionCheckResult,
  latestVersion: string,
  status: string,
  changed: boolean
): CheckResult {
  return {
    latestVersion,
    status,
    changed,
    releaseNotes: result.releaseNotes ?? null,
    releaseDate: result.releaseDate ?? null,
    releaseUrl: result.releaseUrl ?? null,
    cves: result.cves ?? null,
    description: result.description ?? null,
    downloadUrl: result.downloadUrl ?? null,
    eolDate: result.eolDate ?? null,
    isLts: result.isLts ?? null,
  };
}

function buildMetadataUpdate(result: VersionCheckResult) {
  return {
    releaseNotes: result.releaseNotes ?? null,
    releaseDate: result.releaseDate ?? null,
    releaseUrl: result.releaseUrl ?? null,
    cves: result.cves ? JSON.stringify(result.cves) : null,
    description: result.description ?? null,
    downloadUrl: result.downloadUrl ?? null,
    eolDate: result.eolDate ?? null,
    isLts: result.isLts ?? null,
    rawMetadata: result.rawMetadata ? JSON.stringify(result.rawMetadata) : null,
  };
}

function clearCveMetadata(rawMetadata: string | null | undefined): string | null {
  if (!rawMetadata) return null;
  try {
    const parsed = JSON.parse(rawMetadata) as Record<string, unknown>;
    if ("cveMetadata" in parsed) {
      delete parsed.cveMetadata;
    }
    return JSON.stringify(parsed);
  } catch {
    return rawMetadata;
  }
}

export async function checkItemVersion(item: MonitoredItem): Promise<CheckResult> {
  if (item.sourceId) {
    const source = await prisma.checkSource.findUnique({ where: { id: item.sourceId } });
    if (!source) throw new Error(`Check source not found (sourceId: ${item.sourceId})`);

    let sourceConfig: Record<string, unknown> = {};
    try { sourceConfig = JSON.parse(source.config); } catch { /* empty */ }

    let itemParams: Record<string, string> = {};
    try { if (item.sourceParams) itemParams = JSON.parse(item.sourceParams); } catch { /* empty */ }

    if (!itemParams.currentVersion && item.currentVersion) {
      itemParams.currentVersion = item.currentVersion;
    }
    const result = await resolveVersion(source.type, sourceConfig, itemParams);
    if (!result.version) throw new Error(`No version found from connector "${source.type}" for "${item.name}"`);

    const latestVersion = result.version;
    const newStatus = deriveItemStatus(item.currentVersion, latestVersion, result.eolDate ?? null);
    const changed = latestVersion !== item.latestVersion;

    await prisma.monitoredItem.update({
      where: { id: item.id },
      data: {
        latestVersion,
        status: newStatus,
        lastChecked: new Date(),
        ...buildMetadataUpdate(result),
      },
    });

    if (changed && item.latestVersion) {
      await prisma.versionLog.create({
        data: {
          itemId: item.id,
          oldVersion: item.latestVersion,
          newVersion: latestVersion,
          releaseNotes: result.releaseNotes ?? null,
          releaseUrl: result.releaseUrl ?? null,
          cves: result.cves ? JSON.stringify(result.cves) : null,
        },
      });
    }

    if (item.currentVersion && latestVersion && item.currentVersion !== latestVersion) {
      enrichItemCves({
        id: item.id,
        name: item.name,
        currentVersion: item.currentVersion,
        latestVersion,
        sourceType: source.type,
        sourceParams: itemParams,
      }).catch((err) => console.error(`[CVE Enrichment] ${item.name}:`, err));
    } else if (newStatus === "up_to_date" && (!result.cves || result.cves.length === 0)) {
      // Avoid stale risk scores on up-to-date items when no CVE signal is present.
      await prisma.monitoredItem.update({
        where: { id: item.id },
        data: {
          cves: null,
          securityState: "no_known_vuln",
          externalScore: null,
          externalSeverity: null,
          externalVector: null,
          externalSource: null,
          epssPercent: null,
          vprScore: null,
          internalScore: null,
          internalSeverity: null,
          scoreConfidence: null,
          scoreUpdatedAt: new Date(),
          rawMetadata: clearCveMetadata(result.rawMetadata ? JSON.stringify(result.rawMetadata) : item.rawMetadata ?? null),
        },
      });
    }

    if (changed) {
      dispatchWebhookEvent("version.new", {
        itemName: item.name, itemType: item.type,
        oldVersion: item.latestVersion, newVersion: latestVersion, latestVersion,
      }).catch((err) => console.error(`[Webhook] ${item.name}:`, err));
      if (hasMajorUpgrade(item.currentVersion, latestVersion)) {
        dispatchWebhookEvent("version.critical", {
          itemName: item.name, itemType: item.type, latestVersion,
        }).catch((err) => console.error(`[Webhook] ${item.name}:`, err));
      }
    }
    if (result.cves && result.cves.length > 0) {
      dispatchWebhookEvent("cve.detected", {
        itemName: item.name, itemType: item.type, latestVersion, cves: result.cves,
      }).catch((err) => console.error(`[Webhook] ${item.name}:`, err));
    }
    if (result.eolDate && isEolPast(result.eolDate)) {
      dispatchWebhookEvent("item.eol", {
        itemName: item.name, itemType: item.type, eolDate: result.eolDate,
      }).catch((err) => console.error(`[Webhook] ${item.name}:`, err));
    }

    return buildCheckResult(result, latestVersion, newStatus, changed);
  }

  let config: Record<string, string> = {};
  if (item.checkConfig) {
    try { config = JSON.parse(item.checkConfig); } catch { /* empty */ }
  }

  let result: VersionCheckResult;

  if (config.source === "dockerhub" && config.image) {
    result = await checkDockerHub(config.image);
  } else if (config.source === "github" && config.repo) {
    result = await checkGitHubRelease(config.repo);
  } else {
    throw new Error(`Unsupported legacy check configuration for "${item.name}"`);
  }

  if (!result.version) throw new Error(`No version found from legacy connector for "${item.name}"`);

  const latestVersion = result.version;
  const newStatus = deriveItemStatus(item.currentVersion, latestVersion, result.eolDate ?? null);
  const changed = latestVersion !== item.latestVersion;

  await prisma.monitoredItem.update({
    where: { id: item.id },
    data: {
      latestVersion,
      status: newStatus,
      lastChecked: new Date(),
      ...buildMetadataUpdate(result),
    },
  });

  if (changed && item.latestVersion) {
    await prisma.versionLog.create({
      data: {
        itemId: item.id,
        oldVersion: item.latestVersion,
        newVersion: latestVersion,
        releaseNotes: result.releaseNotes ?? null,
        releaseUrl: result.releaseUrl ?? null,
        cves: result.cves ? JSON.stringify(result.cves) : null,
      },
    });
  }

  const legacySourceType = config.source || "github";
  if (item.currentVersion && latestVersion && item.currentVersion !== latestVersion) {
    enrichItemCves({
      id: item.id,
      name: item.name,
      currentVersion: item.currentVersion,
      latestVersion,
      sourceType: legacySourceType,
      sourceParams: config,
    }).catch((err) => console.error(`[CVE Enrichment] ${item.name}:`, err));
  } else if (newStatus === "up_to_date" && (!result.cves || result.cves.length === 0)) {
    // Avoid stale risk scores on up-to-date items when no CVE signal is present.
    await prisma.monitoredItem.update({
      where: { id: item.id },
      data: {
        cves: null,
        securityState: "no_known_vuln",
        externalScore: null,
        externalSeverity: null,
        externalVector: null,
        externalSource: null,
        epssPercent: null,
        vprScore: null,
        internalScore: null,
        internalSeverity: null,
        scoreConfidence: null,
        scoreUpdatedAt: new Date(),
        rawMetadata: clearCveMetadata(result.rawMetadata ? JSON.stringify(result.rawMetadata) : item.rawMetadata ?? null),
      },
    });
  }

  if (changed) {
    dispatchWebhookEvent("version.new", {
      itemName: item.name, itemType: item.type,
      oldVersion: item.latestVersion, newVersion: latestVersion, latestVersion,
    }).catch((err) => console.error(`[Webhook] ${item.name}:`, err));
    if (hasMajorUpgrade(item.currentVersion, latestVersion)) {
      dispatchWebhookEvent("version.critical", {
        itemName: item.name, itemType: item.type, latestVersion,
      }).catch((err) => console.error(`[Webhook] ${item.name}:`, err));
    }
  }
  if (result.cves && result.cves.length > 0) {
    dispatchWebhookEvent("cve.detected", {
      itemName: item.name, itemType: item.type, latestVersion, cves: result.cves,
    }).catch((err) => console.error(`[Webhook] ${item.name}:`, err));
  }

  return buildCheckResult(result, latestVersion, newStatus, changed);
}
