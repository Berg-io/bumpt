import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { StringValue } from "ms";
import type { JWTPayload, UserRole } from "@/types";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required. Set it in your .env file.");
  }
  return secret;
}

const JWT_EXPIRY = (process.env.JWT_EXPIRY || "24h") as StringValue;
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload as object, getJwtSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  if (requiredRoles.includes(userRole)) return true;
  if (requiredRoles.includes("ADMIN") && userRole === "SUPER_ADMIN") return true;
  return false;
}

export const AUTH_COOKIE_NAME = "auth-token";

export function createCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAge ?? 60 * 60 * 24,
  };
}
