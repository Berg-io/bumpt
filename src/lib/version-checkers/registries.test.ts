import assert from "node:assert/strict";
import test from "node:test";
import { nextPageFromLink, parseBearerChallenge, parseOciImage, pickOciVersionTag } from "./oci-registry";
import { pickWingetVersion, wingetManifestPath } from "./winget-manifest";
import { cycleOlderThanAll } from "./endoflife";

test("OCI image references name the registry and repository", () => {
  assert.deepEqual(parseOciImage("ghcr.io/home-assistant/home-assistant:2026.11"), {
    registry: "ghcr.io",
    repository: "home-assistant/home-assistant",
  });
  assert.deepEqual(parseOciImage("nginx/nginx-ingress"), { registry: "registry-1.docker.io", repository: "nginx/nginx-ingress" });
  assert.deepEqual(parseOciImage("docker.io/redis"), { registry: "registry-1.docker.io", repository: "library/redis" });
  assert.deepEqual(parseOciImage("localhost:5000/team/app@sha256:abc"), { registry: "localhost:5000", repository: "team/app" });
  assert.equal(parseOciImage("redis"), null);
});

test("the registry's bearer challenge and Link pagination are read", () => {
  assert.deepEqual(parseBearerChallenge('Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:a/b:pull"'), {
    realm: "https://ghcr.io/token",
    service: "ghcr.io",
    scope: "repository:a/b:pull",
  });
  assert.equal(
    nextPageFromLink('</v2/a/b/tags/list?last=2023.4.0b2&n=1000>; rel="next"'),
    "/v2/a/b/tags/list?last=2023.4.0b2&n=1000"
  );
});

test("the highest stable tag wins over betas, dev builds and floating tags", () => {
  const tags = ["latest", "stable", "2026.10.4", "2026.11.0b3", "2026.12.0.dev20261120", "2026.11.2", "main", "v3-distroless"];
  assert.equal(pickOciVersionTag(tags)?.version, "2026.11.2");
  assert.equal(pickOciVersionTag(["v3.7.1", "v3.8.0-rc.0", "v3.7.0", "main"])?.version, "3.7.1");
  assert.equal(pickOciVersionTag(["1.25.3", "1.27.0", "1.26.2"], "1.25")?.version, "1.25.3");
});

test("WinGet ids map to the manifest folders of microsoft/winget-pkgs", () => {
  assert.equal(wingetManifestPath("Microsoft.PowerToys"), "manifests/m/Microsoft/PowerToys");
  assert.equal(wingetManifestPath("Microsoft.VisualStudioCode.Insiders"), "manifests/m/Microsoft/VisualStudioCode/Insiders");
  assert.equal(wingetManifestPath("bad id"), null);
});

test("WinGet version folders are compared as versions, sub-packages left out", () => {
  const entries = [
    { type: "file", name: ".validation" },
    { type: "dir", name: "1.99.3" },
    { type: "dir", name: "1.100.3" },
    { type: "dir", name: "CLI" },
    { type: "dir", name: "Insiders" },
  ];
  assert.equal(pickWingetVersion(entries), "1.100.3");
});

test("a version older than every cycle on endoflife.date is past end of life", () => {
  const cycles = [{ cycle: "26" }, { cycle: "4" }, { cycle: "0.12" }, { cycle: "0.10" }];
  assert.equal(cycleOlderThanAll(cycles, "0.0.1")?.cycle, "0.10");
  assert.equal(cycleOlderThanAll(cycles, "0.12.18"), null);
  assert.equal(cycleOlderThanAll([{ cycle: "focal" }], "0.0.1"), null);
});
