import type { NextConfig } from "next";

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
    ];
    // CORS for /api is handled in middleware.ts: the browser only accepts a single
    // origin in Access-Control-Allow-Origin, so it must be echoed per request.
  },
};

export default nextConfig;
