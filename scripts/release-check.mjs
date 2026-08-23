#!/usr/bin/env node
//
// release-check.mjs — v3-release-certification
//
// One root command that runs every mandatory release-certification lane and
// seals an immutable, hashed evidence bundle bound to a single source SHA.
//
// Usage:
//   node scripts/release-check.mjs --list
//   node scripts/release-check.mjs --all                 # run every mandatory lane
//   node scripts/release-check.mjs --lanes lint,test     # run a chunk (receipts accumulate)
//   node scripts/release-check.mjs --seal [--tag <tag>]  # verify completeness, write manifest
//
// Fail-closed: the seal step refuses to certify when any mandatory lane is
// missing, failed, stale (different source SHA), or tampered (log hash
// mismatch). Platform/manual lanes are non-blocking but must be explicitly
// labeled in the manifest.

import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const DEFAULT_BUNDLE_DIR =
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-certification/bundle";

// Lane registry. `mandatory: true` lanes block certification when absent or
// failing. `label` marks the non-blocking limits the plan requires to be
// explicit: "platform" (needs a physical device / specific OS host) and
// "manual" (human-gated external configuration).
export const laneRegistry = [
  { name: "frozen-install", category: "install", mandatory: true, command: ["pnpm", "install", "--frozen-lockfile"] },
  { name: "validate", category: "hygiene", mandatory: true, command: ["pnpm", "run", "ci:validate"] },
  { name: "lint", category: "format-lint", mandatory: true, command: ["pnpm", "run", "ci:lint"] },
  { name: "typecheck", category: "typecheck", mandatory: true, command: ["pnpm", "run", "ci:typecheck"] },
  { name: "test", category: "tests", mandatory: true, command: ["pnpm", "run", "ci:test"] },
  { name: "build", category: "builds", mandatory: true, command: ["pnpm", "run", "ci:build"] },
  { name: "security", category: "audits", mandatory: true, command: ["pnpm", "run", "ci:security"] },
  { name: "skills", category: "skills", mandatory: true, command: ["pnpm", "run", "ci:skills"] },
  { name: "package-contracts", category: "packed-consumers", mandatory: true, command: ["pnpm", "run", "verify:package-contracts"] },
  { name: "framework-neutral-core", category: "packed-consumers", mandatory: true, command: ["pnpm", "run", "verify:framework-neutral-core"] },
  { name: "binding-singletons", category: "packed-consumers", mandatory: true, command: ["pnpm", "run", "verify:binding-singletons"] },
  { name: "sync-persistence", category: "persistence", mandatory: true, command: ["pnpm", "run", "verify:sync-persistence"] },
  { name: "a2ui-bridge", category: "protocol-bridges", mandatory: true, command: ["pnpm", "run", "verify:a2ui-bridge"] },
  { name: "a2a-conformance", category: "protocol-bridges", mandatory: true, command: ["pnpm", "run", "verify:a2a-conformance"] },
  { name: "flutter-source-provenance", category: "provenance", mandatory: true, command: ["pnpm", "run", "verify:flutter-source-provenance"] },
  { name: "dart-graph-riverpod", category: "dart-flutter", mandatory: true, command: ["pnpm", "run", "verify:dart-graph-riverpod"] },
  { name: "tauri-plugin", category: "cargo-tauri", mandatory: true, command: ["pnpm", "run", "verify:tauri-plugin"] },
  { name: "release-pipeline", category: "registry-dry-runs", mandatory: true, command: ["pnpm", "run", "verify:release-pipeline"] },
  { name: "flint-contracts", category: "portable-contracts", mandatory: true, command: ["pnpm", "run", "verify:flint-contracts"] },
  { name: "skills-snippets", category: "skills", mandatory: true, command: ["pnpm", "run", "verify:skills-snippets"] },
  { name: "skills-ecosystem", category: "skills", mandatory: true, command: ["pnpm", "run", "verify:skills-ecosystem"] },
  { name: "example-coverage", category: "examples", mandatory: true, command: ["pnpm", "run", "verify:example-coverage"] },
  { name: "example-vite-react19", category: "examples", mandatory: true, command: ["pnpm", "run", "verify:vite-react19"] },
  { name: "example-nextjs-app-router", category: "examples", mandatory: true, command: ["pnpm", "run", "verify:nextjs-app-router"] },
  { name: "example-agentic-a2ui", category: "examples", mandatory: true, command: ["pnpm", "run", "verify:agentic-a2ui"] },
  { name: "example-flutter-riverpod-a2ui", category: "dart-flutter", mandatory: true, command: ["pnpm", "run", "verify:flutter-riverpod-a2ui"] },
  { name: "example-tauri-universal", category: "cargo-tauri", mandatory: true, command: ["pnpm", "run", "verify:tauri-universal"] },
  { name: "docs-foundation", category: "docs", mandatory: true, command: ["pnpm", "run", "verify:docs-foundation"] },
  { name: "docs-api-reference", category: "docs", mandatory: true, command: ["pnpm", "run", "verify:docs-api-reference"] },
  { name: "docs-snippets", category: "docs", mandatory: true, command: ["pnpm", "run", "verify:docs-snippets"] },
  { name: "docs-concepts", category: "docs", mandatory: true, command: ["pnpm", "run", "verify:docs-concepts"] },
  { name: "docs-examples", category: "docs", mandatory: true, command: ["pnpm", "run", "verify:docs-examples"] },
  { name: "docs-operations", category: "docs", mandatory: true, command: ["pnpm", "run", "verify:docs-operations"] },
  { name: "docs-pages-quality", category: "docs", mandatory: true, command: ["pnpm", "run", "verify:docs-pages-quality"] },
  { name: "docs-pages", category: "docs", mandatory: true, command: ["pnpm", "run", "verify:docs-pages"] },
  {
    name: "tauri-physical-device",
    category: "cargo-tauri",
    mandatory: false,
    label: "platform",
    description: "Tauri physical-device certification (iOS/Android hardware) runs outside this environment.",
  },
  {
    name: "github-pages-live-deploy",
    category: "docs",
    mandatory: false,
    label: "manual",
    description: "First live GitHub Pages deployment is human-gated and performed after publication approval.",
  },
  {
    name: "npm-trusted-publisher",
    category: "registry-dry-runs",
    mandatory: false,
    label: "manual",
    description: "npm trusted-publisher and GitHub environment reviewer configuration is human-gated for v3-stable-publication.",
  },
];

