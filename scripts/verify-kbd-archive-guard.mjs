#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const [phaseId, changeId, gatedTaskId] = process.argv.slice(2);
if (!phaseId || !changeId || !gatedTaskId) {
  throw new Error(
    "usage: verify-kbd-archive-guard.mjs <phase-id> <change-id> <gated-task-id>",
  );
}

const root = resolve(import.meta.dirname, "..");
const status = JSON.parse(
  execFileSync("prometheus", ["kbd", "status", "--json"], {
    cwd: root,
    encoding: "utf8",
  }),
);
const canonicalChange = status.phases?.[phaseId]?.changes?.[changeId];
if (!canonicalChange) throw new Error(`canonical change not found: ${phaseId}/${changeId}`);

const openCanonicalTasks = Object.values(canonicalChange.tasks ?? {}).filter(
  (task) => !["complete", "cancelled"].includes(task.status),
);
if (canonicalChange.status !== "complete" || openCanonicalTasks.length > 0) {
  throw new Error(
    `archive guard: canonical change is not complete; open tasks: ${openCanonicalTasks
      .map((task) => task.id)
      .join(", ") || "none"}`,
  );
}

const gatedTask = canonicalChange.tasks?.[gatedTaskId];
if (!gatedTask || gatedTask.status !== "complete") {
  throw new Error(`archive guard: gated task ${gatedTaskId} is not complete`);
}

const nativeTasksPath = resolve(
  root,
  ".kbd-orchestrator",
  "changes",
  changeId,
  "tasks.json",
);
const nativeTasks = JSON.parse(readFileSync(nativeTasksPath, "utf8"));
const openNativeTasks = nativeTasks.tasks.filter((task) => !task.done);
if (openNativeTasks.length > 0) {
  throw new Error(
    `archive guard: native task manifest remains open: ${openNativeTasks
      .map((task) => task.id)
      .join(", ")}`,
  );
}

const evidenceRoot = resolve(
  root,
  ".kbd-orchestrator",
  "phases",
  phaseId,
  "evidence",
  changeId,
);
const correction = JSON.parse(
  readFileSync(resolve(evidenceRoot, "control-plane-correction.json"), "utf8"),
);
const legacyProgress = JSON.parse(
  readFileSync(
    resolve(root, ".kbd-orchestrator", "phases", phaseId, "progress.json"),
    "utf8",
  ),
);
const legacyIsStale = (legacyProgress.sourceRevision ?? 0) < status.revision;
if (legacyIsStale) {
  const expectedDefectRecord =
    ".prometheus/postmortems/kbd-authoritative-phase-projection-lag.md";
  if (
    correction.legacyProjection?.status !==
      "known-stale-authoritative-runtime-compatibility-ledger" ||
    correction.legacyProjection.defectRecord !== expectedDefectRecord ||
    !existsSync(resolve(root, expectedDefectRecord))
  ) {
    throw new Error("archive guard: stale legacy projection lacks a machine defect record");
  }
}

const reviewRoot = resolve(evidenceRoot, "review");
const finalArtifactPaths = {
  packet: resolve(reviewRoot, "final-packet.json"),
  findings: resolve(reviewRoot, "final-findings.json"),
  sycophancy: resolve(reviewRoot, "final-sycophancy.json"),
};
const missingFinalArtifacts = Object.entries(finalArtifactPaths)
  .filter(([, artifactPath]) => !existsSync(artifactPath))
  .map(([name]) => name);
if (missingFinalArtifacts.length > 0) {
  throw new Error(
    `archive guard: final review/sycophancy artifacts are absent: ${missingFinalArtifacts.join(", ")}`,
  );
}
const finalPacketBytes = readFileSync(finalArtifactPaths.packet);
const finalFindingsBytes = readFileSync(finalArtifactPaths.findings);
let finalPacket;
let finalFindings;
try {
  finalPacket = JSON.parse(finalPacketBytes.toString("utf8"));
  finalFindings = JSON.parse(finalFindingsBytes.toString("utf8"));
} catch {
  throw new Error("archive guard: final review artifacts are malformed JSON");
}
if (
  finalPacket.mode !== "diff" ||
  finalPacket.phase !== phaseId ||
  finalPacket.target !== changeId ||
  finalFindings.mode !== "diff" ||
  !Array.isArray(finalFindings.findings)
) {
  throw new Error("archive guard: final review artifacts have an invalid shape");
}
const blockingFindings = finalFindings.findings.filter((finding) =>
  ["BLOCKER", "CRITICAL"].includes(finding.severity),
);
if (finalFindings.verdict !== "PASS" || blockingFindings.length > 0) {
  throw new Error("archive guard: final isolated adversarial review did not pass");
}
if (
  typeof finalFindings.judge_model !== "string" ||
  typeof finalFindings.producer_model !== "string" ||
  finalFindings.judge_model === finalFindings.producer_model ||
  finalFindings.cross_model_check !== "verified-distinct" ||
  typeof finalFindings.isolation_mode !== "string" ||
  !finalFindings.isolation_mode.startsWith("rest-gateway:")
) {
  throw new Error("archive guard: final review isolation provenance is invalid");
}

const sycophancy = JSON.parse(
  readFileSync(finalArtifactPaths.sycophancy, "utf8"),
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (
  sycophancy.target !== changeId ||
  sycophancy.phase !== phaseId ||
  sycophancy.result !== "PASS" ||
  sycophancy.strictness !== "strict" ||
  typeof sycophancy.score !== "number" ||
  sycophancy.score >= 0.4 ||
  sycophancy.packetSha256 !== sha256(finalPacketBytes) ||
  sycophancy.findingsSha256 !== sha256(finalFindingsBytes)
) {
  throw new Error("archive guard: final strict sycophancy screen did not pass");
}

process.stdout.write(
  `${JSON.stringify({
    status: "pass",
    runtimeRevision: status.revision,
    phaseId,
    changeId,
    gatedTaskId,
    canonicalTasksOpen: 0,
    legacyProjectionStale: legacyIsStale,
    legacyProjectionSourceRevision: legacyProgress.sourceRevision,
    authority: correction.authority,
    review: "pass",
    sycophancy: "pass",
  })}\n`,
);
