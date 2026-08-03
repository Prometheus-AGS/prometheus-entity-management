import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");
const evidenceRoot = join(
  workspaceRoot,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge",
);
const manifest = JSON.parse(await readFile(join(evidenceRoot, "visual-evidence.json"), "utf8"));

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.protocol, "v0.9.1");
assert.equal(manifest.route, "http://127.0.0.1:4177/");
assert.match(manifest.browser.userAgent, /HeadlessChrome\/150\.0\.0\.0/);

const artifactPath = join(workspaceRoot, manifest.artifact.entry);
assert.equal(await sha256(artifactPath), manifest.artifact.sha256, "built artifact hash");

for (const screenshot of manifest.screenshots) {
  const path = join(evidenceRoot, screenshot.path);
  const png = await readFile(path);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", screenshot.id);
  assert.equal(png.readUInt32BE(16), screenshot.width, `${screenshot.id} width`);
  assert.equal(png.readUInt32BE(20), screenshot.height, `${screenshot.id} height`);
  assert.equal(await sha256(path), screenshot.sha256, `${screenshot.id} hash`);
}

for (const recording of [manifest.keyboard.trace, manifest.keyboard.video]) {
  const path = join(evidenceRoot, recording.path);
  const bytes = await readFile(path);
  assert.ok(bytes.length > 1_000, recording.path);
  assert.equal(await sha256(path), recording.sha256, `${recording.path} hash`);
}

assert.deepEqual(manifest.keyboard.outcomes, [
  "executed",
  "unauthorized-field",
  "approval-denied",
]);
assert.equal(manifest.keyboard.pointerClicks, 0);
assert.equal(manifest.accessibility.axe.critical, 0);
assert.equal(manifest.accessibility.axe.serious, 0);
assert.equal(manifest.accessibility.axe.incompleteCriticalOrSerious, 0);
assert.equal(manifest.accessibility.consoleErrors, 0);
assert.ok(manifest.accessibility.contrast.every(({ ratio }) => ratio >= 4.5));
assert.ok(manifest.accessibility.targets.every(({ width, height }) => width >= 44 && height >= 44));

process.stdout.write(
  "[a2ui-visual] PASS: artifact, desktop/mobile screenshots, keyboard trace, video, and WCAG evidence are hash-verified.\n",
);

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}
