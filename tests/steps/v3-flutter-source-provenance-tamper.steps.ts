import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then, When } from "@cucumber/cucumber";

import {
  sha256Text,
  validatePortableProvenanceContract,
} from "../../scripts/flutter-source-provenance-contract.mjs";

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), "utf8");
const json = (path: string) => JSON.parse(read(path));
const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function createFixture() {
  const authority = json("release/flutter-source-authority.json");
  const provenance = json("release/flutter-source-provenance.json");
  const releaseContract = json("release/v3-release-contract.json");
  const knowMe = provenance.knowMe;
  const licenses = [
    read("LICENSE"),
    read("packages/entity_graph_flutter/LICENSE"),
    read("provenance/imports/knowme-flutter/LICENSE"),
  ];
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

let fixture = createFixture();
let validation = validatePortableProvenanceContract(fixture);

function validate(): void {
  validation = validatePortableProvenanceContract(fixture);
}

function codes(): string[] {
  return validation.errors.map(({ code }: { code: string }) => code);
}

Given("a valid portable Flutter provenance contract fixture", function () {
  fixture = createFixture();
  validate();
  assert.deepEqual(validation, { valid: true, errors: [] });
});

When("a generated Dart file appears in the filtered history fixture", function () {
  fixture.observations.filteredPaths.push(
    "provenance/imports/knowme-flutter/prometheus_entity_management/lib/src/entity.g.dart",
  );
  validate();
});

When("one retained commit loses its captured original metadata", function () {
  fixture.observations.metadataText = `${fixture.observations.metadataText.trimEnd().split("\n").slice(0, -1).join("\n")}\n`;
  validate();
});

When("another Dart graph artifact is declared canonical", function () {
  const dart = fixture.releaseContract.artifacts.find(({ ecosystem }: { ecosystem: string }) => ecosystem === "dart");
  fixture.releaseContract.artifacts.push({
    ...dart,
    id: "dart-duplicate",
    packageName: "prometheus_entity_management",
    path: "provenance/imports/knowme-flutter/prometheus_entity_management",
  });
  validate();
});

When("the provenance fixture authorizes pub.dev publication", function () {
  fixture.provenance.publicationAuthorized = true;
  validate();
});

When("the recorded license hash differs from its observed hash", function () {
  fixture.provenance.destination.licenseSha256 = "0".repeat(64);
  validate();
});

When("the recorded visual hash differs from its observed hash", function () {
  fixture.provenance.visualEvidence.sha256 = "0".repeat(64);
  validate();
});

Then("portable provenance validation fails with {string}", function (code: string) {
  assert.equal(validation.valid, false);
  assert.ok(codes().includes(code), `expected ${code}; observed ${codes().join(", ")}`);
});

Then("it also reports the allowlist mismatch", function () {
  assert.ok(codes().includes("FILTERED_PATH_SET_MISMATCH"));
});

Then("the valid filtered commit count cannot conceal the missing metadata", function () {
  assert.ok(!codes().includes("RETAINED_COMMIT_COUNT_MISMATCH"));
  assert.ok(codes().includes("METADATA_MAPPING_MISMATCH"));
});

Then("entity_graph_flutter remains the expected canonical owner", function () {
  assert.equal(fixture.provenance.destination.canonicalDartGraphPackage.name, "entity_graph_flutter");
  assert.equal(fixture.provenance.destination.canonicalDartGraphPackage.path, "packages/entity_graph_flutter");
});

Then("deferred registry authority remains mandatory", function () {
  const canonical = fixture.releaseContract.artifacts.find(({ ecosystem }: { ecosystem: string }) => ecosystem === "dart");
  assert.equal(canonical.registryDecision, "deferred");
  assert.equal(fixture.provenance.registryAuthorityRequiredLater, true);
});
