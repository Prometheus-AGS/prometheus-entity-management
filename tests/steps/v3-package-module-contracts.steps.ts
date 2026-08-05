import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  AfterAll,
  Given,
  Then,
  When,
  setDefaultTimeout,
} from "@cucumber/cucumber";

import { PUBLIC_PACKAGES } from "../../scripts/public-packages.mjs";

type PackageResult = {
  name: string;
  directory: string;
  files: string[];
  manifest: "pass";
  payload: "pass";
  publint: "pass";
  areTheTypesWrong: "pass";
};

type VerificationReport = {
  schemaVersion: number;
  packageCount: number;
  packages: PackageResult[];
  consumers: {
    candidateSet: "tarballs-only";
    nodeEsm: "pass";
    nodeCommonJs: "pass";
    typescriptNodeNext: "pass";
    typescriptNode16: "pass";
    typescriptBundler: "pass";
  };
};

const root = process.cwd();
const reportDirectory = mkdtempSync(join(tmpdir(), "package-contract-bdd-"));
const reportPath = join(reportDirectory, "report.json");
let report: VerificationReport | undefined;

setDefaultTimeout(120_000);

function ensureReport(): VerificationReport {
  if (report) return report;
  execFileSync(
    "pnpm",
    ["run", "verify:package-contracts", "--", "--report", reportPath],
    {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    },
  );
  report = JSON.parse(readFileSync(reportPath, "utf8")) as VerificationReport;
  return report;
}

AfterAll(function () {
  rmSync(reportDirectory, { recursive: true, force: true });
});

Given("the v3 package-contract repository is available", function () {
  assert.equal(existsSync(join(root, "package.json")), true);
  assert.equal(existsSync(join(root, "scripts", "verify-package-contracts.mjs")), true);
  assert.equal(PUBLIC_PACKAGES.length, 12);
});

When("the twelve public npm candidates are packed and verified", function () {
  ensureReport();
});

Then("exactly {int} candidate tarballs are reported", function (count: number) {
  const result = ensureReport();
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.packageCount, count);
  assert.equal(result.packages.length, count);
  assert.deepEqual(result.packages.map(({ name }) => name), PUBLIC_PACKAGES.map(({ name }) => name));
});

Then("every candidate passes strict Publint and Are The Types Wrong", function () {
  for (const candidate of ensureReport().packages) {
    assert.equal(candidate.publint, "pass", candidate.name);
    assert.equal(candidate.areTheTypesWrong, "pass", candidate.name);
  }
});

Then("every candidate has loader-specific runtime and declaration files", function () {
  const required = ["dist/index.mjs", "dist/index.cjs", "dist/index.d.ts", "dist/index.d.cts"];
  for (const candidate of ensureReport().packages) {
    for (const path of required) assert.ok(candidate.files.includes(path), `${candidate.name}: ${path}`);
  }
});

Then("internal package dependencies are forced to the candidate tarballs", function () {
  assert.equal(ensureReport().consumers.candidateSet, "tarballs-only");
});

Then("the packed candidates pass Node ESM and CommonJS loading", function () {
  const consumers = ensureReport().consumers;
  assert.equal(consumers.nodeEsm, "pass");
  assert.equal(consumers.nodeCommonJs, "pass");
});

Then("the packed candidates pass TypeScript NodeNext, Node16, and Bundler resolution", function () {
  const consumers = ensureReport().consumers;
  assert.equal(consumers.typescriptNodeNext, "pass");
  assert.equal(consumers.typescriptNode16, "pass");
  assert.equal(consumers.typescriptBundler, "pass");
});

Then("every candidate includes its README and changelog", function () {
  for (const candidate of ensureReport().packages) {
    assert.ok(candidate.files.includes("README.md"), candidate.name);
    assert.ok(candidate.files.includes("CHANGELOG.md"), candidate.name);
  }
});

Then("no candidate includes workspace protocols, developer paths, or unintended source trees", function () {
  for (const candidate of ensureReport().packages) {
    assert.equal(candidate.manifest, "pass", candidate.name);
    assert.equal(candidate.payload, "pass", candidate.name);
    assert.equal(candidate.files.some((file) => file.startsWith("src/")), false, candidate.name);
  }
});

