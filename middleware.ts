import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/login",
  "/docs",
  "/api/auth/login",
  "/api/auth/saml/login",
  "/api/auth/saml/callback",
  "/api/auth/saml/metadata",
  "/api/auth/oidc/login",
  "/api/auth/oidc/callback",
  "/api/auth/sso/status",
  "/api/health",
  "/api/openapi",
  "/api/cron",
];

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitIdentifier(request: NextRequest): string {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return `key:${apiKey.substring(0, 12)}`;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

function checkRateLimit(id: string): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(id);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    rateLimitStore.set(id, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS - 1, reset: resetAt };
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0, reset: entry.resetAt };
  }
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, reset: entry.resetAt };
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt <= now) rateLimitStore.delete(key);
    }
  }, 60 * 1000);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    const token = request.cookies.get("auth-token")?.value;
    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        await jwtVerify(token, secret);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch {
        // token invalid — let them through to login
      }
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    const rlId = getRateLimitIdentifier(request);
    const rl = checkRateLimit(rlId);

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes, veuillez réessayer plus tard" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rl.reset / 1000)),
            "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  const token = request.cookies.get("auth-token")?.value;
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");

  if (apiKeyHeader) {
    return NextResponse.next();
  }

  const jwtToken = token || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!jwtToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(jwtToken, secret);
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
