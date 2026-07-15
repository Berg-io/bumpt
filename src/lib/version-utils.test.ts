import { describe, expect, it } from "vitest";
import {
  compareNormalizedVersions,
  isVersionOutdated,
  semverSortDescending,
} from "./version-utils";

describe("compareNormalizedVersions", () => {
  it("treats v-prefix and plain versions as equal", () => {
    expect(compareNormalizedVersions("v1.0.0", "1.0.0")).toBe(0);
  });

  it("orders numeric segments correctly", () => {
    expect(compareNormalizedVersions("1.10.0", "1.9.0")).toBe(1);
    expect(compareNormalizedVersions("2.0.0", "10.0.0")).toBe(-1);
  });
});

describe("isVersionOutdated", () => {
  it("returns false for equivalent versions with different prefixes", () => {
    expect(isVersionOutdated("v1.0.0", "1.0.0")).toBe(false);
  });

  it("returns true when latest is newer", () => {
    expect(isVersionOutdated("1.0.0", "1.0.1")).toBe(true);
  });

  it("returns false when current is newer", () => {
    expect(isVersionOutdated("2.0.0", "1.9.9")).toBe(false);
  });
});

describe("semverSortDescending", () => {
  it("sorts versions from highest to lowest", () => {
    const sorted = ["1.2.0", "1.10.0", "1.9.0"].sort(semverSortDescending);
    expect(sorted).toEqual(["1.10.0", "1.9.0", "1.2.0"]);
  });
});
