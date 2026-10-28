import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When, setDefaultTimeout } from "@cucumber/cucumber";

type Receipts = Record<string, { status: string; proof: unknown }>;

const root = process.cwd();
const evidence = join(
  root,
  ".kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/evidence/hardening-acceptance",
);
const browserReceipts = join(evidence, "browser-receipts.json");
const headlessReceipts = join(evidence, "headless-receipts.json");
let browser: Receipts | undefined;
let headless: Receipts | undefined;
// A failed run is remembered and rethrown: each scenario must not pay for the run again.
let browserFailure: unknown;
let headlessFailure: unknown;

setDefaultTimeout(30 * 60 * 1_000);

function run(command: string, args: string[]): void {
  execFileSync(command, args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: "inherit",
    timeout: 25 * 60 * 1_000,
  });
}

function read(path: string): Receipts {
  assert.ok(existsSync(path), `${path} was not written`);
  return JSON.parse(readFileSync(path, "utf8")) as Receipts;
}

function passed(receipts: Receipts | undefined, id: string): void {
  assert.ok(receipts, "the run has not executed");
  assert.equal(receipts[id]?.status, "pass", `${id} has no passing receipt`);
}

Given("the A2UI hardening acceptance inputs are available", function () {
  assert.ok(existsSync(join(root, "examples/agui-activity-lab/server/producer.ts")));
  assert.ok(existsSync(join(root, "tests/browser/v4-a2ui-runtime-hardening.spec.ts")));
});

When("the A2UI hardening browser flows execute against the lab producer", function () {
  if (browser) return;
  if (browserFailure) throw browserFailure;
  try {
    rmSync(browserReceipts, { force: true });
    run("pnpm", ["--filter", "prometheus-agui-activity-lab-example", "build"]);
    run("pnpm", [
      "exec", "playwright", "test",
      "--config", "tests/browser/v4-a2ui-runtime-hardening.playwright.config.ts",
    ]);
    browser = read(browserReceipts);
  } catch (error) {
    browserFailure = error;
    throw error;
  }
});

When("the A2UI hardening headless run executes", function () {
  if (headless) return;
  if (headlessFailure) throw headlessFailure;
  try {
    rmSync(headlessReceipts, { force: true });
    run("node", ["--import", "tsx", "tests/headless/v4-a2ui-headless.run.ts"]);
    headless = read(headlessReceipts);
  } catch (error) {
    headlessFailure = error;
    throw error;
  }
});

const browserSteps: Array<[RegExp, string]> = [
  [/^AUI-1 duplicate create activity is a no-op and a conflicting digest is reported$/, "AUI-1"],
  [/^AUI-2 duplicate and out-of-order versioned updates change nothing$/, "AUI-2"],
  [/^AUI-3 a messages snapshot replay keeps the surface and typed input$/, "AUI-3"],
  [/^AUI-4 a newer restatement applies as updates with producer-wins conflicts reported$/, "AUI-4"],
  [/^AUI-5 one activity delivered under two message ids is applied once$/, "AUI-5"],
  [/^AUI-6 ordered deltas apply and gaps and refused batches are reported$/, "AUI-6"],
  [/^AUI-7 the held versions are reported so only the missing operations return$/, "AUI-7"],
  [/^AUI-14 stale-action rejection operations are applied$/, "AUI-14"],
  [/^AUI-8 action ids are distinct across contexts and reloads and a retry reuses one$/, "AUI-8"],
  [/^AUI-9 the envelope the producer received is complete for v0\.9\.1 and v1\.0$/, "AUI-9"],
  [/^AUI-15 a failing action response does not undo the batch that carried it$/, "AUI-15"],
  [/^AUI-16 an oversize delta is rejected before it is buffered and a redelivered waiting delta is held once$/, "AUI-16"],
  [/^AUI-17 component payload growth past the cap is rejected$/, "AUI-17"],
  [/^AUI-18 data keys the official model cannot read do not wedge later updates$/, "AUI-18"],
  [/^AUI-19 a delete and create of one surface in one activity restores its data$/, "AUI-19"],
];
for (const [pattern, id] of browserSteps) {
  Then(pattern, function () {
    passed(browser, id);
    // AUI-9 is proved in both forms: with and without sendDataModel.
    if (id === "AUI-9") passed(browser, "AUI-9b");
    // AUI-5 is proved on one stream with two message ids and on two real streams.
    if (id === "AUI-5") passed(browser, "AUI-5b");
  });
}

Then("AUI-10 export reaches a fixed point", function () { passed(headless, "AUI-10"); });
Then("AUI-11 the headless and React runtimes agree on one corpus", function () { passed(headless, "AUI-11"); });
Then("AUI-12 unreachable components are pruned from the export", function () { passed(headless, "AUI-12"); });
Then("AUI-13 the release records match the npm registry and the tag is not exercised", function () {
  passed(headless, "AUI-13");
});
