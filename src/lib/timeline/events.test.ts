import assert from "node:assert/strict";
import test from "node:test";
import { buildTimelineEvents, type TimelineFilters, type TimelineVulnerabilityRow } from "./events";

const base: TimelineVulnerabilityRow = {
  id: "v1",
  cveId: "CVE-2024-0001",
  summary: null,
  severity: "CRITICAL",
  cvssScore: 9.8,
  epss: 0.4,
  isKev: true,
  kevAddedAt: new Date("2024-03-10T00:00:00Z"),
  kevDueDate: null,
  knownRansomware: false,
  publishedAt: new Date("2024-03-01T00:00:00Z"),
  fixedVersion: "1.2.4",
  affectedVersion: "1.2.3",
  firstDetectedAt: new Date("2024-03-05T00:00:00Z"),
  resolvedAt: new Date("2024-04-01T00:00:00Z"),
  resolvedInVersion: "1.2.4",
  item: { id: "i1", name: "nginx", type: "software", currentVersion: "1.2.4" },
};

const noFilter: TimelineFilters = {
  since: null,
  types: new Set(),
  severities: new Set(),
  kevOnly: false,
  openOnly: false,
  search: "",
};

test("each dated step of a CVE becomes one event, newest first", () => {
  const events = buildTimelineEvents([base], noFilter);
  assert.deepEqual(events.map((e) => e.type), ["resolved", "kev", "detected", "published"]);
  assert.equal(events[0].open, false);
});

test("the period, type and severity filters apply", () => {
  const since = new Date("2024-03-06T00:00:00Z");
  assert.deepEqual(buildTimelineEvents([base], { ...noFilter, since }).map((e) => e.type), ["resolved", "kev"]);
  assert.equal(buildTimelineEvents([base], { ...noFilter, types: new Set(["detected"]) }).length, 1);
  assert.equal(buildTimelineEvents([base], { ...noFilter, severities: new Set(["LOW"]) }).length, 0);
  assert.equal(buildTimelineEvents([base], { ...noFilter, openOnly: true }).length, 0);
});

test("search matches the CVE id or the item name", () => {
  assert.equal(buildTimelineEvents([base], { ...noFilter, search: "NGINX" }).length, 4);
  assert.equal(buildTimelineEvents([base], { ...noFilter, search: "2024-0001" }).length, 4);
  assert.equal(buildTimelineEvents([base], { ...noFilter, search: "apache" }).length, 0);
});
