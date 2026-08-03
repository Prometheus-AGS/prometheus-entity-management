import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

import { Given, Then } from "@cucumber/cucumber";
import semver from "semver";

import { evaluateAuditPolicy, runProductionAudit } from "../../scripts/audit-production.mjs";
import { gateDefinitions, runGate } from "../../scripts/run-ci-gate.mjs";

type Manifest = {
  packageManager?: string;
  engines?: Record<string, string>;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type DependencyHold = {
  package: string;
  selected: string;
  registryLatest: string;
  rationale: string;
  revisitChange: string;
};

const root = process.cwd();

function withoutCiGateTimeout<T>(callback: () => T): T {
  const previous = process.env.CI_GATE_TIMEOUT_MS;
  delete process.env.CI_GATE_TIMEOUT_MS;
  try {
    return callback();
  } finally {
    if (previous !== undefined) process.env.CI_GATE_TIMEOUT_MS = previous;
  }
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as T;
}

function collectFiles(directory: string, basename?: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", "dist", ".next", ".turbo", "target"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path, basename);
    return entry.isFile() && (!basename || entry.name === basename) ? [path] : [];
  });
}

function workspaceManifests(): Array<{ path: string; manifest: Manifest }> {
  return [join(root, "package.json"), ...collectFiles(join(root, "packages"), "package.json"), ...collectFiles(join(root, "examples"), "package.json")]
    .map((path) => ({ path, manifest: JSON.parse(readFileSync(path, "utf8")) as Manifest }));
}

function allDependencySpecs(manifest: Manifest): string[] {
  return [manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies]
    .flatMap((section) => Object.values(section ?? {}));
}

function auditReport(advisories: Record<string, unknown>, vulnerabilities: Record<string, number>) {
  return { advisories, metadata: { dependencies: 1, vulnerabilities } };
}

const emptyPolicy = {
  threshold: ["critical", "high"],
  acceptedAdvisories: [],
};

Given("the v3 CI baseline repository is available", function () {
  assert.equal(statSync(join(root, "package.json")).isFile(), true);
  assert.equal(statSync(join(root, "pnpm-workspace.yaml")).isFile(), true);
  assert.equal(statSync(join(root, "security", "advisory-policy.json")).isFile(), true);
});

Then("the root pnpm lockfile is the only workspace lockfile", function () {
  const locks = collectFiles(root, "pnpm-lock.yaml").map((path) => relative(root, path));
  assert.deepEqual(locks, ["pnpm-lock.yaml"]);
});

Then("no workspace dependency resolves through an external sibling link", function () {
  for (const { path, manifest } of workspaceManifests()) {
    for (const spec of allDependencySpecs(manifest)) {
      assert.doesNotMatch(spec, /^(?:link|file):/, `${relative(root, path)} contains ${spec}`);
    }
  }
  assert.doesNotMatch(readFileSync(join(root, "pnpm-lock.yaml"), "utf8"), /specifier:\s+(?:link|file):/);
});

Then("the Next.js and Vite examples resolve only repository-owned source and packages", function () {
  const sourceFiles = collectFiles(join(root, "examples")).filter((path) => /\.(?:css|json|ts|tsx)$/.test(path));
  for (const path of sourceFiles) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /\/Users\/|@prometheus-ags\/entity-sync-|entity-sync-pglite/, relative(root, path));
  }
});

Then("frozen installation is the CI installation contract", function () {
  const workflow = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8");
  assert.match(workflow, /pnpm install --frozen-lockfile/);
});

Then(
  "the selected React, Next.js, Vite, TypeScript, and pnpm versions satisfy the v3 release contract",
  function () {
    const contract = readJson<{ compatibility: Record<string, string> }>("release/v3-release-contract.json");
    const rootManifest = readJson<Manifest>("package.json");
    const vite = readJson<Manifest>("examples/vite-app/package.json");
    const next = readJson<Manifest>("examples/nextjs-app/package.json");
    const selected = {
      react: vite.dependencies?.react,
      vite: vite.devDependencies?.vite,
      nextjs: next.dependencies?.next,
      typescript: rootManifest.devDependencies?.typescript,
      pnpm: rootManifest.packageManager?.match(/^pnpm@([^+]+)/)?.[1],
    };
    for (const [name, version] of Object.entries(selected)) {
      assert.ok(version, `missing selected ${name} version`);
      assert.equal(semver.satisfies(version, contract.compatibility[name]), true, `${name}@${version}`);
    }
    assert.equal(rootManifest.engines?.node, contract.compatibility.node);
    assert.equal(rootManifest.engines?.pnpm, contract.compatibility.pnpm);
  },
);

Then("every direct dependency reported behind registry latest has an explicit compatibility rationale", function () {
  const policy = readJson<{ intentionalHolds: DependencyHold[] }>("release/dependency-policy.json");
  assert.deepEqual(policy.intentionalHolds.map(({ package: name }) => name).sort(), [
    "@types/node",
    "react-day-picker",
    "typescript",
  ]);
  for (const hold of policy.intentionalHolds) {
    assert.equal(semver.lt(hold.selected, hold.registryLatest), true, hold.package);
    assert.ok(hold.rationale.length >= 40, `${hold.package} rationale is not substantive`);
    assert.match(hold.revisitChange, /^v3-/);
  }
});

Then("vulnerable Next.js transitive pins resolve to the checked-in patched overrides", function () {
  const rootManifest = readJson<{ pnpm: { overrides: Record<string, string> } }>("package.json");
  assert.equal(rootManifest.pnpm.overrides.postcss, "8.5.25");
  assert.equal(rootManifest.pnpm.overrides.sharp, "0.35.0");
  const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
  assert.match(lock, /overrides:\n\s+postcss: 8\.5\.25\n\s+sharp: 0\.35\.0/);
  assert.doesNotMatch(lock, /^\s{2}postcss@8\.4\.31:/m);
  assert.doesNotMatch(lock, /^\s{2}sharp@0\.34\./m);
});

