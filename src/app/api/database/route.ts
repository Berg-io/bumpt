import { NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware-auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { JWTPayload } from "@/types";
import fs from "fs";
import path from "path";

const DB_TYPE = process.env.DB_TYPE || "sqlite";

function getDatabasePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  return url.replace("file:", "");
}

export const GET = withAuth(
  async () => {
    const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

    let fileSize: number | null = null;
    if (DB_TYPE === "sqlite") {
      try {
        const resolvedPath = path.resolve(getDatabasePath());
        fileSize = fs.statSync(resolvedPath).size;
      } catch {
        // file not found
      }
    }

    const counts = await Promise.all([
      prisma.user.count(),
      prisma.monitoredItem.count(),
      prisma.checkSource.count(),
      prisma.versionLog.count(),
      prisma.auditLog.count(),
      prisma.appSetting.count(),
    ]);

    return NextResponse.json({
      type: DB_TYPE,
      host: DB_TYPE === "sqlite" ? "(local file)" : (process.env.DB_HOST ?? ""),
      port: DB_TYPE === "sqlite" ? null : (process.env.DB_PORT ?? ""),
      database: DB_TYPE === "sqlite" ? null : (process.env.DB_NAME ?? ""),
      fileSize,
      tables: {
        users: counts[0],
        monitoredItems: counts[1],
        checkSources: counts[2],
        versionLogs: counts[3],
        auditLogs: counts[4],
        appSettings: counts[5],
      },
    });
  },
  { roles: ["SUPER_ADMIN"] }
);

