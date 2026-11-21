import test from "node:test";
import assert from "node:assert/strict";
import { assertSafeOutboundUrl, fetchWithCheckedRedirects, isBlockedAddress } from "./outbound-url";

test("blocks loopback, link-local and metadata addresses", () => {
  for (const ip of ["127.0.0.1", "127.1.2.3", "169.254.169.254", "0.0.0.0", "::1", "fe80::1", "::ffff:127.0.0.1", "fd00:ec2::254"]) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
});

test("keeps public and private network addresses", () => {
  for (const ip of ["8.8.8.8", "10.0.0.5", "192.168.1.10", "172.16.0.1", "2606:4700::1111", "fd12:3456::1"]) {
    assert.equal(isBlockedAddress(ip), false, ip);
  }
});

test("rejects unsafe URLs without a DNS lookup", async () => {
  for (const url of [
    "http://127.0.0.1:3000/api/cron/check",
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost/",
    "http://[::1]/",
    "file:///etc/passwd",
    "not a url",
  ]) {
    await assert.rejects(assertSafeOutboundUrl(url), Error, url);
  }
});

test("accepts private IP literals", async () => {
  const url = await assertSafeOutboundUrl("http://192.168.1.10:8080/version.json");
  assert.equal(url.hostname, "192.168.1.10");
});

test("redirects are re-checked before being followed", async () => {
  const { createServer } = await import("node:http");
  const server = createServer((req, res) => {
    if (req.url === "/ok") {
      res.writeHead(302, { Location: "/final" });
    } else if (req.url === "/final") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("done");
      return;
    } else {
      res.writeHead(302, { Location: "http://169.254.169.254/latest/meta-data/" });
    }
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  // The test server itself is on loopback, so the check only blocks the metadata address.
  const checked: string[] = [];
  const check = async (url: string) => {
    checked.push(url);
    if (new URL(url).hostname === "169.254.169.254") throw new Error("blocked");
  };
  try {
    const ok = await fetchWithCheckedRedirects(`http://127.0.0.1:${port}/ok`, {}, check);
    assert.equal(await ok.text(), "done");
    assert.equal(checked.length, 2);

    await assert.rejects(fetchWithCheckedRedirects(`http://127.0.0.1:${port}/evil`, {}, check), /blocked/);
  } finally {
    server.close();
  }
});

test("OUTBOUND_ALLOW_LOCAL lifts the restriction", async () => {
  process.env.OUTBOUND_ALLOW_LOCAL = "true";
  try {
    await assertSafeOutboundUrl("http://127.0.0.1:3000/");
  } finally {
    delete process.env.OUTBOUND_ALLOW_LOCAL;
  }
});
