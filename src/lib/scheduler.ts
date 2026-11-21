import { randomBytes } from "crypto";
import { Cron } from "croner";

/**
 * Built-in scheduler, started once per server process from instrumentation.ts.
 *
 * It replaces the Ofelia container, which needed the Docker socket (root
 * access to the host) only to run `wget` inside the app container. Jobs call
 * the existing cron endpoints over loopback with CRON_SECRET, so the routes,
 * their audit logs and their webhooks stay exactly the same.
 *
 * Patterns use the 6-field format already documented for CRON_SCHEDULE
 * (seconds first): "0 0 *\/6 * * *" = every 6 hours.
 */

const DEFAULT_CHECK_SCHEDULE = "0 0 */6 * * *";
const DEFAULT_REPORTS_SCHEDULE = "0 0 * * * *";

const INSECURE_CRON_SECRETS = new Set([
  "",
  "change-this-to-a-secure-random-string-in-production",
  "please-change-this-cron-secret",
]);

let started = false;

function ensureCronSecret(): string {
  const current = process.env.CRON_SECRET ?? "";
  if (INSECURE_CRON_SECRETS.has(current)) {
    // Only this process calls the cron endpoints now: a random per-process
    // secret is enough and the published default can no longer be used.
    process.env.CRON_SECRET = randomBytes(32).toString("hex");
  }
  return process.env.CRON_SECRET as string;
}

async function callCronEndpoint(path: string, label: string): Promise<void> {
  const port = process.env.PORT || "3000";
  const startedAt = Date.now();
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(60 * 60 * 1000),
    });
    if (res.status === 404) return; // endpoint not shipped in this edition
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    if (!res.ok) {
      console.error(`[Scheduler] ${label} failed: HTTP ${res.status} after ${seconds}s`);
      return;
    }
    console.log(`[Scheduler] ${label} done in ${seconds}s`);
  } catch (err) {
    console.error(`[Scheduler] ${label} failed:`, err instanceof Error ? err.message : err);
  }
}

function schedule(pattern: string, label: string, path: string): void {
  try {
    const job = new Cron(pattern, { protect: true }, () => callCronEndpoint(path, label));
    const next = job.nextRun();
    console.log(`[Scheduler] ${label}: "${pattern}"${next ? `, next run ${next.toISOString()}` : ""}`);
  } catch (err) {
    console.error(`[Scheduler] Invalid schedule for ${label} ("${pattern}"):`, err instanceof Error ? err.message : err);
  }
}

export function startScheduler(): void {
  if (started) return;
  started = true;

  if (process.env.SCHEDULER_ENABLED === "false") {
    console.log("[Scheduler] Disabled (SCHEDULER_ENABLED=false)");
    return;
  }

  ensureCronSecret();
  schedule(process.env.CRON_SCHEDULE || DEFAULT_CHECK_SCHEDULE, "Version checks", "/api/cron/check");
  schedule(process.env.REPORTS_SCHEDULE || DEFAULT_REPORTS_SCHEDULE, "Scheduled reports", "/api/cron/reports");
}
