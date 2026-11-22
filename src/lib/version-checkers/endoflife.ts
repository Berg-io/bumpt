import type { VersionCheckResult } from "./types";

interface Cycle {
  cycle: string;
  latest: string;
  eol: string | boolean;
  lts: string | boolean;
  releaseDate: string;
  support?: string | boolean;
  latestReleaseDate?: string;
}

function normalizeCycleToken(value: string | null | undefined): string {
  if (!value) return "";
  return value.toLowerCase().replace(/[^a-z0-9.]/g, "");
}

function extractVersionFamily(value: string | null | undefined): string {
  if (!value) return "";
  const match = value.match(/\d+(?:\.\d+){0,2}/);
  return match ? match[0] : "";
}

function findBestCycleMatch(cycles: Cycle[], currentVersion?: string | null): Cycle | null {
  if (!currentVersion) return null;
  const versionFamily = extractVersionFamily(currentVersion);
  if (!versionFamily) return null;

  const normalizedVersion = normalizeCycleToken(versionFamily);
  for (const cycle of cycles) {
    const cycleToken = normalizeCycleToken(cycle.cycle);
    if (cycleToken === normalizedVersion) return cycle;
  }

  for (const cycle of cycles) {
    const cycleFamily = extractVersionFamily(cycle.cycle);
    if (cycleFamily && cycleFamily === versionFamily) return cycle;
  }

  return null;
}

/**
 * Cycle the installed version belongs to: "3.11" for 3.11.9, "6.0" for 6.0.16,
 * "24" for 24.11.1, or the cycle whose latest build prefixes it (Windows
 * 10.0.26200.9974 belongs to the cycle whose latest is 10.0.26200).
 */
export function findInstalledCycle<T extends { cycle: string; latest?: string }>(cycles: T[], currentVersion?: string | null): T | null {
  const v = (currentVersion ?? "").trim().toLowerCase();
  if (!v) return null;
  const byCycle = cycles
    .filter((c) => {
      const cy = String(c.cycle).toLowerCase();
      return v === cy || v.startsWith(`${cy}.`);
    })
    .sort((a, b) => String(b.cycle).length - String(a.cycle).length);
  if (byCycle[0]) return byCycle[0];
  return (
    cycles
      .filter((c) => c.latest && (v === String(c.latest).toLowerCase() || v.startsWith(`${String(c.latest).toLowerCase()}.`)))
      .sort((a, b) => String(b.latest).length - String(a.latest).length)[0] ?? null
  );
}

/**
 * With sameCycle, the latest version is the latest of the installed cycle
 * (Python 3.11.x stays compared with 3.11), used for items reported by agents.
 */
export async function checkEndOfLife(product: string, currentVersion?: string | null, sameCycle = false): Promise<VersionCheckResult> {
  if (!product) return { version: null };

  const url = `https://endoflife.date/api/${encodeURIComponent(product)}.json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`EndOfLife.date API returned ${res.status} for product "${product}"`);
  }

  const cycles = (await res.json()) as Cycle[];
  if (!cycles || cycles.length === 0) {
    throw new Error(`EndOfLife.date returned no cycles for product "${product}"`);
  }

  const installed = sameCycle ? findInstalledCycle(cycles, currentVersion) : null;
  const latest = installed ?? cycles[0];
  const eolCycle = installed ?? findBestCycleMatch(cycles, currentVersion) ?? latest;
  const version = latest.latest || latest.cycle || null;

  const eolValue = eolCycle.eol;
  let eolDate: string | null = null;
  if (typeof eolValue === "string") {
    eolDate = eolValue;
  } else if (eolValue === true) {
    eolDate = "true";
  }

  const ltsValue = eolCycle.lts;
  let isLts: boolean | null = null;
  if (typeof ltsValue === "boolean") {
    isLts = ltsValue;
  } else if (typeof ltsValue === "string") {
    isLts = true;
  }

  let releaseUrl: string | null = null;
  const linkField = (latest as unknown as Record<string, unknown>).link;
  if (typeof linkField === "string" && linkField.startsWith("http")) {
    releaseUrl = linkField;
  }
  if (!releaseUrl) {
    releaseUrl = `https://endoflife.date/${encodeURIComponent(product)}`;
  }

  return {
    version,
    releaseDate: latest.latestReleaseDate || latest.releaseDate || null,
    releaseUrl,
    eolDate,
    isLts,
    rawMetadata: {
      cycle: latest.cycle,
      support: latest.support,
      eolCycle: eolCycle.cycle,
      totalCycles: cycles.length,
    },
  };
}