Then("the Tauri candidate excludes host-owned configuration and includes its required build script", function () {
  const tauri = ensureReport().packages.find(({ directory }) => directory === "packages/entity-graph-tauri");
  assert.ok(tauri);
  assert.equal(tauri.files.includes("rust-plugin/Cargo.lock"), false);
  assert.equal(tauri.files.includes("rust-plugin/tauri.conf.json"), false);
  assert.ok(tauri.files.includes("rust-plugin/Cargo.toml"));
  assert.ok(tauri.files.includes("rust-plugin/build.rs"));
  assert.ok(tauri.files.some((file) => file.startsWith("rust-plugin/src/")));
});

Then("the core and SDL package READMEs teach their public entry points", function () {
  const core = readFileSync(join(root, "packages/entity-graph-core/README.md"), "utf8");
  const sdl = readFileSync(join(root, "packages/entity-graph-sdl/README.md"), "utf8");
  assert.match(core, /registerEntityTransport/);
  assert.match(core, /lists\[queryKey\]\.ids/);
  assert.match(sdl, /parseSdl/);
  assert.match(sdl, /SdlValidationError/);
});

Then("all twelve package builds use the shared tsup package contract", function () {
  for (const publicPackage of PUBLIC_PACKAGES) {
    const config = readFileSync(join(root, publicPackage.directory, "tsup.config.ts"), "utf8");
    assert.match(config, /definePackageConfig/, publicPackage.name);
  }
});

Then("the shared build emits mjs for ESM and cjs for CommonJS", function () {
  const config = readFileSync(join(root, "scripts/tsup-package-config.ts"), "utf8");
  assert.match(config, /format === "esm" \? "\.mjs" : "\.cjs"/);
});

Then("the web-components CommonJS declarations preserve import-mode Lit types", function () {
  const build = readFileSync(join(root, "packages/entity-graph-web-components/package.json"), "utf8");
  const rewrite = readFileSync(join(root, "scripts/rewrite-lit-cjs-declarations.mjs"), "utf8");
  assert.match(build, /build-web-components-package\.mjs/);
  assert.match(rewrite, /"resolution-mode": "import"/);
  assert.match(rewrite, /generated Lit declaration header changed/);
});

Then("the coverage ledger maps the packed-package quality gate to its evidence", function () {
  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8")) as {
    qualityGates: Array<{
      id: string;
      status: string;
      change: string;
      command?: string;
      feature: string;
      evidence: string[];
    }>;
  };
  const gate = coverage.qualityGates.find(
    ({ id }) => id === "release.packages.packed-module-contracts",
  );
  assert.ok(gate);
  assert.equal(gate.status, "implemented");
  assert.equal(gate.change, "v3-package-module-contracts");
  assert.equal(gate.command, "pnpm run verify:package-contracts");
  assert.equal(gate.feature, "tests/features/release/v3-package-module-contracts.feature");
  for (const path of gate.evidence) assert.equal(existsSync(join(root, path)), true, path);
});

Then("release and skill documentation link the package contract", function () {
  for (const path of [
    "README.md",
    "RELEASING.md",
    "release/README.md",
    "examples/README.md",
    "prometheus-entity-skills/_shared/references/v3-release-contract.md",
    "prometheus-entity-skills/SKILL.md",
    "prometheus-entity-skills/SKILLS.md",
  ]) {
    assert.match(readFileSync(join(root, path), "utf8"), /package-contracts|packed-module-contracts/, path);
  }
});

Then("the package contract keeps stable publication and visual certification blocked", function () {
  const packageContract = readFileSync(join(root, "release/package-contracts.md"), "utf8");
  assert.match(packageContract, /does not mean 3\.0\.0 is ready to publish/);
  assert.match(packageContract, /five required showcase applications or their visual evidence/);

  const coverage = JSON.parse(readFileSync(join(root, "examples/coverage.json"), "utf8")) as {
    status: string;
    showcases: Array<{
      status: string;
      runtimeEvidence: { status: string };
      visualEvidence: { status: string };
    }>;
    documentationSite: { status: string };
  };
  assert.equal(coverage.status, "in-progress");
  assert.ok(
    coverage.showcases.every(
      ({ status, runtimeEvidence, visualEvidence }) =>
        ["planned", "partial", "implemented"].includes(status) &&
        runtimeEvidence.status === status &&
        visualEvidence.status === status,
    ),
  );
  assert.equal(coverage.documentationSite.status, "planned");
});
