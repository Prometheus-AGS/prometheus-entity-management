import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const TCK_REPOSITORY = "https://github.com/a2aproject/a2a-tck.git";
const TCK_COMMIT = "5996b79f9cefa6fc390980e383e358a66fb9e49e";
const JSONRPC_SKIP_RATIONALES = Object.freeze({
  "CORE-CAP-002": "The card truthfully enables streaming, so the streaming-disabled negative scenario is inapplicable.",
  "CORE-CAP-004": "The card declares no required extensions, so the missing-required-extension negative scenario is inapplicable.",
  "CARD-EXT-002": "The card truthfully disables the extended AgentCard capability.",
  "CARD-EXT-001": "The card truthfully disables the extended AgentCard capability.",
  "PUSH-CREATE-001": "The card truthfully disables push notifications.",
  "PUSH-CREATE-002": "The card truthfully disables push notifications.",
  "PUSH-GET-001": "The card truthfully disables push notifications.",
  "PUSH-GET-002": "The card truthfully disables push notifications.",
  "PUSH-LIST-001": "The card truthfully disables push notifications.",
  "PUSH-DEL-001": "The card truthfully disables push notifications.",
  "PUSH-DEL-002": "The card truthfully disables push notifications.",
  "PUSH-DELIVER-001": "The card truthfully disables push notifications.",
  "PUSH-DELIVER-002": "The card truthfully disables push notifications.",
  "PUSH-DELIVER-003": "The card truthfully disables push notifications.",
});
const outputArgument = process.argv.find((argument) => argument.startsWith("--output-dir="));
const outputDirectory = resolve(
  root,
  outputArgument?.slice("--output-dir=".length) ??
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent/tck",
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, FORCE_COLOR: "0", ...(options.env ?? {}) },
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeout ?? 300_000,
  });
  if (result.error) throw result.error;
  return result;
}

async function waitForReady(child) {
  return new Promise((resolveReady, rejectReady) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      rejectReady(new Error(`Reference server did not become ready.\n${stdout}\n${stderr}`));
    }, 15_000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      const match = stdout.match(/A2A_TCK_READY (http:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolveReady({ endpoint: match[1], stdout: () => stdout, stderr: () => stderr });
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      rejectReady(new Error(`Reference server exited early with ${code}.\n${stdout}\n${stderr}`));
    });
  });
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function countByLevel(report, level, transport = "jsonrpc") {
  const entries = Object.values(report.per_requirement ?? {}).filter(
    (entry) => entry.level === level,
  );
  const counts = { total: entries.length, passed: 0, failed: 0, skipped: 0, notTested: 0 };
  for (const entry of entries) {
    const status = entry.transports?.[transport];
    if (status === "PASS") counts.passed += 1;
    else if (status === "FAIL") counts.failed += 1;
    else if (status === "SKIPPED") counts.skipped += 1;
    else counts.notTested += 1;
  }
  return counts;
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "prometheus-a2a-tck-"));
const tckDirectory = join(temporaryRoot, "a2a-tck");
let serverChild;

