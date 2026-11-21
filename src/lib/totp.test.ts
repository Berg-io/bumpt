import test from "node:test";
import assert from "node:assert/strict";
import { base32Decode, base32Encode, buildOtpauthUrl, generateTotp, generateTotpSecret, verifyTotp } from "./totp";

// RFC 6238 test secret "12345678901234567890" (ASCII), SHA-1, truncated to 6 digits.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

test("matches the RFC 6238 SHA-1 test vectors", () => {
  assert.equal(generateTotp(RFC_SECRET, 59 * 1000), "287082");
  assert.equal(generateTotp(RFC_SECRET, 1111111109 * 1000), "081804");
  assert.equal(generateTotp(RFC_SECRET, 1234567890 * 1000), "005924");
  assert.equal(generateTotp(RFC_SECRET, 2000000000 * 1000), "279037");
});

test("base32 round-trips", () => {
  const raw = Buffer.from("hello totp secret!!");
  assert.deepEqual(base32Decode(base32Encode(raw)), raw);
});

test("verifies the current code and tolerates one step of drift", () => {
  const secret = generateTotpSecret();
  const now = Date.now();
  assert.equal(verifyTotp(secret, generateTotp(secret, now), now), true);
  assert.equal(verifyTotp(secret, generateTotp(secret, now - 30_000), now), true);
  assert.equal(verifyTotp(secret, generateTotp(secret, now - 120_000), now), false);
  assert.equal(verifyTotp(secret, "12345", now), false);
  assert.equal(verifyTotp(secret, "abcdef", now), false);
});

test("builds an otpauth URL", () => {
  const url = buildOtpauthUrl("JBSWY3DPEHPK3PXP", "admin@example.com");
  assert.ok(url.startsWith("otpauth://totp/bum.pt%3Aadmin%40example.com?"));
  assert.ok(url.includes("secret=JBSWY3DPEHPK3PXP"));
});
