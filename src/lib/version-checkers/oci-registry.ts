import type { VersionCheckResult } from "./types";
import { classifyTag, pickHighestVersionTag, type TagCandidate } from "./docker-hub";
import { isPrereleaseVersion, matchesBranch } from "@/lib/version-utils";

/**
 * Any registry speaking the OCI distribution API (ghcr.io, registry.k8s.io,
 * gcr.io, mcr.microsoft.com, public.ecr.aws, registry.gitlab.com, quay.io,
 * docker.io, a self-hosted Harbor...). Public images are read with the
 * anonymous token the registry hands out on its 401 challenge.
 */

const MAX_PAGES = 10;
const PAGE_SIZE = 1000;

export interface OciImageRef {
  registry: string;
  repository: string;
}

/** "ghcr.io/owner/app:1.2" → { registry: "ghcr.io", repository: "owner/app" }. */
export function parseOciImage(image: string): OciImageRef | null {
  let value = image.trim().replace(/^https?:\/\//i, "").replace(/^oci:\/\//i, "");
  value = value.split("@")[0];
  const slash = value.indexOf("/");
  if (slash <= 0) return null;
  let registry = value.slice(0, slash).toLowerCase();
  let repository = value.slice(slash + 1).replace(/:[^/:]+$/, "").replace(/\/+$/, "");
  // A first segment without a dot, colon or "localhost" is a Docker Hub namespace.
  if (!registry.includes(".") && !registry.includes(":") && registry !== "localhost") {
    repository = `${registry}/${repository}`;
    registry = "docker.io";
  }
  if (registry === "docker.io" || registry === "index.docker.io") {
    registry = "registry-1.docker.io";
    if (!repository.includes("/")) repository = `library/${repository}`;
  }
  if (!repository || !/^[a-z0-9._\-/]+$/i.test(repository)) return null;
  return { registry, repository: repository.toLowerCase() };
}

/** Parses a WWW-Authenticate Bearer challenge: realm, service, scope. */
export function parseBearerChallenge(header: string | null): Record<string, string> | null {
  if (!header || !/^bearer\s/i.test(header)) return null;
  const params: Record<string, string> = {};
  for (const match of header.slice(7).matchAll(/(\w+)="([^"]*)"/g)) params[match[1].toLowerCase()] = match[2];
  return params.realm ? params : null;
}

/** Next page path from a Link header: </v2/x/tags/list?last=abc&n=1000>; rel="next". */
export function nextPageFromLink(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
  return match ? match[1] : null;
}

async function anonymousToken(challenge: Record<string, string>, repository: string): Promise<string | null> {
  const url = new URL(challenge.realm);
  if (challenge.service) url.searchParams.set("service", challenge.service);
  url.searchParams.set("scope", challenge.scope || `repository:${repository}:pull`);
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { token?: string; access_token?: string };
  return data.token || data.access_token || null;
}

/** Every tag of a repository, following the registry's pagination. */
export async function listOciTags(ref: OciImageRef): Promise<string[]> {
  const base = `https://${ref.registry}`;
  let path: string | null = `/v2/${ref.repository}/tags/list?n=${PAGE_SIZE}`;
  let token: string | null = null;
  const tags: string[] = [];

  for (let page = 0; path && page < MAX_PAGES; page++) {
    const url: string = path.startsWith("http") ? path : `${base}${path}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    let res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });

    if (res.status === 401 && !token) {
      const challenge = parseBearerChallenge(res.headers.get("www-authenticate"));
      if (!challenge) throw new Error(`Registry ${ref.registry} requires credentials for ${ref.repository}`);
      token = await anonymousToken(challenge, ref.repository);
      if (!token) throw new Error(`Registry ${ref.registry} refused anonymous access to ${ref.repository}`);
      res = await fetch(url, { headers: { ...headers, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    }
    if (res.status === 404) throw new Error(`Image ${ref.registry}/${ref.repository} not found`);
    if (!res.ok) throw new Error(`Registry ${ref.registry} returned HTTP ${res.status}`);

    const data = (await res.json()) as { tags?: string[] | null };
    tags.push(...(data.tags ?? []));
    path = nextPageFromLink(res.headers.get("link"));
  }
  return tags;
}

/** Highest stable version tag; pre-release and build tags only when nothing else exists. */
export function pickOciVersionTag(tags: string[], branch?: string): TagCandidate | null {
  const branchPrefix = branch?.trim().replace(/\.?[x*]$/i, "");
  const candidates = tags
    .map((name) => classifyTag({ name }))
    .filter((candidate): candidate is TagCandidate => candidate !== null)
    .filter((candidate) => matchesBranch(candidate.version, branchPrefix));
  const stable = candidates.filter(
    (candidate) => candidate.tier <= 2 && !isPrereleaseVersion(candidate.tag.name) && !/\d[a-z]+\d*$/i.test(candidate.tag.name)
  );
  return pickHighestVersionTag(stable.length > 0 ? stable : candidates);
}

function releasePage(ref: OciImageRef): string | null {
  // ghcr.io/<owner>/<name> opened in a browser leads to the GitHub package page.
  if (ref.registry === "ghcr.io") return `https://ghcr.io/${ref.repository}`;
  if (ref.registry === "registry-1.docker.io") return `https://hub.docker.com/r/${ref.repository}`;
  if (ref.registry === "quay.io") return `https://quay.io/repository/${ref.repository}`;
  return null;
}

export async function checkOciRegistry(image: string, branch?: string): Promise<VersionCheckResult> {
  const ref = parseOciImage(image);
  if (!ref) throw new Error(`Invalid image reference "${image}" (expected registry/namespace/name, e.g. ghcr.io/owner/app)`);
  const tags = await listOciTags(ref);
  const selected = pickOciVersionTag(tags, branch);
  if (!selected) return { version: null };
  return {
    version: selected.version,
    releaseUrl: releasePage(ref),
    rawMetadata: { registry: ref.registry, repository: ref.repository, tagName: selected.tag.name, totalTags: tags.length },
  };
}
