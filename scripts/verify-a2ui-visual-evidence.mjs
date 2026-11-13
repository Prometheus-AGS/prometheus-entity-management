import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "..");

/**
 * Two sources of evidence:
 *
 * - `A2UI_VISUAL_EVIDENCE=<dir>`: a folder written by
 *   `pnpm run capture:a2ui-visual -- --out <dir>`, read through its
 *   `manifest.json` (every file digested). The folder and the manifest must
 *   exist; nothing falls back to the legacy location.
 * - unset: the legacy fixed location under `.kbd-orchestrator` and its
 *   `visual-evidence.json`, checked exactly as before.
 */
const capturedFolder = process.env.A2UI_VISUAL_EVIDENCE;

if (capturedFolder === undefined) {
  await verifyLegacyEvidence();
} else {
  await verifyCapturedEvidence(capturedFolder);
}

async function verifyLegacyEvidence() {
  const evidenceRoot = join(
    workspaceRoot,
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge",
  );
  const manifest = JSON.parse(await readFile(join(evidenceRoot, "visual-evidence.json"), "utf8"));

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.protocol, "v0.9.1");
  assert.equal(manifest.route, "http://127.0.0.1:4177/");
  assert.match(manifest.browser.userAgent, /HeadlessChrome\/150\.0\.0\.0/);

  await verifyArtifact(manifest);
  await verifyScreenshots(manifest, evidenceRoot);
  await verifyRecordings(manifest, evidenceRoot);
  verifyOutcomesAndAccessibility(manifest);

  process.stdout.write(
    "[a2ui-visual] PASS: artifact, desktop/mobile screenshots, keyboard trace, video, and WCAG evidence are hash-verified.\n",
  );
}

