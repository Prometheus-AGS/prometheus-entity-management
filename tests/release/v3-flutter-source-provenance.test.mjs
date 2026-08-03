import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  sha256Text,
  validatePortableProvenanceContract,
  validateRepositoryHistoryBoundary,
} from "../../scripts/flutter-source-provenance-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const json = (path) => JSON.parse(read(path));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function fixture() {
  const authority = json("release/flutter-source-authority.json");
  const provenance = json("release/flutter-source-provenance.json");
  const releaseContract = json("release/v3-release-contract.json");
  const knowMe = provenance.knowMe;
  const licensePaths = [
    "LICENSE",
    "packages/entity_graph_flutter/LICENSE",
    "provenance/imports/knowme-flutter/LICENSE",
  ];
  const licenses = licensePaths.map(read);
  return {
    authority,
    provenance,
    releaseContract,
    observations: {
      dirtyWorktreeImported: false,
      filteredPaths: git("ls-tree", "-r", "--name-only", knowMe.filteredTip).split("\n").filter(Boolean),
      mergeDelta: git("diff-tree", "--no-commit-id", "--name-only", "-r", `${knowMe.destinationMergeCommit}^1`, knowMe.destinationMergeCommit)
        .split("\n").filter(Boolean),
      commitMapText: read(knowMe.commitMap.path),
      metadataText: read(knowMe.commitMap.metadataPath),
      hashes: {
        commitMap: sha256Text(read(knowMe.commitMap.path)),
        metadata: sha256Text(read(knowMe.commitMap.metadataPath)),
        license: sha256Text(licenses[0]),
        visual: sha256Text(read(provenance.visualEvidence.path)),
      },
      licenseBodiesEqual: licenses.every((license) => license === licenses[0]),
      workspaceIncludesProvenance: /provenance/.test(read("pnpm-workspace.yaml")),
    },
  };
}

function errorCodes(input) {
  return validatePortableProvenanceContract(input).errors.map(({ code }) => code);
}

test("the repository satisfies the portable Flutter provenance contract", () => {
  const result = validatePortableProvenanceContract(fixture());
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("generated source is rejected even when added beside approved paths", () => {
  const input = fixture();
  input.observations.filteredPaths.push(
    "provenance/imports/knowme-flutter/prometheus_entity_management/lib/src/entity.g.dart",
  );
  assert.deepEqual(errorCodes(input).filter((code) => code.includes("FILTERED_PATH")), [
    "FILTERED_PATH_SET_MISMATCH",
    "FORBIDDEN_FILTERED_PATH",
  ]);
});

test("a missing metadata row cannot be hidden by a valid retained commit count", () => {
  const input = fixture();
  input.observations.metadataText = `${input.observations.metadataText.trimEnd().split("\n").slice(0, -1).join("\n")}\n`;
  assert.ok(errorCodes(input).includes("METADATA_MAPPING_MISMATCH"));
  assert.ok(!errorCodes(input).includes("RETAINED_COMMIT_COUNT_MISMATCH"));
});

test("a duplicate canonical Dart graph artifact is rejected", () => {
  const input = fixture();
  input.releaseContract.artifacts.push({
    ...input.releaseContract.artifacts.find(({ ecosystem }) => ecosystem === "dart"),
    id: "dart-duplicate",
    packageName: "prometheus_entity_management",
    path: "provenance/imports/knowme-flutter/prometheus_entity_management",
  });
  assert.ok(errorCodes(input).includes("CANONICAL_DART_ARTIFACT_COUNT"));
});

test("provenance cannot grant pub.dev publication authority", () => {
  const input = fixture();
  input.provenance.publicationAuthorized = true;
  assert.ok(errorCodes(input).includes("PUBLICATION_AUTHORIZED"));
});

test("license, visual, history, and metadata hashes fail closed independently", async (context) => {
  for (const [name, mutate, expected] of [
    ["license", (input) => { input.observations.hashes.license = "0".repeat(64); }, "LICENSE_HASH_MISMATCH"],
    ["visual", (input) => { input.observations.hashes.visual = "0".repeat(64); }, "VISUAL_HASH_MISMATCH"],
    ["commit map", (input) => { input.observations.hashes.commitMap = "0".repeat(64); }, "HISTORY_HASH_MISMATCH"],
    ["metadata", (input) => { input.observations.hashes.metadata = "0".repeat(64); }, "HISTORY_HASH_MISMATCH"],
  ]) {
    await context.test(name, () => {
      const input = fixture();
      mutate(input);
      assert.ok(errorCodes(input).includes(expected));
    });
  }
});

test("hybrid-mobile templates cannot be relabeled as imported runtime source", () => {
  const input = fixture();
  input.provenance.hybridMobileArchitecture.runtimeFilesImported = 1;
  assert.ok(errorCodes(input).includes("HYBRID_RUNTIME_IMPORT"));
});

test("a squash merge is accepted only when every approved imported file is unchanged", () => {
  assert.deepEqual(
    validateRepositoryHistoryBoundary({
      ancestryPreserved: false,
      approvedFilesUnchanged: true,
    }),
    { valid: true, mode: "content-equivalent-squash", errors: [] },
  );
  assert.deepEqual(
    validateRepositoryHistoryBoundary({
      ancestryPreserved: true,
      approvedFilesUnchanged: false,
    }),
    { valid: true, mode: "ancestry", errors: [] },
  );
  const rejected = validateRepositoryHistoryBoundary({
    ancestryPreserved: false,
    approvedFilesUnchanged: false,
  });
  assert.equal(rejected.valid, false);
  assert.deepEqual(rejected.errors.map(({ code }) => code), [
    "DESTINATION_HISTORY_DISCONNECTED",
  ]);
});

test("the real Git-aware verifier produces a passing integration receipt", () => {
  const temporary = mkdtempSync(join(tmpdir(), "flutter-provenance-test-"));
  const reportPath = join(temporary, "report.json");
  try {
    const output = execFileSync(process.execPath, [
      "scripts/verify-flutter-source-provenance.mjs",
      "--report",
      reportPath,
    ], { cwd: root, encoding: "utf8" });
    assert.match(output, /PASS: 8 filtered commits, 12 allowlisted files/);
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    assert.equal(report.verdict, "pass");
    assert.deepEqual(report.portableContract, { verdict: "pass", errors: [] });
    assert.equal(report.history.mergeCommit, "eb3c9802da5ff10ad6db135fed761bd23ea80b3f");
    assert.ok(["ancestry", "content-equivalent-squash"].includes(report.history.integrationMode));
    assert.deepEqual(report.history.approvedFileDiff, []);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
