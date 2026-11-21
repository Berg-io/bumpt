import test from "node:test";
import assert from "node:assert/strict";
import { matchesBranch, pickLatestInBranch } from "./version-utils";

test("matches versions of the tracked branch", () => {
  assert.equal(matchesBranch("16.4.1", "16"), true);
  assert.equal(matchesBranch("v16.0", "16"), true);
  assert.equal(matchesBranch("16.4.1", "16.x"), true);
  assert.equal(matchesBranch("3.11.9", "3.11"), true);
  assert.equal(matchesBranch("3.1.4", "3.11"), false);
  assert.equal(matchesBranch("3.12.0", "3.11"), false);
  assert.equal(matchesBranch("17.0", "16"), false);
  assert.equal(matchesBranch("16", "16.4"), false);
});

test("an empty branch matches everything", () => {
  assert.equal(matchesBranch("17.0", ""), true);
  assert.equal(matchesBranch("17.0", null), true);
});

test("picks the highest stable version of the branch", () => {
  const versions = ["16.1", "16.10", "16.9", "17.0", "16.11-rc1", "15.8"];
  assert.equal(pickLatestInBranch(versions, "16"), "16.10");
  assert.equal(pickLatestInBranch(versions, "15"), "15.8");
  assert.equal(pickLatestInBranch(versions, "18"), null);
  assert.equal(pickLatestInBranch(versions, ""), "17.0");
});
