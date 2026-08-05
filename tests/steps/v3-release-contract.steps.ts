import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { Given, Then } from "@cucumber/cucumber";

type Artifact = {
  ecosystem: "npm" | "dart" | "rust";
  packageName: string;
  owner: string;
  registry: string;
  registryDecision: "required" | "deferred" | "embedded";
  versionPolicy: string;
  stability: "stable" | "experimental" | "internal";
};

type ReleaseContract = {
  release: { version: string; channel: string };
  versionPolicy: {
    npm: { strategy: string; prereleaseTag: string; stableTag: string; packages: string[] };
  };
  artifacts: Artifact[];
  compatibility: Record<string, string>;
  moduleContract: { packedConsumerEvidence: string[] };
  graphContract: {
    canonicalCorePackage: string;
    bindings: string[];
    singletonRequired: boolean;
    nextjsPerRequestGraph: boolean;
  };
  protocols: {
    a2ui: { version: string };
    agui: { role: string; distinctFromA2uiRendering: boolean };
    flutterGenui: { stability: string };
  };
  releaseGates: { stable: string[]; manualAuthority: string[] };
  recoveryPolicy: {
    partialPublish: string;
    immutableVersions: string;
    rollback: string;
    deprecation: string;
  };
};

type CoverageLedger = {
  release: string;
  contract: string;
  status: string;
  contractChecks: Array<{ id: string; status: string; feature: string; tags: string[] }>;
  qualityGates: Array<{
    id: string;
    status: string;
    change: string;
    feature: string;
    tags: string[];
    command?: string;
    policies: string[];
    evidence: string[];
  }>;
  showcases: Array<{ id: string; status: string; change: string; path: string }>;
  documentationSite: { status: string; change: string; path: string };
};

const root = process.cwd();
let contract: ReleaseContract;

function readCoverage(): CoverageLedger {
  return JSON.parse(readFileSync(join(root, "examples", "coverage.json"), "utf8")) as CoverageLedger;
}

function artifacts(ecosystem: Artifact["ecosystem"]): Artifact[] {
  return contract.artifacts.filter((artifact) => artifact.ecosystem === ecosystem);
}

function markdownFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

Given("the repository root is available", function () {
  assert.equal(existsSync(join(root, "package.json")), true);
  assert.equal(existsSync(join(root, "pnpm-workspace.yaml")), true);
});

Given("the {float} release contract is loaded", function (version: number) {
  const path = join(root, "release", "v3-release-contract.json");
  contract = JSON.parse(readFileSync(path, "utf8")) as ReleaseContract;
  assert.equal(contract.release.version, `${version.toFixed(1)}.0`);
  assert.equal(contract.release.channel, "stable");
});

Then("the contract declares exactly {int} npm packages", function (count: number) {
  const packageRoot = join(root, "packages");
  const workspacePackages = readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packageRoot, entry.name, "package.json"))
    .filter(existsSync)
    .map((path) => JSON.parse(readFileSync(path, "utf8")) as { name: string; private?: boolean })
    .filter((manifest) => manifest.private !== true)
    .map((manifest) => manifest.name)
    .sort();
  assert.equal(artifacts("npm").length, count);
  assert.equal(new Set(artifacts("npm").map(({ packageName }) => packageName)).size, count);
  assert.deepEqual(
    [...contract.versionPolicy.npm.packages].sort(),
    artifacts("npm").map(({ packageName }) => packageName).sort(),
  );
  assert.deepEqual(artifacts("npm").map(({ packageName }) => packageName).sort(), workspacePackages);
});

Then("the contract declares the Dart package {string}", function (packageName: string) {
  assert.deepEqual(artifacts("dart").map((artifact) => artifact.packageName), [packageName]);
  assert.match(readFileSync(join(root, "packages", "entity_graph_flutter", "pubspec.yaml"), "utf8"), new RegExp(`^name: ${packageName}$`, "m"));
});

Then(
  "the contract declares the Rust crates {string}, {string}, and {string}",
  function (first: string, second: string, third: string) {
    const manifests = [
      join(root, "packages", "entity-graph-cli", "Cargo.toml"),
      join(root, "packages", "entity-graph-mcp", "Cargo.toml"),
      join(root, "packages", "entity-graph-tauri", "rust-plugin", "Cargo.toml"),
    ];
    const workspaceCrates = manifests.map((path) => {
      const match = readFileSync(path, "utf8").match(/^name = "([^"]+)"$/m);
      assert.ok(match, `missing crate name in ${path}`);
      return match[1];
    });
    assert.deepEqual(
      artifacts("rust").map((artifact) => artifact.packageName).sort(),
      [first, second, third].sort(),
    );
    assert.deepEqual(artifacts("rust").map((artifact) => artifact.packageName).sort(), workspaceCrates.sort());
  },
);

