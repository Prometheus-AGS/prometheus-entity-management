import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  laneRegistry,
  labeledLanes,
  mandatoryLanes,
  sealBundle,
} from "../../scripts/release-check.mjs";

const root = process.cwd();
const SHA = "a".repeat(40);

function makeBundle() {
  const dir = mkdtempSync(join(tmpdir(), "release-check-"));
  mkdirSync(join(dir, "receipts"), { recursive: true });
  mkdirSync(join(dir, "logs"), { recursive: true });
  return dir;
}

function writeReceipt(dir, lane, { exitCode = 0, sourceSha = SHA, tamper = false } = {}) {
  const logContent = `log for ${lane.name}\n`;
  writeFileSync(join(dir, "logs", `${lane.name}.log`), logContent);
  const logSha256 = createHash("sha256").update(tamper ? "tampered\n" : logContent).digest("hex");
  const receipt = {
    lane: lane.name,
    category: lane.category,
    mandatory: lane.mandatory,
    command: lane.command ? lane.command.join(" ") : "",
    sourceSha,
    startedAt: new Date().toISOString(),
    durationMs: 1,
    exitCode,
    logFile: `logs/${lane.name}.log`,
    logSha256,
    logBytes: logContent.length,
  };
  writeFileSync(join(dir, "receipts", `${lane.name}.json`), JSON.stringify(receipt));
}

test("registry covers every plan lane category with mandatory fail-closed lanes", () => {
  const names = mandatoryLanes().map((lane) => lane.name);
  const expected = [
    "frozen-install",
    "validate",
    "lint",
    "typecheck",
    "test",
    "build",
    "security",
    "skills",
    "package-contracts",
    "framework-neutral-core",
    "binding-singletons",
    "sync-persistence",
    "a2ui-bridge",
    "a2a-conformance",
    "flutter-source-provenance",
    "dart-graph-riverpod",
    "tauri-plugin",
    "release-pipeline",
    "flint-contracts",
    "skills-snippets",
    "skills-ecosystem",
    "example-coverage",
    "example-vite-react19",
    "example-nextjs-app-router",
    "example-agentic-a2ui",
    "example-flutter-riverpod-a2ui",
    "example-tauri-universal",
    "docs-foundation",
    "docs-api-reference",
    "docs-snippets",
    "docs-concepts",
    "docs-examples",
    "docs-operations",
    "docs-pages-quality",
    "docs-pages",
  ];
  assert.deepEqual([...names].sort(), expected.sort());
  for (const lane of mandatoryLanes()) {
    assert.ok(Array.isArray(lane.command) && lane.command.length > 0, `${lane.name} needs a command`);
    assert.equal(lane.label, undefined, `${lane.name} must not be labeled optional`);
  }
});

test("every registry lane command resolves to a real root script", () => {
  const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
  for (const lane of laneRegistry) {
    if (!lane.command) continue;
    const [bin, ...args] = lane.command;
    assert.equal(bin, "pnpm", `${lane.name} must run through pnpm`);
    if (args[0] === "run") {
      assert.ok(scripts[args[1]], `${lane.name} references missing root script ${args[1]}`);
    } else {
      assert.deepEqual(args, ["install", "--frozen-lockfile"], `${lane.name} unexpected command`);
    }
  }
});

test("platform and manual limits are explicit, labeled, and non-blocking", () => {
  const labeled = labeledLanes();
  assert.deepEqual(
    labeled.map((lane) => lane.name).sort(),
    ["github-pages-live-deploy", "npm-trusted-publisher", "tauri-physical-device"],
  );
  for (const lane of labeled) {
    assert.equal(lane.mandatory, false);
    assert.ok(lane.label === "platform" || lane.label === "manual");
    assert.ok(typeof lane.description === "string" && lane.description.length > 0);
  }
});

test("seal fails closed when a mandatory lane is missing", () => {
  const dir = makeBundle();
  try {
    const lanes = mandatoryLanes().slice(1); // drop frozen-install
    for (const lane of lanes) writeReceipt(dir, lane);
    const manifest = sealBundle(dir, { tag: "test-tag" });
    assert.equal(manifest.verdict, "incomplete");
    assert.deepEqual(manifest.missing, ["frozen-install"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("seal fails closed on failed lanes, SHA drift, and tampered logs", () => {
  const dir = makeBundle();
  try {
    for (const lane of mandatoryLanes()) writeReceipt(dir, lane);
    writeReceipt(dir, mandatoryLanes().find((lane) => lane.name === "lint"), { exitCode: 1 });
    let manifest = sealBundle(dir);
    assert.equal(manifest.verdict, "incomplete");
    assert.deepEqual(manifest.failed, ["lint"]);

    writeReceipt(dir, mandatoryLanes().find((lane) => lane.name === "lint"), { sourceSha: "b".repeat(40) });
    manifest = sealBundle(dir);
    assert.equal(manifest.verdict, "incomplete");
    assert.deepEqual(manifest.shaMismatch, ["lint"]);

    writeReceipt(dir, mandatoryLanes().find((lane) => lane.name === "lint"), { tamper: true });
    manifest = sealBundle(dir);
    assert.equal(manifest.verdict, "incomplete");
    assert.deepEqual(manifest.tampered, ["lint"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sealed manifest binds all receipts to one source SHA with SHA-256 hashes", () => {
  const dir = makeBundle();
  try {
    for (const lane of mandatoryLanes()) writeReceipt(dir, lane);
    const manifest = sealBundle(dir, { tag: "v3.0.0-rc.1" });
    assert.equal(manifest.verdict, "complete");
    assert.equal(manifest.schema, "prometheus.release-certification/v1");
    assert.match(manifest.sourceSha, /^[0-9a-f]{40}$/);
    assert.equal(manifest.tag, "v3.0.0-rc.1");
    assert.equal(manifest.failClosed, true);
    for (const entry of manifest.lanes) {
      if (entry.status !== "pass") continue;
      assert.match(entry.receiptSha256, /^[0-9a-f]{64}$/);
      assert.match(entry.logSha256, /^[0-9a-f]{64}$/);
    }
    assert.equal(manifest.limits.length, 3);
    const persisted = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    assert.equal(persisted.verdict, "complete");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
