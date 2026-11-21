import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Guard for URLs that users configure and the server then fetches
 * (JSON API / HTML scraper checks, webhooks).
 *
 * Blocked by default: loopback (the app container itself), link-local
 * (169.254.0.0/16, including cloud metadata endpoints at 169.254.169.254),
 * "unspecified" addresses and known metadata hostnames. Private networks
 * (10/8, 172.16/12, 192.168/16, fc00::/7) stay allowed because monitoring
 * intranet services is a normal use of a self-hosted dashboard.
 * Set OUTBOUND_ALLOW_LOCAL=true to lift the restriction entirely.
 */
export class UnsafeOutboundUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeOutboundUrlError";
  }
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inIpv4Range(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

export function isBlockedAddress(address: string): boolean {
  let ip = address.toLowerCase();
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) ip = mapped[1];

  if (isIP(ip) === 4) {
    return (
      inIpv4Range(ip, "127.0.0.0", 8) ||
      inIpv4Range(ip, "169.254.0.0", 16) ||
      inIpv4Range(ip, "0.0.0.0", 8)
    );
  }
  if (isIP(ip) === 6) {
    return (
      ip === "::1" ||
      ip === "::" ||
      ip.startsWith("fe8") || ip.startsWith("fe9") || ip.startsWith("fea") || ip.startsWith("feb") ||
      ip === "fd00:ec2::254"
    );
  }
  return false;
}

const MAX_REDIRECTS = 5;

/**
 * fetch() for user-configured URLs: every hop of a redirect chain goes through
 * assertSafeOutboundUrl, so a public URL cannot bounce the request to a blocked address.
 */
export async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  return fetchWithCheckedRedirects(rawUrl, init, assertSafeOutboundUrl);
}

/** Exported for tests: follows redirects manually and runs `check` before every hop. */
export async function fetchWithCheckedRedirects(
  rawUrl: string,
  init: RequestInit,
  check: (url: string) => Promise<unknown>
): Promise<Response> {
  let current = rawUrl;
  let options: RequestInit = { ...init, redirect: "manual" };
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await check(current);
    const res = await fetch(current, options);
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    current = new URL(location, current).toString();
    // Like browsers: 301/302/303 turn a POST into a GET without body.
    if (res.status === 303 || ((res.status === 301 || res.status === 302) && options.method && options.method !== "GET")) {
      options = { ...options, method: "GET", body: undefined };
    }
  }
  throw new UnsafeOutboundUrlError(`Too many redirects (>${MAX_REDIRECTS})`);
}

export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeOutboundUrlError("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeOutboundUrlError(`Protocol not allowed: ${url.protocol}`);
  }
  if (process.env.OUTBOUND_ALLOW_LOCAL === "true") return url;

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
    throw new UnsafeOutboundUrlError(`Host not allowed: ${hostname}`);
  }

  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map((a) => a.address);
  for (const address of addresses) {
    if (isBlockedAddress(address)) {
      throw new UnsafeOutboundUrlError(
        `Host ${hostname} resolves to a local address (${address}); set OUTBOUND_ALLOW_LOCAL=true to allow it`
      );
    }
  }
  return url;
}
