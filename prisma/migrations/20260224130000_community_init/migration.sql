-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "auth_type" TEXT NOT NULL DEFAULT 'local',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "check_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "monitored_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "current_version" TEXT,
    "latest_version" TEXT,
    "check_method" TEXT NOT NULL DEFAULT 'manual',
    "check_config" TEXT,
    "source_id" TEXT,
    "source_params" TEXT,
    "status" TEXT NOT NULL DEFAULT 'up_to_date',
    "security_state" TEXT NOT NULL DEFAULT 'no_known_vuln',
    "monitoring_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_checked" DATETIME,
    "release_notes" TEXT,
    "release_date" TEXT,
    "release_url" TEXT,
    "cves" TEXT,
    "asset_criticality" INTEGER,
    "environment" TEXT,
    "network_exposure" TEXT,
    "hosts_sensitive_data" BOOLEAN,
    "has_privileged_access" BOOLEAN,
    "has_compensating_controls" BOOLEAN,
    "external_score" REAL,
    "external_severity" TEXT,
    "external_vector" TEXT,
    "external_source" TEXT,
    "epss_percent" REAL,
    "vpr_score" REAL,
    "internal_score" REAL,
    "internal_severity" TEXT,
    "score_confidence" INTEGER,
    "score_updated_at" DATETIME,
    "description" TEXT,
    "user_note" TEXT,
    "download_url" TEXT,
    "eol_date" TEXT,
    "is_lts" BOOLEAN,
    "raw_metadata" TEXT,
    "ai_summary" TEXT,
    "tags" TEXT DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "monitored_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "check_sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "version_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "old_version" TEXT,
    "new_version" TEXT NOT NULL,
    "release_notes" TEXT,
    "release_url" TEXT,
    "cves" TEXT,
    "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "version_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "monitored_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_name" TEXT,
    "details" TEXT,
    "user_id" TEXT,
    "user_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '',
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "csv_data_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "monitored_items_external_score_idx" ON "monitored_items"("external_score");

-- CreateIndex
CREATE INDEX "monitored_items_external_severity_idx" ON "monitored_items"("external_severity");

-- CreateIndex
CREATE INDEX "monitored_items_internal_score_idx" ON "monitored_items"("internal_score");

-- CreateIndex
CREATE INDEX "monitored_items_internal_severity_idx" ON "monitored_items"("internal_severity");

-- CreateIndex
CREATE INDEX "monitored_items_score_confidence_idx" ON "monitored_items"("score_confidence");

-- CreateIndex
CREATE INDEX "monitored_items_security_state_idx" ON "monitored_items"("security_state");

-- CreateIndex
CREATE UNIQUE INDEX "csv_data_entries_name_key" ON "csv_data_entries"("name");

