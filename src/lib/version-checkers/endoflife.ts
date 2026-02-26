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

export async function checkEndOfLife(product: string): Promise<VersionCheckResult> {
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

  const latest = cycles[0];
  const version = latest.latest || latest.cycle || null;

  const eolValue = latest.eol;
  let eolDate: string | null = null;
  if (typeof eolValue === "string") {
    eolDate = eolValue;
  } else if (eolValue === true) {
    eolDate = "true";
  }

  const ltsValue = latest.lts;
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
      totalCycles: cycles.length,
    },
  };
}
