import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FORBIDDEN_FILTERED_PATH,
  sha256Text,
  validatePortableProvenanceContract,
} from "./flutter-source-provenance-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const read = (path) => readFileSync(resolve(root, path), "utf8");
const json = (path) => JSON.parse(read(path));
const sha256 = (path) => sha256Text(read(path));
const git = (...args) => execFileSync("git", args, {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();

const authority = json("release/flutter-source-authority.json");
const provenance = json("release/flutter-source-provenance.json");
const releaseContract = json("release/v3-release-contract.json");
const coverage = json("examples/coverage.json");
const publicExportLedgers = [
  "prometheus-entity-skills/_shared/references/library-exports.json",
  "prometheus-entity-skills/_shared/references/sync-library-exports.json",
  "prometheus-entity-skills/_shared/references/a2ui-library-exports.json",
  "prometheus-entity-skills/_shared/references/a2a-library-exports.json",
];
const knowMe = provenance.knowMe;
const commitMap = read(knowMe.commitMap.path).trimEnd().split("\n");
const mappings = commitMap.slice(1).map((line) => {
  const [original, filtered] = line.trim().split(/\s+/);
  return { original, filtered };
});
const retainedMappings = mappings.filter(({ filtered }) => !/^0{40}$/.test(filtered));
const metadataRows = read(knowMe.commitMap.metadataPath).trimEnd().split("\n").slice(1).map((line) => {
  const [original, filtered, originalMetadata, filteredMetadata] = line.split("\t");
  return { original, filtered, originalMetadata, filteredMetadata };
});

assert.equal(provenance.schemaVersion, 1);
assert.equal(provenance.authorityRecord, "release/flutter-source-authority.json");
assert.equal(authority.decision, "approved-for-history-preserving-adaptation");
assert.equal(knowMe.sourceRevision, "68f7ab83b72c8bed37d1e7d19a5371a45b4f8f52");
assert.equal(authority.sources[0].revision, knowMe.sourceRevision);
assert.equal(authority.historyPolicy.freshDisposableCloneRequired, true);
assert.equal(authority.historyPolicy.dirtyTreeImportAllowed, false);
assert.match(knowMe.filterMethod, /fresh-disposable/);
assert.equal(knowMe.sourceWorkingTreeAtImport, "dirty-and-explicitly-not-read-for-import-content");

const filteredTree = git("rev-parse", `${knowMe.filteredTip}^{tree}`);
assert.equal(filteredTree, knowMe.filteredTree);
assert.equal(git("rev-list", "--count", knowMe.filteredTip), String(knowMe.commitMap.retainedCommits));
const filteredPaths = git("ls-tree", "-r", "--name-only", knowMe.filteredTip).split("\n").filter(Boolean).sort();
assert.deepEqual(filteredPaths, [...knowMe.approvedFiles].sort());
assert.deepEqual(filteredPaths.filter((path) => FORBIDDEN_FILTERED_PATH.test(path)), []);

assert.equal(git("rev-parse", knowMe.destinationMergeCommit), knowMe.destinationMergeCommit);
assert.equal(git("show", "--no-patch", "--format=%P", knowMe.destinationMergeCommit), knowMe.destinationMergeParents.join(" "));
execFileSync("git", ["merge-base", "--is-ancestor", knowMe.destinationMergeCommit, "HEAD"], { cwd: root });
const mergeDelta = git("diff-tree", "--no-commit-id", "--name-only", "-r", `${knowMe.destinationMergeCommit}^1`, knowMe.destinationMergeCommit)
  .split("\n").filter(Boolean).sort();
assert.deepEqual(mergeDelta, [...knowMe.approvedFiles].sort());

assert.equal(sha256(knowMe.commitMap.path), knowMe.commitMap.sha256);
assert.equal(sha256(knowMe.commitMap.metadataPath), knowMe.commitMap.metadataSha256);
assert.equal(mappings.length, knowMe.commitMap.sourceCommitsExamined);
assert.equal(retainedMappings.length, knowMe.commitMap.retainedCommits);
assert.equal(mappings.length - retainedMappings.length, knowMe.commitMap.prunedCommits);
assert.equal(mappings.find(({ original }) => original === knowMe.sourceRevision)?.filtered, knowMe.sourceRevisionMapping);
assert.equal(knowMe.commitMap.identicalCommitHashesClaimed, false);
assert.equal(metadataRows.length, retainedMappings.length);

const metadataFormat = "%an|%ae|%aI|%cn|%ce|%cI|%s";
for (const row of metadataRows) {
  const mapping = retainedMappings.find(({ original, filtered }) => original === row.original && filtered === row.filtered);
  assert.ok(mapping, `missing retained mapping for ${row.original}`);
  assert.equal(row.originalMetadata, row.filteredMetadata, `history metadata changed for ${row.original}`);
  assert.equal(git("show", "-s", `--format=${metadataFormat}`, row.filtered), row.filteredMetadata);
}
assert.deepEqual([...new Set(metadataRows.map(({ filteredMetadata }) => filteredMetadata.split("|")[0]))], ["Travis James"]);
for (const field of ["authors", "author dates", "committer identities", "committer dates", "messages", "allowed file evolution", "old-to-new commit mappings"]) {
  assert.ok(knowMe.historyRetained.includes(field), `missing history-retention claim: ${field}`);
}

const licensePaths = ["LICENSE", "packages/entity_graph_flutter/LICENSE", "provenance/imports/knowme-flutter/LICENSE"];
const licenses = licensePaths.map(read);
assert.ok(licenses.every((license) => license === licenses[0]));
assert.ok(licensePaths.every((path) => sha256(path) === provenance.destination.licenseSha256));
assert.match(licenses[0], /MIT License/);
assert.match(licenses[0], /Travis James \/ Prometheus AGS \/ KnowMe LLC/);
assert.equal(provenance.destination.license, "MIT");
assert.equal(provenance.licenseDecision.sourceTrackedLicenseFound, false);
assert.equal(provenance.publicationAuthorized, false);
assert.equal(authority.publicationAuthorized, false);

const dartArtifacts = releaseContract.artifacts.filter(({ ecosystem }) => ecosystem === "dart");
assert.deepEqual(dartArtifacts.map(({ packageName, path, registryDecision }) => ({ packageName, path, registryDecision })), [{
  packageName: "entity_graph_flutter",
  path: "packages/entity_graph_flutter",
  registryDecision: "deferred",
}]);
assert.equal(provenance.destination.canonicalDartGraphPackage.name, dartArtifacts[0].packageName);
assert.equal(provenance.destination.canonicalDartGraphPackage.path, dartArtifacts[0].path);
assert.match(read("pnpm-workspace.yaml"), /packages\/\*/);
assert.doesNotMatch(read("pnpm-workspace.yaml"), /provenance/);
const importReadme = read("provenance/imports/knowme-flutter/README.md");
assert.match(importReadme, /non-buildable provenance boundary/i);
assert.match(importReadme, /not a second public/i);
assert.match(importReadme, /only canonical Dart graph package/i);
assert.equal(provenance.destination.provenanceImportMode, "non-buildable-non-workspace-non-public");
assert.deepEqual([...new Set(knowMe.pathDecisions.map(({ decision }) => decision))].sort(), ["adapt", "reference", "reject"]);
assert.ok(knowMe.pathDecisions.filter(({ decision }) => decision === "adapt").every(({ canonicalOwner }) => canonicalOwner === "packages/entity_graph_flutter"));

const hybrid = provenance.hybridMobileArchitecture;
assert.equal(hybrid.revision, "e641c25d5c99ac04c3c872626099583c29ac568c");
assert.equal(hybrid.license, "MIT");
assert.equal(hybrid.decision, "reference-only-no-runtime-import");
assert.equal(hybrid.runtimeFilesImported, 0);
assert.equal(authority.sources[1].revision, hybrid.revision);
assert.match(hybrid.reason, /templates, scripts, and documentation/);

const coverageGate = coverage.qualityGates.find(({ id }) => id === "release.flutter.source-provenance");
assert.ok(coverageGate, "missing release.flutter.source-provenance quality gate");
assert.equal(coverageGate.status, "implemented");
assert.equal(coverageGate.change, "v3-flutter-source-provenance");
assert.equal(coverageGate.command, "pnpm run verify:flutter-source-provenance");
const flutterCapability = coverage.capabilities.find(({ id }) => id === "platform.flutter-riverpod");
assert.ok(flutterCapability, "missing platform.flutter-riverpod capability");
assert.ok(flutterCapability.releaseEvidence.some(({ ownerChange, status }) => ownerChange === "v3-flutter-source-provenance" && status === "implemented"));
assert.ok(flutterCapability.releaseEvidence.some(({ ownerChange, status, kind }) => ownerChange === "v3-dart-graph-riverpod" && status === "implemented" && kind === "platform"));
assert.ok(flutterCapability.releaseEvidence.some(({ ownerChange, status, kind }) => ownerChange === "v3-dart-graph-riverpod" && status === "implemented" && kind === "visual"));
assert.ok(flutterCapability.releaseEvidence.some(({ ownerChange, status }) => ownerChange === "v3-flutter-riverpod-a2ui-example" && status === "planned"));

for (const ledgerPath of publicExportLedgers) {
  assert.doesNotMatch(read(ledgerPath), /provenance|knowme/i, `${ledgerPath} must not expose provenance source`);
}
assert.doesNotMatch(read("pnpm-workspace.yaml"), /provenance|knowme/i);

const documentedSurfaces = [
  "README.md",
  "RELEASING.md",
  "release/README.md",
  "release/flutter-source-provenance.md",
  "examples/README.md",
  "packages/entity_graph_flutter/README.md",
  "prometheus-entity-skills/SKILL.md",
  "prometheus-entity-skills/_shared/references/v3-release-contract.md",
  "prometheus-entity-skills/_shared/references/architecture-rules.md",
  "prometheus-entity-skills/_shared/references/flutter-source-provenance.md",
];
const documentation = documentedSurfaces.map((path) => ({ path, body: read(path) }));
for (const requiredPath of [
  "release/flutter-source-provenance.md",
  "packages/entity_graph_flutter/README.md",
  "prometheus-entity-skills/_shared/references/flutter-source-provenance.md",
]) {
  const body = documentation.find(({ path }) => path === requiredPath).body;
  assert.match(body, /sole canonical Dart (graph )?package/i, `${requiredPath} must declare the canonical Dart owner`);
  assert.match(body, /non-buildable/i, `${requiredPath} must preserve the non-buildable boundary`);
}
const releaseGuide = read("release/flutter-source-provenance.md");
assert.match(releaseGuide, /changes no runtime entry point and adds no public export/i);
assert.match(releaseGuide, /does not certify/i);
for (const deniedClaim of [/Flutter screenshot/i, /pub\.dev ownership/i, /stable 3\.0\.0 promotion/i]) {
  assert.match(releaseGuide, deniedClaim);
}
const skillReference = read("prometheus-entity-skills/_shared/references/flutter-source-provenance.md");
assert.match(skillReference, /pnpm run verify:flutter-source-provenance/);
assert.match(skillReference, /no public runtime export impact/i);

const visual = provenance.visualEvidence;
assert.equal(sha256(visual.path), visual.sha256);
const svg = read(visual.path);
for (const phrase of ["KnowMe Flutter", "Explicit allowlist", "Filtered import", "entity_graph_flutter", "hybrid-mobile-architecture-src"]) {
  assert.match(svg, new RegExp(phrase));
}
assert.match(svg, /Headless lineage evidence only/);
assert.match(svg, /no claim of Flutter rendering or accessibility certification/);
assert.equal(visual.claimsFlutterRendering, false);
assert.equal(visual.claimsAccessibilityCertification, false);

const portableContract = validatePortableProvenanceContract({
  authority,
  provenance,
  releaseContract,
  observations: {
    dirtyWorktreeImported: false,
    filteredPaths,
    mergeDelta,
    commitMapText: read(knowMe.commitMap.path),
    metadataText: read(knowMe.commitMap.metadataPath),
    hashes: {
      commitMap: sha256(knowMe.commitMap.path),
      metadata: sha256(knowMe.commitMap.metadataPath),
      license: sha256(licensePaths[0]),
      visual: sha256(visual.path),
    },
    licenseBodiesEqual: licenses.every((license) => license === licenses[0]),
    workspaceIncludesProvenance: /provenance/.test(read("pnpm-workspace.yaml")),
  },
});
assert.equal(
  portableContract.valid,
  true,
  `portable provenance contract failed: ${portableContract.errors.map(({ code, message }) => `${code}: ${message}`).join("; ")}`,
);

const report = {
  schemaVersion: 1,
  verdict: "pass",
  source: {
    revision: knowMe.sourceRevision,
    dirtyWorktreeImported: false,
    filterMethod: knowMe.filterMethod,
  },
  history: {
    filteredTip: knowMe.filteredTip,
    filteredTree,
    mergeCommit: knowMe.destinationMergeCommit,
    examined: mappings.length,
    retained: retainedMappings.length,
    pruned: mappings.length - retainedMappings.length,
    metadataRows: metadataRows.length,
  },
  canonicalDartGraph: provenance.destination.canonicalDartGraphPackage,
  provenanceImportMode: provenance.destination.provenanceImportMode,
  licenses: licensePaths,
  publicationAuthorized: provenance.publicationAuthorized,
  portableContract: {
    verdict: portableContract.valid ? "pass" : "fail",
    errors: portableContract.errors,
  },
  hybridMobileArchitecture: {
    revision: hybrid.revision,
    decision: hybrid.decision,
    runtimeFilesImported: hybrid.runtimeFilesImported,
  },
  releaseLedgers: {
    qualityGate: coverageGate.id,
    qualityGateStatus: coverageGate.status,
    downstreamEvidence: flutterCapability.releaseEvidence
      .filter(({ ownerChange }) => ownerChange !== "v3-flutter-source-provenance")
      .map(({ ownerChange, status, kind }) => ({ ownerChange, status, kind })),
    publicRuntimeExportImpact: "none",
    publicExportLedgers,
    provenanceInPublicExportLedgers: false,
    provenanceInWorkspace: false,
    documentedSurfaces,
  },
  visualEvidence: visual,
};

if (reportPath) {
  const absoluteReport = resolve(root, reportPath);
  assert.ok(existsSync(dirname(absoluteReport)), `report directory must already exist: ${dirname(absoluteReport)}`);
  writeFileSync(absoluteReport, `${JSON.stringify(report, null, 2)}\n`);
}

process.stdout.write(`[flutter-source-provenance] PASS: ${retainedMappings.length} filtered commits, ${filteredPaths.length} allowlisted files, one canonical Dart graph, MIT boundaries, publication denied.\n`);