export const POST = withAuth(
  async (request: Request, { user }: { params: Promise<Record<string, string>>; user: JWTPayload }) => {
    try {
      const body = await request.json();
      const { action } = body as { action: string };

      if (action === "backup") return handleBackup(user);
      if (action === "restore") return handleRestore(body.data, body.format, user);
      if (action === "wipe") return handleWipe(user);

      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  { roles: ["SUPER_ADMIN"] }
);

// ── Backup ────────────────────────────────────────────────────────────

async function handleBackup(user: JWTPayload) {
  if (DB_TYPE === "sqlite") {
    return handleSqliteBackup(user);
  }
  return handleJsonBackup(user);
}

async function handleSqliteBackup(user: JWTPayload) {
  const resolvedPath = path.resolve(getDatabasePath());
  if (!fs.existsSync(resolvedPath)) {
    return NextResponse.json({ error: "Database file not found" }, { status: 404 });
  }

  const data = fs.readFileSync(resolvedPath);

  await logAudit({
    action: "database.backup",
    entityType: "database",
    entityName: "Database",
    details: { format: "sqlite", size: data.length },
    userId: user.id,
    userEmail: user.email,
  });

  return NextResponse.json({
    success: true,
    format: "sqlite",
    data: data.toString("base64"),
    filename: `backup-${timestamp()}.db`,
  });
}

async function handleJsonBackup(user: JWTPayload) {
  const [users, checkSources, monitoredItems, versionLogs, auditLogs, appSettings] =
    await Promise.all([
      prisma.user.findMany(),
      prisma.checkSource.findMany(),
      prisma.monitoredItem.findMany(),
      prisma.versionLog.findMany(),
      prisma.auditLog.findMany(),
      prisma.appSetting.findMany(),
    ]);

  const payload = {
    _meta: {
      version: 1,
      dbType: DB_TYPE,
      exportedAt: new Date().toISOString(),
    },
    users,
    checkSources,
    monitoredItems,
    versionLogs,
    auditLogs,
    appSettings,
  };

  const json = JSON.stringify(payload, null, 2);

  await logAudit({
    action: "database.backup",
    entityType: "database",
    entityName: "Database",
    details: {
      format: "json",
      size: json.length,
      counts: {
        users: users.length,
        checkSources: checkSources.length,
        monitoredItems: monitoredItems.length,
        versionLogs: versionLogs.length,
        auditLogs: auditLogs.length,
        appSettings: appSettings.length,
      },
    },
    userId: user.id,
    userEmail: user.email,
  });

  return NextResponse.json({
    success: true,
    format: "json",
    data: Buffer.from(json).toString("base64"),
    filename: `backup-${timestamp()}.json`,
  });
}

// ── Restore ───────────────────────────────────────────────────────────

async function handleRestore(base64Data: string, format: string | undefined, user: JWTPayload) {
  if (!base64Data) {
    return NextResponse.json({ error: "No backup data provided" }, { status: 400 });
  }

  if (DB_TYPE === "sqlite" && format !== "json") {
    return handleSqliteRestore(base64Data, user);
  }
  return handleJsonRestore(base64Data, user);
}

async function handleSqliteRestore(base64Data: string, user: JWTPayload) {
  const resolvedPath = path.resolve(getDatabasePath());
  try {
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(resolvedPath, buffer);

    await logAudit({
      action: "database.restore",
      entityType: "database",
      entityName: "Database",
      details: { format: "sqlite", size: buffer.length },
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to restore database" }, { status: 500 });
  }
}

async function handleJsonRestore(base64Data: string, user: JWTPayload) {
  try {
    const json = Buffer.from(base64Data, "base64").toString("utf-8");
    const payload = JSON.parse(json);

    if (!payload._meta || !payload.users) {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }

    // Delete in FK-safe order
    await prisma.versionLog.deleteMany();
    await prisma.monitoredItem.deleteMany();
    await prisma.checkSource.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.appSetting.deleteMany();
    await prisma.user.deleteMany();

    // Restore in FK-safe order
    let counts = { users: 0, checkSources: 0, monitoredItems: 0, versionLogs: 0, auditLogs: 0, appSettings: 0 };

    if (payload.users?.length) {
      await prisma.user.createMany({ data: coerceDates(payload.users) as any });
      counts.users = payload.users.length;
    }
    if (payload.checkSources?.length) {
      await prisma.checkSource.createMany({ data: coerceDates(payload.checkSources) as any });
      counts.checkSources = payload.checkSources.length;
    }
    if (payload.monitoredItems?.length) {
      await prisma.monitoredItem.createMany({ data: coerceDates(payload.monitoredItems) as any });
      counts.monitoredItems = payload.monitoredItems.length;
    }
    if (payload.versionLogs?.length) {
      await prisma.versionLog.createMany({ data: coerceDates(payload.versionLogs) as any });
      counts.versionLogs = payload.versionLogs.length;
    }
    if (payload.auditLogs?.length) {
      await prisma.auditLog.createMany({ data: coerceDates(payload.auditLogs) as any });
      counts.auditLogs = payload.auditLogs.length;
    }
    if (payload.appSettings?.length) {
      await prisma.appSetting.createMany({ data: coerceDates(payload.appSettings) as any });
      counts.appSettings = payload.appSettings.length;
    }

    await logAudit({
      action: "database.restore",
      entityType: "database",
      entityName: "Database",
      details: { format: "json", sourceDbType: payload._meta.dbType, counts },
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true, counts });
  } catch (e) {
    return NextResponse.json({ error: "Failed to restore database", details: String(e) }, { status: 500 });
  }
}

/**
 * Prisma returns Date objects, but JSON.parse gives strings.
 * Ensure date fields are proper Date objects for createMany.
 */
function coerceDates(records: Record<string, unknown>[]): Record<string, unknown>[] {
  return records.map((r) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
        out[k] = new Date(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

// ── Wipe ──────────────────────────────────────────────────────────────

async function handleWipe(user: JWTPayload) {
  try {
    await prisma.versionLog.deleteMany();
    await prisma.monitoredItem.deleteMany();
    await prisma.checkSource.deleteMany({ where: { isBuiltIn: false } });
    await prisma.auditLog.deleteMany();
    await prisma.appSetting.deleteMany();

    const keptSources = await prisma.checkSource.count({ where: { isBuiltIn: true } });

    await logAudit({
      action: "database.wipe",
      entityType: "database",
      entityName: "Database",
      details: { wipeType: "full", keptBuiltInSources: keptSources },
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ success: true, keptBuiltInSources: keptSources });
  } catch {
    return NextResponse.json({ error: "Failed to wipe database" }, { status: 500 });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
