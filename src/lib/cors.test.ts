import test from "node:test";
import assert from "node:assert/strict";
import { getCorsHeaders } from "./cors";

test("no CORS headers when no origins are configured", () => {
  assert.equal(getCorsHeaders("https://app.example.com", ""), null);
  assert.equal(getCorsHeaders("https://app.example.com", undefined), null);
});

test("no CORS headers for same-origin requests without Origin", () => {
  assert.equal(getCorsHeaders(null, "https://app.example.com"), null);
});

test("echoes a single allowed origin", () => {
  const headers = getCorsHeaders("https://b.example.com", "https://a.example.com, https://b.example.com/");
  assert.equal(headers?.["Access-Control-Allow-Origin"], "https://b.example.com");
  assert.equal(headers?.Vary, "Origin");
});

test("refuses origins that are not listed", () => {
  assert.equal(getCorsHeaders("https://evil.example", "https://a.example.com"), null);
});

test("wildcard stays possible when explicitly configured", () => {
  assert.equal(getCorsHeaders("https://evil.example", "*")?.["Access-Control-Allow-Origin"], "*");
});