export function mandatoryLanes(registry = laneRegistry) {
  return registry.filter((lane) => lane.mandatory);
}

export function labeledLanes(registry = laneRegistry) {
  return registry.filter((lane) => !lane.mandatory);
}

function sha256Hex(content) {
  return createHash("sha256").update(content).digest("hex");
}

function gitSourceSha(root) {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function receiptsDir(bundleDir) {
  return join(bundleDir, "receipts");
}

function logsDir(bundleDir) {
  return join(bundleDir, "logs");
}

export function receiptPath(bundleDir, laneName) {
  return join(receiptsDir(bundleDir), `${laneName}.json`);
}

export function runLane(lane, { bundleDir, root }) {
  mkdirSync(receiptsDir(bundleDir), { recursive: true });
  mkdirSync(logsDir(bundleDir), { recursive: true });
  const logFile = join(logsDir(bundleDir), `${lane.name}.log`);
  const sourceSha = gitSourceSha(root);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const [executable, ...args] = lane.command;

  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0", CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => chunks.push(chunk));
    child.once("error", (error) => {
      const logContent = `spawn error: ${error.message}\n`;
      writeFileSync(logFile, logContent);
      resolve(finalize(lane, bundleDir, logFile, sourceSha, startedAt, started, 127));
    });
    child.once("close", (code) => {
      writeFileSync(logFile, Buffer.concat(chunks));
      resolve(finalize(lane, bundleDir, logFile, sourceSha, startedAt, started, code ?? 1));
    });
  });
}

function finalize(lane, bundleDir, logFile, sourceSha, startedAt, started, exitCode) {
  const logContent = readFileSync(logFile);
  const receipt = {
    lane: lane.name,
    category: lane.category,
    mandatory: lane.mandatory,
    ...(lane.label ? { label: lane.label } : {}),
    command: lane.command.join(" "),
    sourceSha,
    startedAt,
    durationMs: Date.now() - started,
    exitCode,
    logFile: `logs/${lane.name}.log`,
    logSha256: sha256Hex(logContent),
    logBytes: logContent.byteLength,
  };
  writeFileSync(receiptPath(bundleDir, lane.name), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}

export function readReceipts(bundleDir) {
  const dir = receiptsDir(bundleDir);
  if (!existsSync(dir)) return new Map();
  const receipts = new Map();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const parsed = JSON.parse(readFileSync(join(dir, file), "utf8"));
    receipts.set(parsed.lane, { receipt: parsed, file: join(dir, file) });
  }
  return receipts;
}

