import type { NextConfig } from "next";

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["*"];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "bcrypt",
    "better-sqlite3",
    "mariadb",
    "pg",
    "mssql",
    "@prisma/adapter-better-sqlite3",
    "@prisma/adapter-mariadb",
    "@prisma/adapter-pg",
    "@prisma/adapter-mssql",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigins.join(", ") },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-API-Key" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
