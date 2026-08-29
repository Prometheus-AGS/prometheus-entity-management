#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parse, validRange } from "semver";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const defaultContractPath = join(repositoryRoot, "release", "v3-release-contract.json");
const schemaPath = join(repositoryRoot, "release", "v3-release-contract.schema.json");
const coveragePath = join(repositoryRoot, "examples", "coverage.json");
const requiredShowcases = [
  "agentic-a2ui",
  "flutter-riverpod",
  "nextjs",
  "react-19-vite-8",
  "tauri-desktop-mobile",
];
const requiredShowcaseChanges = new Map([
  ["agentic-a2ui", "v3-agentic-a2ui-example"],
  ["flutter-riverpod", "v3-flutter-riverpod-a2ui-example"],
  ["nextjs", "v3-nextjs-app-router-example"],
  ["react-19-vite-8", "v3-vite-react19-example"],
  ["tauri-desktop-mobile", "v3-tauri-universal-example"],
]);

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return sorted(repeated);
}

function publicNpmWorkspacePackages() {
  return readdirSync(join(repositoryRoot, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(repositoryRoot, "packages", entry.name, "package.json"))
    .filter(existsSync)
    .map((manifestPath) => ({
      manifestPath,
      manifest: JSON.parse(readFileSync(manifestPath, "utf8")),
    }))
    .filter(({ manifest }) => manifest.private !== true);
}

function manifestIdentity(artifact) {
  const artifactPath = join(repositoryRoot, artifact.path);
  if (!existsSync(artifactPath)) return null;
  if (artifact.ecosystem === "npm") {
    const manifestPath = join(artifactPath, "package.json");
    if (!existsSync(manifestPath)) return null;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    return { name: manifest.name, version: manifest.version, manifestPath };
  }
  if (artifact.ecosystem === "dart") {
    const manifestPath = join(artifactPath, "pubspec.yaml");
    if (!existsSync(manifestPath)) return null;
    const source = readFileSync(manifestPath, "utf8");
    return {
      name: source.match(/^name:\s*(\S+)$/m)?.[1],
      version: source.match(/^version:\s*(\S+)$/m)?.[1],
      manifestPath,
    };
  }
  const manifestPath = join(artifactPath, "Cargo.toml");
  if (!existsSync(manifestPath)) return null;
  const source = readFileSync(manifestPath, "utf8");
  return {
    name: source.match(/^name\s*=\s*"([^"]+)"$/m)?.[1],
    version: source.match(/^version\s*=\s*"([^"]+)"$/m)?.[1],
    manifestPath,
  };
}

export function readReleaseContract(contractPath = defaultContractPath) {
  return JSON.parse(readFileSync(contractPath, "utf8"));
}

