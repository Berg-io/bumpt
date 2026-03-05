import { PrismaClient } from "../../generated/prisma/client";

function createPrismaClient() {
  const dbType = process.env.DB_TYPE || "sqlite";

  switch (dbType) {
    case "mariadb":
    case "mysql": {
      const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
      const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
      return new PrismaClient({ adapter } as any);
    }
    case "postgresql": {
      const { PrismaPg } = require("@prisma/adapter-pg");
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
      return new PrismaClient({ adapter } as any);
    }
    default: {
      const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
      const adapter = new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
      });
      return new PrismaClient({ adapter });
    }
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