Then("every declared artifact has an owner, registry, version policy, and stability status", function () {
  assert.equal(contract.artifacts.length, 16);
  for (const artifact of contract.artifacts) {
    assert.ok(artifact.owner.trim(), `${artifact.packageName} is missing an owner`);
    assert.ok(artifact.registry.trim(), `${artifact.packageName} is missing a registry decision`);
    assert.ok(artifact.versionPolicy.trim(), `${artifact.packageName} is missing a version policy`);
    assert.ok(artifact.stability.trim(), `${artifact.packageName} is missing a stability status`);
  }
});

Then("no release document claims {int} npm packages", function (incorrectCount: number) {
  const files = [
    join(root, "README.md"),
    ...markdownFiles(join(root, "release")),
    ...markdownFiles(join(root, "docs")),
    ...markdownFiles(join(root, "packages")),
  ];
  const claim = new RegExp(`\\b(?:${incorrectCount}|fourteen)\\s+npm\\s+packages?\\b`, "i");
  const offenders = files.filter((path) => claim.test(readFileSync(path, "utf8")));
  assert.deepEqual(offenders, []);
});

Then(
  "every artifact stability status is one of {string}, {string}, or {string}",
  function (first: string, second: string, third: string) {
    const allowed = [first, second, third];
    for (const artifact of contract.artifacts) {
      assert.ok(allowed.includes(artifact.stability), `${artifact.packageName}: ${artifact.stability}`);
    }
  },
);

Then("A2UI targets protocol version {string}", function (version: string) {
  assert.equal(contract.protocols.a2ui.version, version);
});

Then("Flutter genui is marked {string}", function (stability: string) {
  assert.equal(contract.protocols.flutterGenui.stability, stability);
});

Then("AG-UI transport is distinct from official A2UI rendering", function () {
  assert.equal(contract.protocols.agui.role, "event-transport");
  assert.equal(contract.protocols.agui.distinctFromA2uiRendering, true);
});

Then(
  "the contract defines supported Node, pnpm, React, Vite, Next.js, Flutter, Dart, Rust, and Tauri ranges",
  function () {
    for (const runtime of ["node", "pnpm", "react", "vite", "nextjs", "flutter", "dart", "rust", "tauri"]) {
      assert.ok(contract.compatibility[runtime]?.trim(), `missing ${runtime} compatibility range`);
    }
  },
);

Then("the contract requires ESM, CommonJS, and TypeScript packed-consumer evidence for npm packages", function () {
  const required = ["node-esm", "node-commonjs", "typescript-node16", "typescript-nodenext", "typescript-bundler"];
  assert.deepEqual(contract.moduleContract.packedConsumerEvidence, required);
});

Then("all framework bindings resolve one compatible entity graph core singleton", function () {
  assert.equal(contract.graphContract.canonicalCorePackage, "@prometheus-ags/entity-graph-core");
  assert.equal(contract.graphContract.singletonRequired, true);
  assert.deepEqual(contract.graphContract.bindings, [
    "react",
    "svelte",
    "solid",
    "web-components",
    "alpine",
    "htmx",
    "tauri",
    "flutter",
  ]);
});

Then("Next.js server requests use isolated graph instances", function () {
  assert.equal(contract.graphContract.nextjsPerRequestGraph, true);
});

Then("the contract defines release candidate and stable distribution tags", function () {
  assert.equal(contract.versionPolicy.npm.prereleaseTag, "next");
  assert.equal(contract.versionPolicy.npm.stableTag, "latest");
});

Then("stable publication requires certification of one immutable git SHA", function () {
  assert.ok(contract.releaseGates.stable.includes("immutable-sha-certified"));
});

Then("moving the npm {string} tag requires an explicit approval gate", function (tag: string) {
  assert.equal(contract.versionPolicy.npm.stableTag, tag);
  assert.ok(contract.releaseGates.manualAuthority.includes("npm-latest"));
  assert.ok(contract.releaseGates.stable.includes("explicit-latest-approval"));
});

Then(
  "partial publication has a recovery policy that never overwrites an immutable registry version",
  function () {
    assert.match(contract.recoveryPolicy.partialPublish, /new patch/i);
    assert.match(contract.recoveryPolicy.immutableVersions, /never overwrite/i);
  },
);

Then("rollback and deprecation policies are present", function () {
  assert.match(contract.recoveryPolicy.rollback, /last certified release/i);
  assert.match(contract.recoveryPolicy.deprecation, /next-major removal policy/i);
});