try {
  const build = run("pnpm", ["--filter", "@prometheus-ags/entity-graph-a2a", "build"]);
  if (build.status !== 0) throw new Error(`A2A build failed.\n${build.stdout}\n${build.stderr}`);

  const clone = run("git", ["clone", "--filter=blob:none", "--no-checkout", TCK_REPOSITORY, tckDirectory]);
  if (clone.status !== 0) throw new Error(`TCK clone failed.\n${clone.stdout}\n${clone.stderr}`);
  const checkout = run("git", ["checkout", "--detach", TCK_COMMIT], { cwd: tckDirectory });
  if (checkout.status !== 0) throw new Error(`TCK checkout failed.\n${checkout.stdout}\n${checkout.stderr}`);
  const candidateSha = run("git", ["rev-parse", "HEAD"], { cwd: root }).stdout.trim();
  const candidateWorktreeDirty = run(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { cwd: root },
  ).stdout.trim().length > 0;
  const candidateArtifacts = {};
  for (const relativePath of [
    "packages/entity-graph-a2a/dist/index.mjs",
    "packages/entity-graph-a2a/dist/index.cjs",
    "packages/entity-graph-a2a/dist/index.d.ts",
    "packages/entity-graph-a2a/dist/index.d.cts",
  ]) {
    const contents = await readFile(join(root, relativePath));
    candidateArtifacts[relativePath] = {
      bytes: contents.byteLength,
      sha256: sha256(contents),
    };
  }
  const resolvedTckCommit = run("git", ["rev-parse", "HEAD"], { cwd: tckDirectory }).stdout.trim();
  if (resolvedTckCommit !== TCK_COMMIT) throw new Error("TCK checkout did not resolve to the immutable pin.");

  serverChild = spawn(process.execPath, [join(root, "scripts/a2a-reference-server.mjs")], {
    cwd: root,
    env: { ...process.env, A2A_TCK_PORT: "0", A2A_TCK_STEP_DELAY_MS: "500" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const ready = await waitForReady(serverChild);

  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  const command = [
    "run",
    "--project",
    tckDirectory,
    "python",
    "run_tck.py",
    "--sut-host",
    ready.endpoint,
    "--transport",
    "jsonrpc",
    "-v",
  ];
  const tck = run("uv", command, { cwd: tckDirectory, timeout: 600_000 });
  await writeFile(join(outputDirectory, "tck-stdout.txt"), tck.stdout, "utf8");
  await writeFile(join(outputDirectory, "tck-stderr.txt"), tck.stderr, "utf8");

  const reportDirectory = join(tckDirectory, "reports");
  for (const file of [
    "compatibility.json",
    "compatibility.html",
    "tck_report.html",
    "junitreport.xml",
  ]) {
    const source = join(reportDirectory, file);
    if (!existsSync(source)) throw new Error(`Official TCK did not produce ${file}.`);
    await cp(source, join(outputDirectory, file));
  }

  const compatibilityContents = await readFile(
    join(outputDirectory, "compatibility.json"),
  );
  const compatibility = JSON.parse(compatibilityContents.toString("utf8"));
  const levels = {
    MUST: countByLevel(compatibility, "MUST"),
    SHOULD: countByLevel(compatibility, "SHOULD"),
    MAY: countByLevel(compatibility, "MAY"),
  };
  const agentCardLevels = {
    MUST: countByLevel(compatibility, "MUST", "agent_card"),
    SHOULD: countByLevel(compatibility, "SHOULD", "agent_card"),
    MAY: countByLevel(compatibility, "MAY", "agent_card"),
  };
  const failedApplicableMust = Object.entries(compatibility.per_requirement ?? {})
    .filter(([, entry]) =>
      entry.level === "MUST" &&
      (entry.transports?.jsonrpc === "FAIL" || entry.transports?.agent_card === "FAIL"),
    )
    .map(([id]) => id);
  const skippedJsonRpc = Object.entries(compatibility.per_requirement ?? {})
    .filter(([, entry]) => entry.transports?.jsonrpc === "SKIPPED")
    .map(([id, entry]) => ({
      id,
      level: entry.level,
      status: JSONRPC_SKIP_RATIONALES[id] ? "inapplicable" : "unexplained",
      rationale: JSONRPC_SKIP_RATIONALES[id] ?? "No declared exclusion explains this skip.",
    }));
  const unexplainedSkips = skippedJsonRpc.filter(({ status }) => status === "unexplained");
  const artifactFiles = [
    "compatibility.json",
    "compatibility.html",
    "tck_report.html",
    "junitreport.xml",
    "tck-stdout.txt",
    "tck-stderr.txt",
  ];
  const artifacts = {};
  for (const file of artifactFiles) {
    const contents = await readFile(join(outputDirectory, file));
    artifacts[file] = { bytes: contents.byteLength, sha256: sha256(contents) };
  }
  const receipt = {
    schemaVersion: "2",
    generatedAt: new Date().toISOString(),
    candidateSha,
    candidate: {
      revision: candidateSha,
      worktreeDirty: candidateWorktreeDirty,
      artifacts: candidateArtifacts,
    },
    protocolFamily: "1.0",
    sdk: "@a2a-js/sdk@1.0.1",
    binding: "JSONRPC",
    target: ready.endpoint,
    tck: { repository: TCK_REPOSITORY, commit: resolvedTckCommit },
    command: `uv ${command.join(" ")}`,
    processExitCode: tck.status,
    levels,
    transportLevels: {
      jsonrpc: levels,
      agentCard: agentCardLevels,
    },
    failedApplicableMust,
    skippedJsonRpc,
    unexplainedSkips,
    excludedBindings: ["GRPC", "HTTP+JSON"],
    excludedCapabilities: [
      "push notifications",
      "extended AgentCard",
      "signed AgentCard",
      "REST binding",
      "gRPC binding",
    ],
    artifacts,
    compatibilitySha256: sha256(compatibilityContents),
  };
  await writeFile(
    join(outputDirectory, "receipt.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  if (tck.status !== 0 || failedApplicableMust.length > 0 || unexplainedSkips.length > 0) {
    throw new Error(
      `Official TCK failed (exit ${tck.status}); applicable MUST failures: ${failedApplicableMust.join(", ") || "none"}; unexplained skips: ${unexplainedSkips.map(({ id }) => id).join(", ") || "none"}. See ${outputDirectory}.`,
    );
  }
  process.stdout.write(
    `PASS: official A2A TCK ${TCK_COMMIT} JSON-RPC report — MUST ${levels.MUST.passed} passed, ${levels.MUST.failed} failed; receipt ${basename(outputDirectory)}/receipt.json\n`,
  );
} finally {
  if (serverChild && serverChild.exitCode === null) {
    serverChild.kill("SIGTERM");
    await new Promise((resolveStop) => {
      const timeout = setTimeout(resolveStop, 5_000);
      serverChild.once("exit", () => {
        clearTimeout(timeout);
        resolveStop();
      });
    });
  }
  await rm(temporaryRoot, { recursive: true, force: true });
}
