const DEFAULT_REDIRECT = "/dashboard";

/**
 * Returns a same-origin path to redirect to after login.
 * Anything that is not a plain internal path ("/..."), such as an absolute URL,
 * a protocol-relative URL ("//host") or a backslash trick ("/\host"), falls back
 * to the dashboard so the login flow cannot be used as an open redirect.
 */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return DEFAULT_REDIRECT;
  const candidate = value.trim();
  if (!candidate.startsWith("/")) return DEFAULT_REDIRECT;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return DEFAULT_REDIRECT;
  if (/[\u0000-\u001f\\]/.test(candidate)) return DEFAULT_REDIRECT;
  return candidate;
}
