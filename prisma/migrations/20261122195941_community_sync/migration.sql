-- CreateTable
CREATE TABLE "item_vulnerabilities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "item_id" TEXT NOT NULL,
    "cve_id" TEXT NOT NULL,
    "summary" TEXT,
    "severity" TEXT,
    "cvss_score" REAL,
    "epss" REAL,
    "is_kev" BOOLEAN NOT NULL DEFAULT false,
    "kev_added_at" DATETIME,
    "kev_due_date" DATETIME,
    "known_ransomware" BOOLEAN NOT NULL DEFAULT false,
    "published_at" DATETIME,
    "fixed_version" TEXT,
    "sources" TEXT NOT NULL DEFAULT '[]',
    "affected_version" TEXT,
    "first_detected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" DATETIME,
    "resolved_in_version" TEXT,
    CONSTRAINT "item_vulnerabilities_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "monitored_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "item_vulnerabilities_first_detected_idx" ON "item_vulnerabilities"("first_detected_at");

-- CreateIndex
CREATE INDEX "item_vulnerabilities_published_idx" ON "item_vulnerabilities"("published_at");

-- CreateIndex
CREATE INDEX "item_vulnerabilities_resolved_idx" ON "item_vulnerabilities"("resolved_at");

-- CreateIndex
CREATE UNIQUE INDEX "item_vulnerabilities_item_cve_key" ON "item_vulnerabilities"("item_id", "cve_id");
