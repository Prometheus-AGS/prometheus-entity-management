import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When } from "@cucumber/cucumber";

const root = process.cwd();
const evidenceRoot = join(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-flutter-source-provenance",
);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(join(root, path), "utf8")) as T;
interface Authority {
  decision: string;
  publicationAuthorized: boolean;
  historyPolicy: { freshDisposableCloneRequired: boolean };
}
interface Provenance {
  destination: { license: string };
  knowMe: {
    commitMap: { identicalCommitHashesClaimed: boolean };
    historyRetained: string[];
    exclusions: string[];
    pathDecisions: Array<{ decision: string }>;
    sourceRevision: string;
    filteredTip: string;
    destinationMergeCommit: string;
    attribution: { authorsObserved: string[] };
  };
  visualEvidence: { sha256: string };
  hybridMobileArchitecture: { license: string; reason: string };
  registryAuthorityRequiredLater: boolean;
}
interface VerificationReport {
  verdict: string;
  source: { revision: string; filterMethod: string; dirtyWorktreeImported: boolean };
  history: { filteredTip: string; retained: number; metadataRows: number };
  canonicalDartGraph: { name: string; path: string; releaseContractArtifactId: string };
  provenanceImportMode: string;
  licenses: string[];
  publicationAuthorized: boolean;
  visualEvidence: {
    kind: string;
    path: string;
    sha256: string;
    claimsFlutterRendering: boolean;
    claimsAccessibilityCertification: boolean;
  };
  hybridMobileArchitecture: { revision: string; decision: string; runtimeFilesImported: number };
  releaseLedgers: {
    qualityGate: string;
    qualityGateStatus: string;
    downstreamEvidence: Array<{ ownerChange: string; status: string; kind: string }>;
    publicRuntimeExportImpact: string;
    publicExportLedgers: string[];
    provenanceInPublicExportLedgers: boolean;
    provenanceInWorkspace: boolean;
    documentedSurfaces: string[];
  };
}
const authority = readJson<Authority>("release/flutter-source-authority.json");
const provenance = readJson<Provenance>("release/flutter-source-provenance.json");
let verifierOutput = "";
let report: VerificationReport | undefined;

function ensureVerifier(): void {
  if (verifierOutput) return;
  verifierOutput = execFileSync("pnpm", ["run", "verify:flutter-source-provenance"], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 60_000,
  });
  report = JSON.parse(readFileSync(join(evidenceRoot, "provenance-verification.json"), "utf8")) as VerificationReport;
}

function verificationReport(): VerificationReport {
  ensureVerifier();
  assert.ok(report);
  return report;
}

Given("Flutter source-import authority is recorded before copying", function () {
  assert.equal(authority.decision, "approved-for-history-preserving-adaptation");
  assert.equal(authority.publicationAuthorized, false);
  assert.equal(authority.historyPolicy.freshDisposableCloneRequired, true);
});

When("the Flutter source provenance verifier executes", function () {
  ensureVerifier();
  const currentReport = verificationReport();
  assert.match(verifierOutput, /\[flutter-source-provenance] PASS/);
  assert.equal(currentReport.verdict, "pass");
});

Then("the imported ref is rooted in a disposable filtered clone of the recorded KnowMe revision", function () {
  const currentReport = verificationReport();
  assert.equal(currentReport.source.revision, "68f7ab83b72c8bed37d1e7d19a5371a45b4f8f52");
  assert.match(currentReport.source.filterMethod, /fresh-disposable/);
  assert.match(currentReport.history.filteredTip, /^[a-f0-9]{40}$/);
});

Then("authors, dates, messages, path evolution, and the old-to-new commit map are retained", function () {
  const currentReport = verificationReport();
  assert.equal(currentReport.history.retained, 8);
  assert.equal(currentReport.history.metadataRows, 8);
  assert.equal(provenance.knowMe.commitMap.identicalCommitHashesClaimed, false);
  assert.deepEqual(provenance.knowMe.historyRetained, [
    "authors",
    "author dates",
    "committer identities",
    "committer dates",
    "messages",
    "allowed file evolution",
    "old-to-new commit mappings",
  ]);
});

Then("dirty files, applications, product models, secrets, generated output, locks, and direct FFI are excluded", function () {
  assert.equal(verificationReport().source.dirtyWorktreeImported, false);
  const exclusions = provenance.knowMe.exclusions.join("\n");
  for (const pattern of [/dirty/i, /applications/i, /product models/i, /secrets/i, /generated Dart/i, /lockfiles/i, /FFI/i]) {
    assert.match(exclusions, pattern);
  }
});

Then("approved generic paths map to explicit adapt, reference, or reject decisions", function () {
  assert.deepEqual([...new Set(provenance.knowMe.pathDecisions.map(({ decision }) => decision))].sort(), [
    "adapt",
    "reference",
    "reject",
  ]);
});

Then("entity_graph_flutter remains the only canonical Dart graph package", function () {
  assert.deepEqual(verificationReport().canonicalDartGraph, {
    name: "entity_graph_flutter",
    path: "packages/entity_graph_flutter",
    releaseContractArtifactId: "dart-flutter",
  });
});

Then("the filtered import is non-buildable provenance rather than a second public package", function () {
  assert.equal(verificationReport().provenanceImportMode, "non-buildable-non-workspace-non-public");
});

