/**
 * CORS headers for the external API.
 *
 * CORS_ALLOWED_ORIGINS is a comma-separated list of origins allowed to call the
 * API from a browser. Empty (the default) means same-origin only. "*" allows any
 * origin, which is not recommended. Browsers accept a single origin in
 * Access-Control-Allow-Origin, so the request's origin is echoed when allowed.
 */
export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function getCorsHeaders(
  origin: string | null,
  allowedOriginsEnv: string | undefined = process.env.CORS_ALLOWED_ORIGINS
): Record<string, string> | null {
  if (!origin) return null;
  const allowed = parseAllowedOrigins(allowedOriginsEnv);
  if (allowed.length === 0) return null;

  const allowAny = allowed.includes("*");
  if (!allowAny && !allowed.includes(origin.replace(/\/+$/, ""))) return null;

  return {
    "Access-Control-Allow-Origin": allowAny ? "*" : origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