export function readReleaseCoverage(path = coveragePath) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function validateReleaseCoverage(contract, coverage = readReleaseCoverage()) {
  const errors = [];
  if (coverage.release !== contract.release?.version) {
    errors.push(`coverage release ${coverage.release ?? "missing"} does not match contract ${contract.release?.version ?? "missing"}`);
  }
  if (coverage.contract !== "release/v3-release-contract.json") {
    errors.push("coverage must reference release/v3-release-contract.json");
  }
  if (contract.sourceOfTruth?.coverage !== "examples/coverage.json") {
    errors.push("contract sourceOfTruth must reference examples/coverage.json");
  }
  const showcases = Array.isArray(coverage.showcases) ? coverage.showcases : [];
  if (JSON.stringify(sorted(showcases.map(({ id }) => id))) !== JSON.stringify(requiredShowcases)) {
    errors.push("coverage must declare the five required 3.0 showcases exactly once");
  }
  for (const showcase of showcases) {
    if (!new Set(["planned", "partial", "implemented"]).has(showcase.status)) {
      errors.push(`${showcase.id}: showcase status must be planned, partial, or implemented`);
    } else if (
      showcase.runtimeEvidence?.status !== showcase.status ||
      showcase.visualEvidence?.status !== showcase.status
    ) {
      errors.push(
        `${showcase.id}: ${showcase.status} showcase must keep runtime and visual evidence ${showcase.status}`,
      );
    }
    if (
      showcase.status === "implemented" &&
      (!showcase.runtimeEvidence?.command ||
        !showcase.visualEvidence?.command ||
        !showcase.runtimeEvidence?.paths?.length ||
        !showcase.visualEvidence?.paths?.length)
    ) {
      errors.push(`${showcase.id}: implemented showcase evidence requires commands and paths`);
    }
    if (showcase.change !== requiredShowcaseChanges.get(showcase.id)) {
      errors.push(`${showcase.id}: owning change must be ${requiredShowcaseChanges.get(showcase.id) ?? "declared"}`);
    }
  }
  if (
    coverage.documentationSite?.status !== "planned" ||
    coverage.documentationSite?.change !== "v3-docs-github-pages" ||
    coverage.documentationSite?.path !== "website"
  ) {
    errors.push("coverage must track the planned v3-docs-github-pages website deployment");
  }
  if (!coverage.contractChecks?.some(({ id, status }) => id === "release.contract.inventory-and-gates" && status === "implemented")) {
    errors.push("coverage is missing implemented release-contract checks");
  }
  const qualityGates = Array.isArray(coverage.qualityGates) ? coverage.qualityGates : [];
  for (const id of duplicates(qualityGates.map(({ id }) => id))) {
    errors.push(`coverage has duplicate quality gate ${id}`);
  }
  const ciBaseline = qualityGates.find(
    ({ id }) => id === "release.ci.hermetic-main-baseline",
  );
  if (
    ciBaseline?.status !== "implemented" ||
    ciBaseline?.change !== "v3-main-ci-baseline" ||
    ciBaseline?.feature !== "tests/features/ci/v3-main-ci-baseline.feature"
  ) {
    errors.push("coverage is missing the implemented v3-main-ci-baseline quality gate");
  } else {
    const requiredPolicies = ["release/dependency-policy.json", "security/advisory-policy.json"];
    if (JSON.stringify(sorted(ciBaseline.policies ?? [])) !== JSON.stringify(requiredPolicies)) {
      errors.push("v3-main-ci-baseline must reference dependency and advisory policies");
    }
    for (const path of [...(ciBaseline.policies ?? []), ...(ciBaseline.evidence ?? []), ciBaseline.feature]) {
      if (!existsSync(join(repositoryRoot, path))) errors.push(`v3-main-ci-baseline references missing path ${path}`);
    }
  }
  const packageContracts = qualityGates.find(
    ({ id }) => id === "release.packages.packed-module-contracts",
  );
  if (
    packageContracts?.status !== "implemented" ||
    packageContracts?.change !== "v3-package-module-contracts" ||
    packageContracts?.feature !== "tests/features/release/v3-package-module-contracts.feature" ||
    packageContracts?.command !== "pnpm run verify:package-contracts"
  ) {
    errors.push("coverage is missing the implemented v3-package-module-contracts quality gate");
  } else {
    if (
      JSON.stringify(packageContracts.tags ?? []) !==
      JSON.stringify(["@release", "@v3-package-module-contracts"])
    ) {
      errors.push("v3-package-module-contracts must reference its release BDD tags");
    }
    if (
      JSON.stringify(packageContracts.policies ?? []) !==
      JSON.stringify(["release/v3-release-contract.json"])
    ) {
      errors.push("v3-package-module-contracts must reference the authoritative release contract");
    }
    for (const path of [
      ...(packageContracts.policies ?? []),
      ...(packageContracts.evidence ?? []),
      packageContracts.feature,
    ]) {
      if (!existsSync(join(repositoryRoot, path))) {
        errors.push(`v3-package-module-contracts references missing path ${path}`);
      }
    }
  }
  const frameworkNeutralCore = qualityGates.find(
    ({ id }) => id === "release.core.framework-neutral",
  );
  if (
    frameworkNeutralCore?.status !== "implemented" ||
    frameworkNeutralCore?.change !== "v3-framework-neutral-core" ||
    frameworkNeutralCore?.feature !== "tests/features/release/v3-framework-neutral-core.feature" ||
    frameworkNeutralCore?.command !== "pnpm run verify:framework-neutral-core"
  ) {
    errors.push("coverage is missing the implemented v3-framework-neutral-core quality gate");
  } else {
    if (
      JSON.stringify(frameworkNeutralCore.tags ?? []) !==
      JSON.stringify(["@release", "@v3-framework-neutral-core"])
    ) {
      errors.push("v3-framework-neutral-core must reference its release BDD tags");
    }
    if (
      JSON.stringify(frameworkNeutralCore.policies ?? []) !==
      JSON.stringify(["release/v3-release-contract.json"])
    ) {
      errors.push("v3-framework-neutral-core must reference the authoritative release contract");
    }
    for (const path of [
      ...(frameworkNeutralCore.policies ?? []),
      ...(frameworkNeutralCore.evidence ?? []),
      frameworkNeutralCore.feature,
    ]) {
      if (!existsSync(join(repositoryRoot, path))) {
        errors.push(`v3-framework-neutral-core references missing path ${path}`);
      }
    }
  }
  const bindingSingleton = qualityGates.find(
    ({ id }) => id === "release.bindings.one-core-singleton",
  );
  if (
    bindingSingleton?.status !== "implemented" ||
    bindingSingleton?.change !== "v3-binding-singleton-contract" ||
    bindingSingleton?.feature !== "tests/features/release/v3-binding-singleton-contract.feature" ||
    bindingSingleton?.command !== "pnpm run verify:binding-singletons"
  ) {
    errors.push("coverage is missing the implemented v3-binding-singleton-contract quality gate");
  } else {
    if (
      JSON.stringify(bindingSingleton.tags ?? []) !==
      JSON.stringify(["@release", "@v3-binding-singleton-contract"])
    ) {
      errors.push("v3-binding-singleton-contract must reference its release BDD tags");
    }
    if (
      JSON.stringify(bindingSingleton.policies ?? []) !==
      JSON.stringify(["release/v3-release-contract.json", ".changeset/config.json"])
    ) {
      errors.push("v3-binding-singleton-contract must reference the release and fixed-package policies");
    }
    for (const path of [
      ...(bindingSingleton.policies ?? []),
      ...(bindingSingleton.evidence ?? []),
      bindingSingleton.feature,
    ]) {
      if (!existsSync(join(repositoryRoot, path))) {
        errors.push(`v3-binding-singleton-contract references missing path ${path}`);
      }
    }
  }
  const exampleCoverage = qualityGates.find(
    ({ id }) => id === "release.examples.shared-semantic-contract",
  );
  if (
    exampleCoverage?.status !== "implemented" ||
    exampleCoverage?.change !== "v3-example-coverage-contract" ||
    exampleCoverage?.feature !== "tests/features/release/v3-example-coverage-contract.feature" ||
    exampleCoverage?.command !== "pnpm run verify:example-coverage"
  ) {
    errors.push("coverage is missing the implemented v3-example-coverage-contract quality gate");
  } else {
    if (
      JSON.stringify(exampleCoverage.tags ?? []) !==
      JSON.stringify(["@release", "@v3-example-coverage-contract"])
    ) {
      errors.push("v3-example-coverage-contract must reference its release BDD tags");
    }
    if (
      JSON.stringify(exampleCoverage.policies ?? []) !==
      JSON.stringify([
        "release/v3-release-contract.json",
        "examples/coverage.schema.json",
        "examples/shared/scenario-contract.json",
        "examples/shared/scenario-contract.schema.json",
      ])
    ) {
      errors.push("v3-example-coverage-contract must reference its release and shared contract policies");
    }
    for (const path of [
      ...(exampleCoverage.policies ?? []),
      ...(exampleCoverage.evidence ?? []),
      exampleCoverage.feature,
    ]) {
      if (!existsSync(join(repositoryRoot, path))) {
        errors.push(`v3-example-coverage-contract references missing path ${path}`);
      }
    }
  }
  const a2uiBridge = qualityGates.find(
    ({ id }) => id === "release.protocol.a2ui-official",
  );
  if (
    a2uiBridge?.status !== "implemented" ||
    a2uiBridge?.change !== "v3-a2ui-protocol-bridge" ||
    a2uiBridge?.feature !== "tests/features/release/v3-a2ui-protocol-bridge.feature" ||
    a2uiBridge?.command !== "pnpm run verify:a2ui-bridge"
  ) {
    errors.push("coverage is missing the implemented v3-a2ui-protocol-bridge quality gate");
  } else {
    if (
      JSON.stringify(a2uiBridge.tags ?? []) !==
      JSON.stringify(["@release", "@v3-a2ui-protocol-bridge"])
    ) {
      errors.push("v3-a2ui-protocol-bridge must reference its release BDD tags");
    }
    if (
      JSON.stringify(a2uiBridge.policies ?? []) !==
      JSON.stringify(["release/v3-release-contract.json", "examples/coverage.json"])
    ) {
      errors.push("v3-a2ui-protocol-bridge must reference release and coverage policies");
    }
    for (const path of [
      ...(a2uiBridge.policies ?? []),
      ...(a2uiBridge.evidence ?? []),
      a2uiBridge.feature,
    ]) {
      if (!existsSync(join(repositoryRoot, path))) {
        errors.push(`v3-a2ui-protocol-bridge references missing path ${path}`);
      }
    }
  }
  return errors;
}