export function sealBundle(bundleDir, { tag = null, registry = laneRegistry } = {}) {
  mkdirSync(bundleDir, { recursive: true });
  const receipts = readReceipts(bundleDir);
  const missing = [];
  const failed = [];
  const shaMismatch = [];
  const tampered = [];
  let sourceSha = null;

  const laneEntries = [];
  for (const lane of registry) {
    const entry = receipts.get(lane.name);
    if (entry === undefined) {
      if (lane.mandatory) missing.push(lane.name);
      laneEntries.push({
        lane: lane.name,
        category: lane.category,
        mandatory: lane.mandatory,
        ...(lane.label ? { label: lane.label } : {}),
        status: lane.mandatory ? "missing" : "not-run",
        ...(lane.description ? { description: lane.description } : {}),
      });
      continue;
    }
    const { receipt, file } = entry;
    if (sourceSha === null) sourceSha = receipt.sourceSha;
    if (receipt.sourceSha !== sourceSha) shaMismatch.push(lane.name);
    const logAbsolute = join(bundleDir, receipt.logFile);
    const logOk = existsSync(logAbsolute) && sha256Hex(readFileSync(logAbsolute)) === receipt.logSha256;
    if (!logOk) tampered.push(lane.name);
    if (lane.mandatory && receipt.exitCode !== 0) failed.push(lane.name);
    laneEntries.push({
      lane: lane.name,
      category: lane.category,
      mandatory: lane.mandatory,
      ...(lane.label ? { label: lane.label } : {}),
      status: receipt.exitCode === 0 ? "pass" : "fail",
      exitCode: receipt.exitCode,
      durationMs: receipt.durationMs,
      receiptFile: `receipts/${lane.name}.json`,
      receiptSha256: sha256Hex(readFileSync(file)),
      logSha256: receipt.logSha256,
      logBytes: receipt.logBytes,
    });
  }

  const complete =
    missing.length === 0 && failed.length === 0 && shaMismatch.length === 0 && tampered.length === 0;
  const manifest = {
    schema: "prometheus.release-certification/v1",
    generatedAt: new Date().toISOString(),
    sourceSha,
    tag,
    verdict: complete ? "complete" : "incomplete",
    failClosed: true,
    missing,
    failed,
    shaMismatch,
    tampered,
    limits: labeledLanes(registry).map((lane) => ({
      lane: lane.name,
      label: lane.label,
      description: lane.description,
    })),
    lanes: laneEntries,
  };
  writeFileSync(join(bundleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function parseArgs(argv) {
  const args = { lanes: null, all: false, seal: false, list: false, bundleDir: DEFAULT_BUNDLE_DIR, tag: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--all") args.all = true;
    else if (arg === "--seal") args.seal = true;
    else if (arg === "--list") args.list = true;
    else if (arg === "--lanes") {
      args.lanes = argv[i + 1].split(",").map((name) => name.trim());
      i += 1;
    } else if (arg === "--bundle") {
      args.bundleDir = argv[i + 1];
      i += 1;
    } else if (arg === "--tag") {
      args.tag = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();

  if (args.list) {
    for (const lane of laneRegistry) {
      const flag = lane.mandatory ? "mandatory" : `optional (${lane.label})`;
      process.stdout.write(`${lane.name} [${lane.category}] ${flag}${lane.command ? ` — ${lane.command.join(" ")}` : ""}\n`);
    }
    return;
  }

  if (args.seal) {
    const manifest = sealBundle(args.bundleDir, { tag: args.tag });
    process.stdout.write(
      `release-check seal: verdict=${manifest.verdict} lanes=${manifest.lanes.length} ` +
        `missing=${manifest.missing.length} failed=${manifest.failed.length} ` +
        `shaMismatch=${manifest.shaMismatch.length} tampered=${manifest.tampered.length}\n`,
    );
    if (manifest.verdict !== "complete") {
      process.stderr.write(
        `Certification incomplete (fail-closed). missing=[${manifest.missing.join(", ")}] ` +
          `failed=[${manifest.failed.join(", ")}] shaMismatch=[${manifest.shaMismatch.join(", ")}] ` +
          `tampered=[${manifest.tampered.join(", ")}]\n`,
      );
      process.exitCode = 1;
    }
    return;
  }

  const selected = args.all
    ? mandatoryLanes()
    : (args.lanes ?? []).map((name) => {
        const lane = laneRegistry.find((candidate) => candidate.name === name);
        if (lane === undefined) throw new Error(`Unknown lane: ${name} (see --list)`);
        if (!lane.command) throw new Error(`Lane ${name} has no command (${lane.label}); it is ${lane.label}-only.`);
        return lane;
      });
  if (selected.length === 0) {
    throw new Error("No lanes selected. Use --all, --lanes a,b,c, --seal, or --list.");
  }

  let failures = 0;
  for (const lane of selected) {
    process.stdout.write(`release-check: running lane ${lane.name}: ${lane.command.join(" ")}\n`);
    const receipt = await runLane(lane, { bundleDir: args.bundleDir, root });
    process.stdout.write(
      `release-check: lane ${lane.name} exit=${receipt.exitCode} durationMs=${receipt.durationMs}\n`,
    );
    if (receipt.exitCode !== 0) failures += 1;
  }
  if (failures > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
