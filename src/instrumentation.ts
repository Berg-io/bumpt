/**
 * Next.js calls register() once when the server starts.
 * The built-in scheduler only runs in the Node.js runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/scheduler");
    startScheduler();
    if (process.env.SCHEDULER_ENABLED !== "false") {
      // After an update of CVE matching, look up again the items checked with
      // the older matching, without waiting for the next scheduled check.
      setTimeout(() => {
        import("@/lib/cve-enrichment")
          .then(({ refreshOutdatedCveLookups }) => refreshOutdatedCveLookups())
          .catch((err) => console.error("[CVE Enrichment] Startup refresh failed:", err));
      }, 60_000);
    }
  }
}
