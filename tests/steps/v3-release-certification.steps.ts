import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Given, Then, When } from "@cucumber/cucumber";

import {
  laneRegistry,
  labeledLanes,
  mandatoryLanes,
  sealBundle,
} from "../../scripts/release-check.mjs";

type Lane = {
  name: string;
  category: string;
  mandatory: boolean;
  label?: string;
  description?: string;
  command?: string[];
};

type World = {
  bundleDir?: string;
  manifest?: ReturnType<typeof sealBundle>;
  cleanup: string[];
};

const SHA = "c".repeat(40);
const root = process.cwd();

function world(self: unknown): World {
  return self as World;
}

function makeBundle(w: World): string {
  const dir = mkdtempSync(join(tmpdir(), "release-check-bdd-"));
  mkdirSync(join(dir, "receipts"), { recursive: true });
  mkdirSync(join(dir, "logs"), { recursive: true });
  w.bundleDir = dir;
  w.cleanup = w.cleanup ?? [];
  w.cleanup.push(dir);
  return dir;
}

function writeReceipt(dir: string, lane: Lane, exitCode = 0): void {
  const logContent = `log for ${lane.name}\n`;
  writeFileSync(join(dir, "logs", `${lane.name}.log`), logContent);
  const receipt = {
    lane: lane.name,
    category: lane.category,
    mandatory: lane.mandatory,
    command: lane.command ? lane.command.join(" ") : "",
    sourceSha: SHA,
    startedAt: new Date().toISOString(),
    durationMs: 1,
    exitCode,
    logFile: `logs/${lane.name}.log`,
    logSha256: createHash("sha256").update(logContent).digest("hex"),
    logBytes: logContent.length,
  };
  writeFileSync(join(dir, "receipts", `${lane.name}.json`), JSON.stringify(receipt));
}

Given("the release-check lane registry", function (this: unknown) {
  world(this).cleanup = [];
});

Then(
  "the registry covers frozen install, formatting, typecheck, tests, builds, packed consumers, audits, skills and snippets, all five examples, Dart and Flutter, Cargo and Tauri, docs, provenance, and registry dry runs",
  () => {
    const categories = new Set(mandatoryLanes().map((lane) => lane.category));
    for (const required of [
      "install",
      "format-lint",
      "typecheck",
      "tests",
      "builds",
      "packed-consumers",
      "audits",
      "skills",
      "examples",
      "dart-flutter",
      "cargo-tauri",
      "docs",
      "provenance",
      "registry-dry-runs",
    ]) {
      assert.ok(categories.has(required), `registry missing category ${required}`);
    }
    for (const example of [
      "example-vite-react19",
      "example-nextjs-app-router",
      "example-agentic-a2ui",
      "example-flutter-riverpod-a2ui",
      "example-tauri-universal",
    ]) {
      assert.ok(
        mandatoryLanes().some((lane) => lane.name === example),
        `registry missing ${example}`,
      );
    }
  },
);

Then("every mandatory lane resolves to a real root script", () => {
  const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts as Record<
    string,
    string
  >;
  for (const lane of mandatoryLanes()) {
    assert.ok(lane.command, `${lane.name} needs a command`);
    const [bin, ...args] = lane.command as string[];
    assert.equal(bin, "pnpm");
    if (args[0] === "run") {
      assert.ok(scripts[args[1]], `${lane.name} references missing root script ${args[1]}`);
    } else {
      assert.deepEqual(args, ["install", "--frozen-lockfile"]);
    }
  }
});

Then("platform and manual limits are explicitly labeled and non-blocking", () => {
  const labeled = labeledLanes();
  assert.ok(labeled.length >= 3);
  for (const lane of labeled) {
    assert.equal(lane.mandatory, false);
    assert.ok(lane.label === "platform" || lane.label === "manual");
    assert.ok(typeof lane.description === "string" && lane.description.length > 0);
  }
});

Given("a synthetic evidence bundle with one mandatory lane absent", function (this: unknown) {
  const w = world(this);
  const dir = makeBundle(w);
  for (const lane of mandatoryLanes().slice(1)) writeReceipt(dir, lane);
});

Given(
  "a synthetic evidence bundle with every mandatory lane passing on one source SHA",
  function (this: unknown) {
    const w = world(this);
    const dir = makeBundle(w);
    for (const lane of mandatoryLanes()) writeReceipt(dir, lane);
  },
);

When("the seal step evaluates the bundle", function (this: unknown) {
  const w = world(this);
  assert.ok(w.bundleDir, "bundle dir must exist");
  w.manifest = sealBundle(w.bundleDir, { tag: "bdd-synthetic" });
});

Then("the manifest verdict is incomplete and names the missing lane", function (this: unknown) {
  const w = world(this);
  assert.equal(w.manifest?.verdict, "incomplete");
  assert.deepEqual(w.manifest?.missing, [mandatoryLanes()[0].name]);
});

Then("the manifest verdict is complete", function (this: unknown) {
  const w = world(this);
  assert.equal(w.manifest?.verdict, "complete");
  assert.deepEqual(w.manifest?.missing, []);
  assert.deepEqual(w.manifest?.failed, []);
});

Then(
  "every receipt and log carries a SHA-256 hash and the same 40-hex source SHA",
  function (this: unknown) {
    const w = world(this);
    assert.match(w.manifest?.sourceSha ?? "", /^[0-9a-f]{40}$/);
    for (const entry of w.manifest?.lanes ?? []) {
      if (entry.status !== "pass") continue;
      assert.match(entry.receiptSha256 ?? "", /^[0-9a-f]{64}$/);
      assert.match(entry.logSha256 ?? "", /^[0-9a-f]{64}$/);
    }
    for (const dir of w.cleanup) rmSync(dir, { recursive: true, force: true });
  },
);
