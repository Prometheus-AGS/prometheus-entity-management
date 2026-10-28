#!/usr/bin/env node
/**
 * Build `boundary-results.json` for phase-v4-a2ui-runtime-hardening from the real
 * acceptance receipts, for `kbd-phase-close-eval.sh`.
 *
 * Statuses come only from the receipts written by the local acceptance run
 * (`browser-receipts.json`, `headless-receipts.json`, `playwright-report.json`);
 * nothing is typed in by hand. Scenarios come from the BOUND contract snapshot, so
 * the evidence covers exactly the adopted scope.
 *
 * Budget consumption is measured from what can be measured (wall clock since the
 * execute dispatch, tool calls counted in the session and subagent transcripts)
 * and takes the repair-attempt count from the operator-visible flag. It is
 * self-reported accounting, not independent telemetry.
 *
 *   node scripts/build-a2ui-boundary-results.mjs --transcript <session.jsonl> \
 *     --repair-attempts <n> --repair-basis "<how n was counted>"
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const PHASE = "phase-v4-a2ui-runtime-hardening";
const root = process.cwd();
const phaseDir = join(root, ".kbd-orchestrator/phases", PHASE);
const evidenceDir = join(phaseDir, "evidence/hardening-acceptance");

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
const transcript = args.get("transcript");
const repairAttempts = Number(args.get("repair-attempts"));
const repairBasis = args.get("repair-basis");
if (!transcript || !existsSync(transcript)) fail("--transcript <session.jsonl> is required and must exist");
if (!Number.isInteger(repairAttempts) || repairAttempts < 0 || !repairBasis) {
  fail("--repair-attempts <n> and --repair-basis <text> are required");
}

function fail(message) {
  process.stderr.write(`build-a2ui-boundary-results: ${message}\n`);
  process.exit(1);
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const kbd = (...cli) => JSON.parse(execFileSync("prometheus", ["kbd", "--path", root, ...cli, "--json"], { encoding: "utf8" }));

const status = kbd("status");
const disposition = kbd("phase", "disposition", "--id", PHASE);
const digest = disposition.binding.contractDigest;
const snapshot = readJson(join(phaseDir, "adopted", `${digest}.json`));
const dispatch = readJson(join(phaseDir, "execute-dispatch.json"));

const receiptFiles = ["browser-receipts.json", "headless-receipts.json"];
const receipts = new Map();
for (const file of receiptFiles) {
  const path = join(evidenceDir, file);
  const bytes = readFileSync(path);
  for (const [id, receipt] of Object.entries(JSON.parse(bytes))) {
    receipts.set(id, { receipt, file: relative(root, path), digest: sha256(bytes) });
  }
}
const playwright = readJson(join(evidenceDir, "playwright-report.json")).stats;
const browserRunClean = playwright.unexpected === 0 && playwright.flaky === 0 && playwright.skipped === 0;

const scenarios = snapshot.scenarioMatrix.map((scenario) => {
  const found = receipts.get(scenario.id);
  const isBrowser = found?.file.endsWith("browser-receipts.json");
  const passed = found?.receipt.status === "pass" && (!isBrowser || browserRunClean);
  return {
    id: scenario.id,
    status: found ? (passed ? "PASS" : "FAIL") : "NOT_EXERCISED",
    attempted: `${scenario.name}: ${scenario.productionEntry}`,
    observed: found ? JSON.stringify(found.receipt.proof ?? found.receipt) : "",
    evidence: found ? `${found.file}#${scenario.id} sha256:${found.digest}` : "",
  };
});

const sourceRoots = [
  "packages/a2ui-react/src/official",
  "packages/a2ui-react/src/headless.ts",
  "packages/a2ui-react/src/index.ts",
  "examples/agui-activity-lab/server",
  "examples/agui-activity-lab/src",
];
function filesUnder(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => filesUnder(join(path, name)));
}
const sourceDigests = {};
for (const sourceRoot of sourceRoots) {
  for (const file of filesUnder(join(root, sourceRoot))) {
    const rel = relative(root, file);
    if (/\.test\.[tj]sx?$/.test(rel)) continue;
    sourceDigests[rel] = sha256(readFileSync(file));
  }
}

function countToolCalls(file) {
  let count = 0;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if ((entry.timestamp ?? "") < dispatch.dispatchedAt.replace("Z", "")) continue;
    const content = entry.message?.content;
    if (Array.isArray(content)) count += content.filter((block) => block?.type === "tool_use").length;
  }
  return count;
}
const sessionDir = join(dirname(transcript), transcript.split("/").pop().replace(/\.jsonl$/, ""), "subagents");
const mainCalls = countToolCalls(transcript);
const subagentCalls = existsSync(sessionDir)
  ? readdirSync(sessionDir).filter((f) => f.endsWith(".jsonl")).reduce((sum, f) => sum + countToolCalls(join(sessionDir, f)), 0)
  : 0;
const elapsedMinutes = Math.round((Date.now() - Date.parse(dispatch.dispatchedAt)) / 60000);

const results = {
  phase: PHASE,
  projectId: status.projectId,
  runId: status.runId,
  contractDigest: digest,
  generatedAt: new Date().toISOString(),
  producedBy: "scripts/build-a2ui-boundary-results.mjs from the local acceptance receipts",
  sourceDigests,
  scenarios,
  budgetConsumption: {
    source:
      "self-reported: wall clock since execute-dispatch.json dispatchedAt; tool_use blocks counted in the session transcript and its subagent transcripts since dispatch; repair attempts as stated by the operator-visible flag",
    values: {
      timeMinutes: { class: "measured", value: elapsedMinutes, note: "wall clock including waiting, not active agent time" },
      toolCalls: { class: "measured", value: mainCalls + subagentCalls, note: `main ${mainCalls} + subagents ${subagentCalls}; transcript snapshot may lag the last calls` },
      repairAttempts: { class: "estimate", value: repairAttempts, note: repairBasis },
    },
  },
};

const out = join(phaseDir, "boundary-results.json");
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
const summary = scenarios.map((s) => `${s.id}=${s.status}`).join(" ");
process.stdout.write(`wrote ${relative(root, out)}\n${summary}\nbudget: ${JSON.stringify(results.budgetConsumption.values)}\n`);