export function validateReleaseContract(contract) {
  const errors = [];
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
  const schemaValid = ajv.validate(schema, contract);
  if (!schemaValid) {
    for (const error of ajv.errors ?? []) {
      errors.push(`schema ${error.instancePath || "/"} ${error.message}`);
    }
  }

  const artifacts = Array.isArray(contract.artifacts) ? contract.artifacts : [];
  const npmArtifacts = artifacts.filter(({ ecosystem }) => ecosystem === "npm");
  const requiredRegistries = contract.registryScope?.requiredForStable ?? [];
  if (artifacts.length !== 16) errors.push(`contract must declare exactly 16 artifacts; found ${artifacts.length}`);
  if (npmArtifacts.length !== 12) errors.push(`contract must declare exactly 12 npm packages; found ${npmArtifacts.length}`);

  for (const id of duplicates(artifacts.map(({ id }) => id))) errors.push(`duplicate artifact id ${id}`);
  for (const coordinate of duplicates(artifacts.map(({ ecosystem, packageName }) => `${ecosystem}:${packageName}`))) {
    const [ecosystem, packageName] = coordinate.split(":");
    errors.push(`duplicate ${ecosystem} coordinate ${packageName}`);
  }

  for (const artifact of artifacts) {
    const identity = manifestIdentity(artifact);
    if (!identity) {
      errors.push(`${artifact.id ?? "unknown artifact"}: artifact path does not exist or has no manifest (${artifact.path ?? "missing"})`);
      continue;
    }
    if (identity.name !== artifact.packageName) {
      errors.push(`${artifact.id}: contract package ${artifact.packageName} differs from manifest ${identity.name}`);
    }
    const version = parse(identity.version ?? "");
    if (!version || version.major !== 3) {
      errors.push(`${artifact.id}: manifest version ${identity.version ?? "missing"} is not aligned to major 3`);
    }
  }

  const workspaceNpmPackages = publicNpmWorkspacePackages();
  const workspaceNpm = sorted(workspaceNpmPackages.map(({ manifest }) => manifest.name));
  const contractNpm = sorted(npmArtifacts.map(({ packageName }) => packageName));
  const fixedNpm = sorted(contract.versionPolicy?.npm?.packages ?? []);
  if (JSON.stringify(contractNpm) !== JSON.stringify(workspaceNpm)) {
    errors.push("contract npm artifacts do not match the real public workspace packages");
  }
  if (JSON.stringify(fixedNpm) !== JSON.stringify(workspaceNpm)) {
    errors.push("fixed npm package group does not match the real public workspace packages");
  }
  if (contract.versionPolicy?.npm?.strategy !== "fixed") errors.push("npm version policy must be fixed");

  const esmExtension = contract.moduleContract?.esmExtension;
  if (typeof esmExtension === "string") {
    for (const { manifest } of workspaceNpmPackages) {
      if (typeof manifest.module !== "string" || !manifest.module.endsWith(esmExtension)) {
        errors.push(
          `${manifest.name}: module ${manifest.module ?? "missing"} does not match release ESM extension ${esmExtension}`,
        );
      }
    }
  }

  for (const [runtime, range] of Object.entries(contract.compatibility ?? {})) {
    if (!validRange(range)) errors.push(`invalid ${runtime} compatibility range: ${range}`);
  }

  if (!requiredRegistries.includes("npm")) errors.push("npm must be a required stable registry");
  if (!contract.releaseGates?.manualAuthority?.includes("npm-latest")) {
    errors.push("stable promotion is missing npm-latest manual authority");
  }
  if (contract.protocols?.a2ui?.version !== "1.0-rc") {
    errors.push("A2UI protocol version must be 1.0-rc");
  }
  if (contract.protocols?.a2ui?.stability !== "release-candidate-compatibility") {
    errors.push("A2UI stability must be release-candidate-compatibility");
  }
  if (contract.protocols?.a2ui?.renderer !== "official-v0.9-engine-adapter") {
    errors.push("A2UI renderer must be official-v0.9-engine-adapter");
  }
  if (contract.protocols?.agui?.version !== "0.0.59") {
    errors.push("AG-UI transport version must be 0.0.59");
  }
  if (contract.protocols?.flutterGenui?.version !== "0.10.2") {
    errors.push("Flutter genui version must be 0.10.2");
  }
  if (
    contract.protocols?.flutterGenui?.protocol !==
    "A2UI 1.0-RC compatibility over v0.9 renderer"
  ) {
    errors.push("Flutter genui protocol must be A2UI 1.0-RC compatibility over v0.9 renderer");
  }
  if (contract.protocols?.flutterGenui?.stability !== "experimental") {
    errors.push("Flutter genui must remain experimental");
  }
  const coverage = readReleaseCoverage();
  errors.push(...validateReleaseCoverage(contract, coverage));

  return {
    errors: [...new Set(errors)],
    summary: {
      release: contract.release?.version ?? null,
      artifacts: artifacts.length,
      npmPackages: npmArtifacts.length,
      dartPackages: artifacts.filter(({ ecosystem }) => ecosystem === "dart").length,
      rustCrates: artifacts.filter(({ ecosystem }) => ecosystem === "rust").length,
      requiredRegistries: requiredRegistries.length,
      plannedShowcases: coverage.showcases.filter(({ status }) => status === "planned").length,
      partialShowcases: coverage.showcases.filter(({ status }) => status === "partial").length,
      implementedShowcases: coverage.showcases.filter(({ status }) => status === "implemented").length,
    },
  };
}

function run() {
  const contract = readReleaseContract();
  const result = validateReleaseContract(contract);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.errors.length > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run();
