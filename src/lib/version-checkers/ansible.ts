import type { VersionCheckResult } from "./types";

export async function checkAnsible(collection: string): Promise<VersionCheckResult> {
  if (!collection) return { version: null };
  const parts = collection.split(".");
  if (parts.length < 2) return { version: null };
  const [namespace, name] = [parts[0], parts.slice(1).join(".")];
  try {
    const res = await fetch(`https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { version: null };
    const data = await res.json();
    const version = data.highest_version?.version || null;
    if (!version) return { version: null };
    return {
      version,
      description: data.description || null,
      releaseDate: data.updated_at || data.created_at || null,
      releaseUrl: `https://galaxy.ansible.com/ui/repo/published/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}/`,
    };
  } catch {
    return { version: null };
  }
}
