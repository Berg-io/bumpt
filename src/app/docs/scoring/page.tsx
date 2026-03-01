"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Moon,
  Sun,
  ShieldAlert,
  Gauge,
  FlaskConical,
  Info,
  CheckCircle2,
} from "lucide-react";
import { ReleaseBadge } from "@/components/layout/release-badge";

function usePersistedTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (stored === "system" && prefersDark) || (!stored && prefersDark);
    document.documentElement.classList.toggle("dark", dark);
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return { isDark, toggleTheme };
}

export default function ScoringDocsPage() {
  const { isDark, toggleTheme } = usePersistedTheme();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <a href="/docs" className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Back to docs">
            <ArrowLeft className="h-4 w-4" />
          </a>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Risk Scoring (CVE + BPT)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/docs/api"
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            REST API
          </a>
          <a
            href="/docs/mcp"
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            MCP
          </a>
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            Dashboard
          </a>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        <section className="space-y-4">
          <h1 className="text-3xl font-bold">Risk Scoring Documentation</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            This page explains how bum.pt computes external vulnerability risk and the internal{" "}
            <strong>BPT (Business Priority Threat)</strong> score at a high level, including confidence and recommended
            field completion practices.
          </p>
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-primary" />
              Scoring is available in Community and Professional editions. Some data sources can depend on optional API
              credentials (for higher rate limits or enriched signals).
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Score Outputs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border p-5 space-y-2">
              <h3 className="font-semibold">External Score</h3>
              <p className="text-sm text-muted-foreground">
                Technical severity score (0-100) derived from CVE metrics (CVSS, VPR, severity text fallback).
              </p>
            </div>
            <div className="rounded-xl border p-5 space-y-2">
              <h3 className="font-semibold">BPT Score</h3>
              <p className="text-sm text-muted-foreground">
                Internal priority score (0-100) combining technical risk, threat signal, and business context.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Severity Levels</h2>
          <div className="rounded-xl border bg-card p-5 space-y-2 text-sm text-muted-foreground">
            <p>Scores are mapped to four user-facing levels:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>low</li>
              <li>medium</li>
              <li>high</li>
              <li>critical</li>
            </ul>
            <p>
              Exact internal cutoffs may evolve over time based on product improvements and calibration feedback.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">External Score Calculation</h2>
          <p className="text-sm text-muted-foreground">
            The external score uses available third-party vulnerability metrics and normalizes them to a consistent
            internal scale.
          </p>
          <div className="rounded-xl border p-5">
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>Prefers direct numeric severity metrics when present</li>
              <li>Uses alternative provider signals when primary metrics are unavailable</li>
              <li>Applies safe fallback behavior to avoid underestimating known risk</li>
              <li>Increases baseline risk when an item is past End of Life (EOL)</li>
              <li>Escalates risk when obsolete (EOL) assets also have known vulnerabilities</li>
              <li>Applies additional pressure when vulnerability volume is high</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-5 space-y-2">
            <p className="text-sm text-muted-foreground">
              The exact conversion and weighting internals are intentionally abstracted in public docs to reduce
              gaming and preserve scoring integrity.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            BPT Method
          </h2>
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              BPT combines three dimensions and produces a single operational priority score:
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>Technical</strong>: vulnerability severity signals
              </li>
              <li>
                <strong>Threat</strong>: exploitability/threat indicators
              </li>
              <li>
                <strong>Business</strong>: context score from item-specific fields
              </li>
              <li>
                <strong>Lifecycle</strong>: past EOL state increases urgency
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Relative influence is calibrated to favor practical remediation priority while remaining stable across
              heterogeneous asset types.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Business Context Fields (BPT Inputs)</h2>
          <p className="text-sm text-muted-foreground">
            Fill these fields on each monitored item for more accurate business prioritization:
          </p>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Field</th>
                  <th className="px-4 py-2.5 font-medium">Recommended Values</th>
                  <th className="px-4 py-2.5 font-medium">Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="px-4 py-2.5 font-mono">assetCriticality</td>
                  <td className="px-4 py-2.5">0 to 5</td>
                  <td className="px-4 py-2.5">Higher = higher business impact</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-mono">environment</td>
                  <td className="px-4 py-2.5">prod, preprod, test, dev</td>
                  <td className="px-4 py-2.5">Production weighs more than lower environments</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-mono">networkExposure</td>
                  <td className="px-4 py-2.5">internet, intranet, isolated</td>
                  <td className="px-4 py-2.5">Internet exposure increases priority</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-mono">hostsSensitiveData</td>
                  <td className="px-4 py-2.5">true / false</td>
                  <td className="px-4 py-2.5">Sensitive data hosting raises business score</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-mono">hasPrivilegedAccess</td>
                  <td className="px-4 py-2.5">true / false</td>
                  <td className="px-4 py-2.5">Privileged systems are weighted higher</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-mono">hasCompensatingControls</td>
                  <td className="px-4 py-2.5">true / false</td>
                  <td className="px-4 py-2.5">Controls reduce residual business pressure</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Confidence (BPT Precision)</h2>
          <div className="rounded-xl border p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Confidence reflects how many business context fields are filled. More complete context = more reliable BPT.
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- Confidence increases as context fields are completed</li>
              <li>- Confidence is bounded to avoid misleading extremes</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">CVE Data Sources and Enrichment Flow</h2>
          <div className="rounded-xl border p-5 space-y-3">
            <p className="text-sm text-muted-foreground">bum.pt can aggregate CVE information from:</p>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>NVD</strong> (keyword + version search)
              </li>
              <li>
                <strong>OSV.dev</strong> (ecosystem-aware when package and version are known)
              </li>
              <li>
                <strong>GitHub Advisory</strong> (package-level fallback when current version is unknown)
              </li>
              <li>
                <strong>FIRST EPSS</strong> (probability signal for exploitation likelihood)
              </li>
              <li>
                <strong>CISA KEV</strong> (known exploited vulnerabilities used for urgency escalation)
              </li>
              <li>
                <strong>VulnDB</strong> (optional enriched vulnerabilities including severity/CVSS samples)
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              CVEs are deduplicated, tracked by source, and persisted in item metadata with scoring details.
            </p>
            <p className="text-sm text-muted-foreground">
              To reduce misses across heterogeneous source naming, enrichment can try multiple normalized keyword aliases
              (for example product/repository/image variants) before concluding no match.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Best Practices for Accurate Prioritization</h2>
          <div className="rounded-xl border bg-card p-5">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                Fill all six business fields for internet-facing or business-critical assets.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                Keep environment and exposure values current when architecture changes.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                Use compensating controls honestly; over-declaring controls can under-prioritize risk.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                Review high BPT + high CVE-count items first when triaging critical backlog.
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <div className="space-y-3">
            <details className="rounded-xl border p-4" open>
              <summary className="cursor-pointer font-medium">Why can BPT be missing on an item?</summary>
              <p className="mt-2 text-sm text-muted-foreground">
                BPT is computed when scoring data exists. If an item has no vulnerability enrichment data yet, or if it
                has just been acknowledged and risk data was cleared, BPT may be temporarily absent until the next
                relevant check/enrichment cycle.
              </p>
            </details>

            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">
                Why can confidence stay non-zero with limited business context?
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Confidence uses bounded behavior so that score quality remains interpretable, even when context is
                partial. This indicates baseline inputs exist, while still signaling that additional context is needed.
              </p>
            </details>

            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">
                What happens to CVE and scores when I mark an item as updated (acknowledge)?
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Acknowledge clears CVE and scoring data for that item. This avoids stale risk display and lets the next
                detection cycle repopulate fresh vulnerability and score values.
              </p>
            </details>

            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">
                Why can obsolete (EOL) vulnerable assets become critical quickly?
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Past-EOL assets have increased operational and patching risk. When known vulnerabilities are also
                present, scoring elevates priority aggressively to reflect remediation urgency.
              </p>
            </details>

            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">
                Does the number of CVEs influence prioritization?
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes. Beyond severity signals, higher CVE volume increases pressure in prioritization so high-density
                vulnerable assets surface faster in operational triage.
              </p>
            </details>

            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">Can BPT be high if external score is moderate?</summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes. BPT also includes threat and business context. A moderate technical score can still lead to high
                internal priority if the asset is highly critical, exposed, and/or handling sensitive data.
              </p>
            </details>

            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-medium">How should I improve score quality quickly?</summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill all six business fields for internet-facing and mission-critical assets first. This has the
                biggest impact on confidence and practical prioritization quality.
              </p>
            </details>
          </div>
        </section>
      </main>
      <ReleaseBadge />
    </div>
  );
}
