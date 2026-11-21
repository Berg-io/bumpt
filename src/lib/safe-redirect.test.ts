import test from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "./safe-redirect";

test("keeps internal paths", () => {
  assert.equal(safeRedirectPath("/dashboard"), "/dashboard");
  assert.equal(safeRedirectPath("/admin/settings?tab=license"), "/admin/settings?tab=license");
});

test("falls back to the dashboard for empty values", () => {
  assert.equal(safeRedirectPath(null), "/dashboard");
  assert.equal(safeRedirectPath(undefined), "/dashboard");
  assert.equal(safeRedirectPath(""), "/dashboard");
});

test("rejects external and tricky redirects", () => {
  for (const value of [
    "https://evil.example",
    "http://evil.example/dashboard",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "dashboard",
    "/foo\\bar",
    "/foo\nbar",
  ]) {
    assert.equal(safeRedirectPath(value), "/dashboard", value);
  }
});
