import assert from "node:assert/strict";
import test from "node:test";
import {
  getDisplayStatus,
  isItemAtRisk,
  isItemOutdated,
  isItemVulnerable,
} from "./item-classification";

test("outdated item with CVEs is vulnerable, at risk, and displays as critical", () => {
  const item = {
    status: "outdated",
    securityState: "vulnerable",
    cves: '["CVE-2024-0001"]',
  };

  assert.equal(isItemOutdated(item), true);
  assert.equal(isItemVulnerable(item), true);
  assert.equal(isItemAtRisk(item), true);
  assert.equal(getDisplayStatus(item), "critical");
});

test("outdated item with CVEs but stale securityState still counts as critical", () => {
  const item = {
    status: "outdated",
    securityState: "no_known_vuln",
    cves: '["CVE-2024-0001"]',
  };

  assert.equal(isItemOutdated(item), true);
  assert.equal(isItemVulnerable(item), true);
  assert.equal(isItemAtRisk(item), true);
  assert.equal(getDisplayStatus(item), "critical");
});

test("outdated item without CVEs stays outdated and not at risk", () => {
  const item = {
    status: "outdated",
    securityState: "no_known_vuln",
    cves: null,
  };

  assert.equal(isItemOutdated(item), true);
  assert.equal(isItemVulnerable(item), false);
  assert.equal(isItemAtRisk(item), false);
  assert.equal(getDisplayStatus(item), "outdated");
});

test("up-to-date vulnerable item displays as critical", () => {
  const item = {
    status: "up_to_date",
    securityState: "vulnerable",
    cves: '["CVE-2024-0002"]',
  };

  assert.equal(isItemOutdated(item), false);
  assert.equal(isItemAtRisk(item), true);
  assert.equal(getDisplayStatus(item), "critical");
});
