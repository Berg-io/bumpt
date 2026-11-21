import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareNormalizedVersions,
  isVersionOutdated,
  semverSortDescending,
} from "./version-utils";

describe("compareNormalizedVersions", () => {
  it("treats v-prefix and plain versions as equal", () => {
    assert.equal(compareNormalizedVersions("v1.0.0", "1.0.0"), 0);
  });

  it("orders numeric segments correctly", () => {
    assert.equal(compareNormalizedVersions("1.10.0", "1.9.0"), 1);
    assert.equal(compareNormalizedVersions("2.0.0", "10.0.0"), -1);
  });
});

describe("isVersionOutdated", () => {
  it("returns false for equivalent versions with different prefixes", () => {
    assert.equal(isVersionOutdated("v1.0.0", "1.0.0"), false);
  });

  it("returns true when latest is newer", () => {
    assert.equal(isVersionOutdated("1.0.0", "1.0.1"), true);
  });

  it("returns false when current is newer", () => {
    assert.equal(isVersionOutdated("2.0.0", "1.9.9"), false);
  });
});

describe("semverSortDescending", () => {
  it("sorts versions from highest to lowest", () => {
    const sorted = ["1.2.0", "1.10.0", "1.9.0"].sort(semverSortDescending);
    assert.deepEqual(sorted, ["1.10.0", "1.9.0", "1.2.0"]);
  });
});
