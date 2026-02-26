import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME, hasRole } from "./auth";
import { validateApiKey } from "./api-keys";
import type { JWTPayload, UserRole } from "@/types";

interface AuthOptions {
  roles?: UserRole[];
}

type RouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string>>; user: JWTPayload }
) => Promise<Response>;

async function resolveUser(): Promise<JWTPayload | null> {
  const headerStore = await headers();

  const apiKey = headerStore.get("x-api-key");
  if (apiKey) {
    return validateApiKey(apiKey);
  }

  const authHeader = headerStore.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) return user;
    return validateApiKey(token);
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}

export function withAuth(handler: RouteHandler, options: AuthOptions = {}) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<Response> => {
    const user = await resolveUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (options.roles && !hasRole(user.role, options.roles)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return handler(request, { ...context, user });
  };
}

export async function getAuthUser(): Promise<JWTPayload | null> {
  return resolveUser();
}
