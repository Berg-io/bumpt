import test from "node:test";
import assert from "node:assert/strict";
import { isPrereleaseVersion } from "./version-utils";

test("detects pre-release versions", () => {
  for (const value of [
    "27.0.0-alpha.0.1.1",
    "v2.0.0-beta.3",
    "1.5.0-rc1",
    "1.5.0rc1",
    "3.0.0-preview.2",
    "2026.1.0-nightly",
    "15.0.0-canary.12",
    "1.0.0-SNAPSHOT",
    "4.0.0.dev2",
  ]) {
    assert.equal(isPrereleaseVersion(value), true, value);
  }
});

test("keeps stable versions", () => {
  for (const value of ["20.11.0", "v1.31.9", "22.04.3 LTS", "13.3.1", "121.0.6167.85", "release-1.2", "1.0.0-src", null, ""]) {
    assert.equal(isPrereleaseVersion(value), false, String(value));
  }
});