Then("the example coverage ledger references the {float} release contract", function (version: number) {
  const coverage = readCoverage();
  assert.equal(coverage.release, `${version.toFixed(1)}.0`);
  assert.equal(coverage.contract, "release/v3-release-contract.json");
  assert.equal(coverage.status, "in-progress");
  assert.deepEqual(coverage.contractChecks, [
    {
      id: "release.contract.inventory-and-gates",
      status: "implemented",
      feature: "tests/features/release/v3-release-contract.feature",
      tags: ["@release", "@v3-release-contract"],
      evidence: [
        ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-contract/bdd-red.md",
        ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-contract/task-3-tests.md",
        ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-contract/gate-results.json",
        ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-contract/verification.md",
      ],
    },
  ]);
  assert.deepEqual(
    coverage.qualityGates.map(({ id }) => id),
    [
      "release.ci.hermetic-main-baseline",
      "release.packages.packed-module-contracts",
      "release.core.framework-neutral",
      "release.bindings.one-core-singleton",
      "release.examples.shared-semantic-contract",
      "release.sync.persistence-convergence",
      "release.protocol.a2ui-official",
      "release.protocol.a2a-jsonrpc-v1",
      "release.flutter.source-provenance",
      "release.platform.dart-riverpod",
      "release.platform.tauri-plugin",
      "release.pipeline.recoverable-rc",
    ],
  );
  for (const gate of coverage.qualityGates) {
    assert.equal(gate.status, "implemented", gate.id);
    assert.equal(existsSync(join(root, gate.feature)), true, gate.feature);
    for (const path of [...(gate.policies ?? []), ...(gate.evidence ?? [])]) {
      assert.equal(existsSync(join(root, path)), true, `${gate.id}: ${path}`);
    }
  }
});

Then("the coverage ledger records all showcases as implemented", function () {
  const coverage = readCoverage();
  assert.deepEqual(
    coverage.showcases.map(({ id }) => id),
    ["react-19-vite-8", "nextjs", "agentic-a2ui", "flutter-riverpod", "tauri-desktop-mobile"],
  );
  assert.deepEqual(
    coverage.showcases.map(({ id, status }) => ({ id, status })),
    [
      { id: "react-19-vite-8", status: "implemented" },
      { id: "nextjs", status: "implemented" },
      { id: "agentic-a2ui", status: "implemented" },
      { id: "flutter-riverpod", status: "implemented" },
      { id: "tauri-desktop-mobile", status: "implemented" },
    ],
  );
  assert.equal(coverage.documentationSite.status, "planned");
  assert.deepEqual(coverage.showcases.map(({ change }) => change), [
    "v3-vite-react19-example",
    "v3-nextjs-app-router-example",
    "v3-agentic-a2ui-example",
    "v3-flutter-riverpod-a2ui-example",
    "v3-tauri-universal-example",
  ]);
  assert.equal(coverage.documentationSite.change, "v3-docs-github-pages");
});

Then("the skill release reference links to the authoritative contract", function () {
  const reference = readFileSync(
    join(root, "prometheus-entity-skills", "_shared", "references", "v3-release-contract.md"),
    "utf8",
  );
  const catalog = readFileSync(join(root, "prometheus-entity-skills", "SKILLS.md"), "utf8");
  const skill = readFileSync(join(root, "prometheus-entity-skills", "SKILL.md"), "utf8");
  assert.match(reference, /release\/v3-release-contract\.json/);
  assert.match(
    reference,
    /does not alter a ledger unless its publishable entry point changes/,
  );
  assert.match(reference, /release\/package-contracts\.md/);
  assert.match(reference, /workspace build, TypeScript source alias, or previously published alpha is not equivalent evidence/);
  assert.match(catalog, /v3-release-contract\.md/);
  assert.match(catalog, /release\/package-contracts\.md/);
  assert.match(catalog, /examples\/shared\/README\.md/);
  assert.match(catalog, /example-coverage-contract\.md/);
  assert.match(skill, /3\.0 Release Contract/);
  assert.match(skill, /packed-candidate procedure/);
  assert.match(skill, /pnpm run verify:example-coverage/);
});

Then("the project and examples documentation report the {float} release status honestly", function (version: number) {
  const projectReadme = readFileSync(join(root, "README.md"), "utf8");
  const examplesReadme = readFileSync(join(root, "examples", "README.md"), "utf8");
  assert.match(projectReadme, new RegExp(`${version.toFixed(1)} release is \\*\\*in progress\\*\\*`));
  assert.match(projectReadme, /not yet certified or promoted/);
  assert.match(projectReadme, /packed npm package gate/);
  assert.match(examplesReadme, /`implemented` identifies complete declared showcase evidence/);
  assert.match(examplesReadme, /`partial` records real evidence with named gates remaining/);
  assert.match(examplesReadme, /React 19 \+ Vite 8.*Implemented/);
  assert.match(examplesReadme, /release\.packages\.packed-module-contracts/);
  assert.match(projectReadme, /shared example contract/i);
  assert.match(examplesReadme, /release\.examples\.shared-semantic-contract/);
  assert.doesNotMatch(examplesReadme, /Status \|[\s\S]*\| Certified \(/);
});