Then("the root, canonical Dart package, and imported source carry the declared MIT license", function () {
  assert.deepEqual(verificationReport().licenses, [
    "LICENSE",
    "packages/entity_graph_flutter/LICENSE",
    "provenance/imports/knowme-flutter/LICENSE",
  ]);
  assert.equal(provenance.destination.license, "MIT");
});

Then("the provenance manifest records source revisions, filtered commits, attribution, and publication limits", function () {
  assert.match(provenance.knowMe.sourceRevision, /^[a-f0-9]{40}$/);
  assert.match(provenance.knowMe.filteredTip, /^[a-f0-9]{40}$/);
  assert.match(provenance.knowMe.destinationMergeCommit, /^[a-f0-9]{40}$/);
  assert.deepEqual(provenance.knowMe.attribution.authorsObserved, ["Travis James"]);
});

Then("pub.dev publication remains unauthorized", function () {
  assert.equal(verificationReport().publicationAuthorized, false);
  assert.equal(provenance.registryAuthorityRequiredLater, true);
});

Then("a deterministic lineage diagram shows source, filter, provenance import, and canonical adaptation boundaries", function () {
  const visualEvidence = verificationReport().visualEvidence;
  assert.equal(visualEvidence.kind, "deterministic-headless-lineage-diagram");
  const svg = readFileSync(join(root, visualEvidence.path), "utf8");
  for (const phrase of ["KnowMe Flutter", "Explicit allowlist", "Filtered import", "entity_graph_flutter"]) {
    assert.match(svg, new RegExp(phrase));
  }
});

Then("the visual artifact hash is bound to the machine-readable provenance receipt", function () {
  assert.match(verificationReport().visualEvidence.sha256, /^[a-f0-9]{64}$/);
  assert.equal(verificationReport().visualEvidence.sha256, provenance.visualEvidence.sha256);
});

Then("the headless diagram does not claim Flutter rendering or accessibility certification", function () {
  assert.equal(verificationReport().visualEvidence.claimsFlutterRendering, false);
  assert.equal(verificationReport().visualEvidence.claimsAccessibilityCertification, false);
});

Then("hybrid-mobile-architecture-src is recorded as MIT reference-only", function () {
  assert.equal(verificationReport().hybridMobileArchitecture.revision, "e641c25d5c99ac04c3c872626099583c29ac568c");
  assert.equal(verificationReport().hybridMobileArchitecture.decision, "reference-only-no-runtime-import");
  assert.equal(provenance.hybridMobileArchitecture.license, "MIT");
});

Then("no runtime library is fabricated from its templates, scripts, or documentation", function () {
  assert.equal(verificationReport().hybridMobileArchitecture.runtimeFilesImported, 0);
  assert.match(provenance.hybridMobileArchitecture.reason, /templates, scripts, and documentation/);
});

Given("the Flutter source provenance verifier executes for release ledgers", function () {
  ensureVerifier();
  assert.equal(verificationReport().verdict, "pass");
});

Then("coverage records the Flutter source provenance gate as implemented", function () {
  assert.equal(verificationReport().releaseLedgers.qualityGate, "release.flutter.source-provenance");
  assert.equal(verificationReport().releaseLedgers.qualityGateStatus, "implemented");
});

Then("Dart library evidence is implemented while full Flutter app evidence remains planned", function () {
  assert.deepEqual(verificationReport().releaseLedgers.downstreamEvidence, [
    { ownerChange: "v3-dart-graph-riverpod", status: "implemented", kind: "platform" },
    { ownerChange: "v3-dart-graph-riverpod", status: "implemented", kind: "visual" },
    { ownerChange: "v3-flutter-riverpod-a2ui-example", status: "planned", kind: "visual" },
  ]);
});

Then("the provenance change declares no public runtime export impact", function () {
  assert.equal(verificationReport().releaseLedgers.publicRuntimeExportImpact, "none");
});

Then("the non-buildable import is absent from every public API ledger and workspace", function () {
  const ledgers = verificationReport().releaseLedgers;
  assert.equal(ledgers.publicExportLedgers.length, 4);
  assert.equal(ledgers.provenanceInPublicExportLedgers, false);
  assert.equal(ledgers.provenanceInWorkspace, false);
});

Then("release and package documentation identify entity_graph_flutter as the sole canonical Dart package", function () {
  const surfaces = verificationReport().releaseLedgers.documentedSurfaces;
  assert.ok(surfaces.includes("release/flutter-source-provenance.md"));
  assert.ok(surfaces.includes("packages/entity_graph_flutter/README.md"));
});

Then("shared skills require the provenance verifier before source-lineage claims", function () {
  assert.ok(verificationReport().releaseLedgers.documentedSurfaces.includes(
    "prometheus-entity-skills/_shared/references/flutter-source-provenance.md",
  ));
});

Then("documentation denies Flutter rendering, registry publication, and stable-release claims", function () {
  const guide = readFileSync(join(root, "release/flutter-source-provenance.md"), "utf8");
  assert.match(guide, /does not certify/i);
  assert.match(guide, /pub\.dev ownership/i);
  assert.match(guide, /stable 3\.0\.0 promotion/i);
});