async function verifyCapturedEvidence(folder) {
  if (folder.trim() === "") fail("A2UI_VISUAL_EVIDENCE is set but empty.");
  const evidenceRoot = resolve(folder);
  if (!existsSync(evidenceRoot) || !statSync(evidenceRoot).isDirectory()) {
    fail(
      `A2UI_VISUAL_EVIDENCE folder ${evidenceRoot} does not exist. ` +
        `Capture it first: pnpm run capture:a2ui-visual -- --out ${evidenceRoot}`,
    );
  }
  const manifestPath = join(evidenceRoot, "manifest.json");
  if (!existsSync(manifestPath)) {
    fail(
      `A2UI_VISUAL_EVIDENCE folder ${evidenceRoot} has no manifest.json; ` +
        "the capture did not complete. Re-run pnpm run capture:a2ui-visual -- --out <empty dir>.",
    );
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  assert.equal(manifest.schemaVersion, 2, "captured manifest schemaVersion");
  assert.equal(typeof manifest.protocol, "string", "protocol");
  assert.equal(
    manifest.protocol,
    String(manifest.page?.protocolChip ?? "").replace(/^A2UI\s+/, ""),
    "protocol matches the version the page displayed",
  );
  // The wire versions the page actually sent must be the protocol it displayed.
  const observed = manifest.page?.observedEnvelopeVersions;
  assert.ok(Array.isArray(observed) && observed.length > 0, "page.observedEnvelopeVersions recorded");
  assert.ok(observed.every((version) => version === manifest.protocol), `observed envelope versions ${JSON.stringify(observed)} match protocol ${manifest.protocol}`);
  // Supporting build artifacts must still be the ones the capture used.
  assert.ok(Array.isArray(manifest.supportingArtifacts) && manifest.supportingArtifacts.length > 0, "supportingArtifacts recorded");
  for (const supporting of manifest.supportingArtifacts) {
    assert.equal(await sha256(join(workspaceRoot, supporting.entry)), supporting.sha256, `${supporting.entry} changed since capture`);
  }
  assert.match(manifest.route, /^http:\/\/127\.0\.0\.1:\d+\/$/, "route");
  assert.match(manifest.browser.userAgent, /Chrome\/\d+/, "Chromium user agent");

  // The manifest's digest list covers exactly the files in the folder.
  const listed = new Map();
  for (const file of manifest.files ?? []) {
    assert.ok(!listed.has(file.path), `${file.path} is listed once`);
    listed.set(file.path, file);
    const path = join(evidenceRoot, ...file.path.split("/"));
    assert.ok(existsSync(path), `${file.path} is present`);
    assert.equal(await sha256(path), file.sha256, `${file.path} hash`);
  }
  const present = walk(evidenceRoot)
    .map((path) => relative(evidenceRoot, path).split(sep).join("/"))
    .filter((path) => path !== "manifest.json");
  for (const path of present) assert.ok(listed.has(path), `${path} is listed in manifest.json`);

  assert.deepEqual(
    manifest.screenshots.map(({ id }) => id),
    ["desktop-initial", "desktop-policy-outcomes", "mobile-policy-outcomes"],
    "screenshot set",
  );
  const mobile = manifest.screenshots.find(({ id }) => id === "mobile-policy-outcomes");
  assert.equal(mobile.width, 390, "mobile screenshot width");
  for (const entry of [
    ...manifest.screenshots,
    manifest.keyboard.trace,
    manifest.keyboard.video,
  ]) {
    assert.ok(listed.has(entry.path), `${entry.path} is in the manifest digest list`);
  }

  await verifyArtifact(manifest);
  await verifyScreenshots(manifest, evidenceRoot);
  await verifyRecordings(manifest, evidenceRoot);
  verifyOutcomesAndAccessibility(manifest);
  assert.deepEqual(manifest.keyboard.mobile.outcomes, manifest.keyboard.outcomes, "390px keyboard outcomes");
  assert.equal(manifest.keyboard.mobile.pointerClicks, 0, "390px pointer clicks");
  assert.equal(manifest.accessibility.horizontalOverflowAt390px, false, "no horizontal overflow at 390px");

  process.stdout.write(
    `[a2ui-visual] PASS: captured evidence in ${evidenceRoot} (protocol ${manifest.protocol}) — ` +
      "artifact, desktop/mobile screenshots, keyboard trace, video, and WCAG evidence are hash-verified.\n",
  );
}

async function verifyArtifact(manifest) {
  const artifactPath = join(workspaceRoot, manifest.artifact.entry);
  assert.equal(await sha256(artifactPath), manifest.artifact.sha256, "built artifact hash");
}

async function verifyScreenshots(manifest, evidenceRoot) {
  for (const screenshot of manifest.screenshots) {
    const path = join(evidenceRoot, screenshot.path);
    const png = await readFile(path);
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG", screenshot.id);
    assert.equal(png.readUInt32BE(16), screenshot.width, `${screenshot.id} width`);
    assert.equal(png.readUInt32BE(20), screenshot.height, `${screenshot.id} height`);
    assert.equal(await sha256(path), screenshot.sha256, `${screenshot.id} hash`);
  }
}

async function verifyRecordings(manifest, evidenceRoot) {
  for (const recording of [manifest.keyboard.trace, manifest.keyboard.video]) {
    const path = join(evidenceRoot, recording.path);
    const bytes = await readFile(path);
    assert.ok(bytes.length > 1_000, recording.path);
    assert.equal(await sha256(path), recording.sha256, `${recording.path} hash`);
  }
}

/**
 * Operator-approved exception (2026-11-12, phase-a2ui-1-0-agui-upgrade, boundary run 2):
 * the official @a2ui/web_core 0.15.0 basic-catalog Custom Elements put `aria-label` on
 * their host element, which has no ARIA role, so axe cannot decide `aria-prohibited-attr`
 * and reports it as incomplete (needs review), not as a violation. This is the upstream
 * design: the upstream A2UI accessibility conformance suite reads labels from the host
 * and expects a Button host's role to resolve to "button", so adding `role` to the host
 * would break upstream conformance. Allowed only when every target is an official
 * `a2ui-basic-*` host; axe violations are never excepted.
 */
function isRecordedAxeException(item) {
  return item.id === "aria-prohibited-attr"
    && Array.isArray(item.targets) && item.targets.length > 0
    && item.targets.every((target) => /^a2ui-basic-[a-z-]+(\[[^\]]*\])*$/.test(String(target)));
}

function verifyOutcomesAndAccessibility(manifest) {
  assert.deepEqual(manifest.keyboard.outcomes, [
    "executed",
    "unauthorized-field",
    "approval-denied",
  ]);
  assert.equal(manifest.keyboard.pointerClicks, 0);
  assert.equal(manifest.accessibility.axe.critical, 0);
  assert.equal(manifest.accessibility.axe.serious, 0);
  // Inconclusive (axe "incomplete") critical/serious results must be zero, except the one
  // recorded exception below; any other inconclusive result, or this rule on any other
  // element, still fails.
  const incomplete = manifest.accessibility.axe.incomplete ?? [];
  const unexplained = incomplete.filter((item) =>
    (item.impact === "critical" || item.impact === "serious") && !isRecordedAxeException(item));
  assert.deepEqual(unexplained, [], "unexplained critical/serious axe incomplete results");
  if (incomplete.length === 0) assert.equal(manifest.accessibility.axe.incompleteCriticalOrSerious, 0);
  assert.equal(manifest.accessibility.consoleErrors, 0);
  assert.ok(manifest.accessibility.contrast.every(({ ratio }) => ratio >= 4.5));
  assert.ok(manifest.accessibility.targets.every(({ width, height }) => width >= 44 && height >= 44));
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function fail(message) {
  process.stderr.write(`[a2ui-visual] FAIL: ${message}\n`);
  process.exit(1);
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}