Then("CI runs validation, lint, typecheck, build, test, skills, and security gates", function () {
  assert.deepEqual(Object.keys(gateDefinitions), [
    "validate", "lint", "typecheck", "build", "test", "skills", "security",
  ]);
  const workflow = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8");
  for (const gate of Object.keys(gateDefinitions)) assert.match(workflow, new RegExp(`pnpm run ci:${gate}`));
});

Then("CI exercises Node {int}, {int}, and {int}", function (first: number, second: number, third: number) {
  const workflow = readFileSync(join(root, ".github", "workflows", "ci.yml"), "utf8");
  assert.match(workflow, new RegExp(`node: \\[${first}, ${second}, ${third}\\]`));
});

Then("every CI gate has a finite timeout", function () {
  for (const [name, definition] of Object.entries(gateDefinitions)) {
    assert.equal(Number.isSafeInteger(definition.timeoutMs), true, name);
    assert.ok(definition.timeoutMs > 0, name);
  }
  assert.ok(
    gateDefinitions.test.timeoutMs >= 45 * 60_000,
    "the aggregate test gate must outlive the cold multi-runtime BDD portfolio",
  );
});

Then("a timed out gate reports its gate name, command, and timeout", async function () {
  const definition = {
    command: [process.execPath, "-e", "setInterval(() => {}, 1000)"],
    timeoutMs: 25,
  };
  await assert.rejects(
    withoutCiGateTimeout(() => runGate("bdd-timeout", definition)),
    (error: Error) => {
      assert.match(error.message, /CI gate bdd-timeout timed out after 25ms/);
      assert.match(error.message, /command: .*setInterval/);
      return true;
    },
  );
});

Then("an unknown gate fails with the supported gate names", function () {
  assert.throws(
    () => runGate("not-a-gate"),
    /Unknown CI gate "not-a-gate"\. Expected one of: validate, lint, typecheck, build, test, skills, security/,
  );
});

Then("an undispositioned high production advisory fails policy evaluation", function () {
  const report = auditReport(
    {
      "9001": {
        id: 9001,
        severity: "high",
        module_name: "unsafe-package",
        title: "production-path issue",
        findings: [{ paths: ["app>unsafe-package"] }],
      },
    },
    { high: 1 },
  );
  const result = evaluateAuditPolicy(report, emptyPolicy, "2026-08-01");
  assert.equal(result.ok, false);
  assert.deepEqual(result.undispositioned.map(({ id }) => id), [9001]);
  assert.match(result.errors.join("\n"), /unsafe-package/);
});

Then("an expired or incomplete advisory acceptance fails policy evaluation", function () {
  const report = auditReport(
    { "9002": { id: 9002, severity: "critical", module_name: "critical-package", title: "issue" } },
    { critical: 1 },
  );
  const policy = {
    threshold: ["critical", "high"],
    acceptedAdvisories: [
      { id: 9002, owner: "", rationale: "Temporary compatibility exception", expiresOn: "2026-07-31" },
    ],
  };
  const result = evaluateAuditPolicy(report, policy, "2026-08-01");
  assert.equal(result.ok, false);
  assert.equal(result.invalidAcceptances.length, 1);
  assert.equal(result.expiredAcceptances.length, 1);
});

Then("a lower severity advisory remains visible without blocking the baseline", function () {
  const report = auditReport(
    { "9003": { id: 9003, severity: "low", module_name: "visible-package", title: "low issue" } },
    { low: 1 },
  );
  const result = evaluateAuditPolicy(report, emptyPolicy, "2026-08-01");
  assert.equal(result.ok, true);
  assert.equal(result.advisories.length, 1);
  assert.equal(result.summary.vulnerabilities.low, 1);
});

Then("the checked-in production dependency graph has no undispositioned critical or high advisory", function () {
  const result = runProductionAudit({ today: "2026-08-01" });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.undispositioned.length, 0);
});

Then("Next.js pins its Turbopack root to the monorepo", function () {
  const config = readFileSync(join(root, "examples", "nextjs-app", "next.config.ts"), "utf8");
  assert.match(config, /new URL\("\.\.\/\.\.", import\.meta\.url\)/);
  assert.match(config, /turbopack:\s*\{\s*root: workspaceRoot/s);
});

Then("the examples do not require the shadcn CLI at runtime", function () {
  for (const example of ["vite-app", "nextjs-app"]) {
    const manifest = readJson<Manifest>(`examples/${example}/package.json`);
    assert.equal(manifest.dependencies?.shadcn, undefined);
    const cssPath = example === "vite-app" ? "src/index.css" : "src/app/globals.css";
    assert.doesNotMatch(readFileSync(join(root, "examples", example, cssPath), "utf8"), /shadcn\/tailwind\.css/);
  }
});

Then("the Vite config is compatible with the native config loader", function () {
  const config = readFileSync(join(root, "examples", "vite-app", "vite.config.ts"), "utf8");
  assert.match(config, /import\.meta\.dirname/);
  assert.doesNotMatch(config, /\b__dirname\b/);
});

Then("both example manifests expose deterministic build and typecheck scripts", function () {
  for (const example of ["vite-app", "nextjs-app"]) {
    const manifest = readJson<Manifest>(`examples/${example}/package.json`);
    assert.ok(manifest.scripts?.build);
    assert.ok(manifest.scripts?.typecheck);
    assert.doesNotMatch(manifest.scripts.build, /--watch|\bdev\b/);
    assert.doesNotMatch(manifest.scripts.typecheck, /--watch|\bdev\b/);
  }
});
