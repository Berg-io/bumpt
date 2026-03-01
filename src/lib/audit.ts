import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "item.created"
  | "item.updated"
  | "item.deleted"
  | "item.version_checked"
  | "item.version_acknowledged"
  | "item.check_failed"
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "source.created"
  | "source.updated"
  | "source.deleted"
  | "auth.login"
  | "auth.logout"
  | "settings.updated"
  | "database.backup"
  | "database.restore"
  | "database.wipe"
  | "csvdata.uploaded"
  | "csvdata.cleared"
  | "logs.purged"
  | "items.purged"
  | "webhook.created"
  | "webhook.updated"
  | "webhook.deleted"
  | "report.created"
  | "report.updated"
  | "report.deleted";

export type AuditEntityType = "item" | "user" | "auth" | "source" | "settings" | "database" | "csvdata" | "logs" | "webhook" | "report";

interface AuditEntry {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  userId?: string;
  userEmail?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        entityName: entry.entityName ?? null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        userId: entry.userId ?? null,
        userEmail: entry.userEmail ?? null,
      },
    });
  } catch (err) {
    console.error("[AUDIT] Failed to write audit log:", err);
  }
}
