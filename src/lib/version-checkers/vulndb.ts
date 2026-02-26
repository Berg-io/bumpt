import { getAppSetting } from "@/lib/settings";

export interface VulnDbResult {
  cves: string[];
  vulnerabilities: VulnDbEntry[];
}

export interface VulnDbEntry {
  id: string;
  title: string;
  cveId: string | null;
  severity: string | null;
  cvssScore: number | null;
  publishedAt: string | null;
  description: string | null;
}

export async function queryVulnDb(
  keyword: string,
  version?: string
): Promise<VulnDbResult> {
  const empty: VulnDbResult = { cves: [], vulnerabilities: [] };
  if (!keyword) return empty;

  const clientId =
    (await getAppSetting("vulndb_client_id")) ||
    process.env.VULNDB_CLIENT_ID;
  const clientSecret =
    (await getAppSetting("vulndb_client_secret")) ||
    process.env.VULNDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) return empty;

  try {
    const searchQuery = version ? `${keyword} ${version}` : keyword;
    const url = `https://vulndb.cyberriskanalytics.com/api/v1/vulnerabilities/find_by_cpe_or_keyword`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-VulnDB-ClientID": clientId,
        "X-VulnDB-ClientSecret": clientSecret,
        "User-Agent": "bumpt/1.0",
      },
      body: JSON.stringify({
        keyword: searchQuery,
        size: 20,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return empty;

    const data = await res.json();
    const results = (data.results || data.vulnerabilities || []) as Array<{
      vulndb_id?: number;
      title?: string;
      description?: string;
      severity?: string;
      cvss_score?: number;
      cvss3_score?: number;
      published_date?: string;
      ext_references?: Array<{ type?: string; value?: string }>;
      nvd_additional_information?: Array<{ cve_id?: string }>;
      classifications?: Array<{ name?: string }>;
    }>;

    const cves: string[] = [];
    const vulnerabilities: VulnDbEntry[] = [];

    for (const vuln of results) {
      let cveId: string | null = null;

      const nvdRefs = vuln.nvd_additional_information || [];
      for (const ref of nvdRefs) {
        if (ref.cve_id) {
          cveId = ref.cve_id;
          break;
        }
      }

      if (!cveId) {
        const extRefs = vuln.ext_references || [];
        for (const ref of extRefs) {
          if (ref.type === "CVE" && ref.value) {
            cveId = ref.value;
            break;
          }
        }
      }

      if (cveId && !cves.includes(cveId)) {
        cves.push(cveId);
      }

      vulnerabilities.push({
        id: `VULNDB-${vuln.vulndb_id || "unknown"}`,
        title: vuln.title || "Unknown",
        cveId,
        severity: vuln.severity || null,
        cvssScore: vuln.cvss3_score ?? vuln.cvss_score ?? null,
        publishedAt: vuln.published_date || null,
        description: vuln.description?.slice(0, 500) || null,
      });
    }

    return { cves, vulnerabilities };
  } catch {
    return empty;
  }
}
