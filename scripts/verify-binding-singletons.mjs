import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { satisfies, validRange } from "semver";

import { createPackedConsumerManifest } from "./package-contract-validation.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corePackageName = "@prometheus-ags/entity-graph-core";
const shortTemporaryRoot = process.platform === "win32" ? tmpdir() : "/tmp";

const bindings = [
  {
    id: "react",
    packageName: "@prometheus-ags/prometheus-entity-management",
    directory: "entity-graph-react",
  },
  {
    id: "svelte",
    packageName: "@prometheus-ags/entity-graph-svelte",
    directory: "entity-graph-svelte",
  },
  {
    id: "solid",
    packageName: "@prometheus-ags/entity-graph-solid",
    directory: "entity-graph-solid",
  },
  {
    id: "web-components",
    packageName: "@prometheus-ags/entity-graph-web-components",
    directory: "entity-graph-web-components",
  },
  {
    id: "alpine",
    packageName: "@prometheus-ags/entity-graph-alpine",
    directory: "entity-graph-alpine",
  },
  {
    id: "htmx",
    packageName: "@prometheus-ags/entity-graph-htmx",
    directory: "entity-graph-htmx",
  },
];

const packedPackageDirectories = [
  "entity-graph-core",
  "entity-graph-sdl",
  ...bindings.map(({ directory }) => directory),
];

export function validateBindingSingletonPolicy({
  sourceManifests,
  packedManifests,
  fixedGroups,
  releasePackages,
  coreVersion,
}) {
  const expectedFixed = [...releasePackages].sort();
  const matchingFixedGroups = fixedGroups
    .map((group) => [...group].sort())
    .filter((group) => arraysEqual(group, expectedFixed));

  if (matchingFixedGroups.length !== 1) {
    throw new Error(
      `Changesets must contain exactly one fixed group matching the ${releasePackages.length}-package npm release contract`,
    );
  }

  for (const binding of bindings) {
    const source = sourceManifests[binding.packageName];
    const packed = packedManifests[binding.packageName];
    if (!source) throw new Error(`${binding.packageName}: source manifest missing`);
    if (!packed) throw new Error(`${binding.packageName}: packed manifest missing`);

    if (source.dependencies?.[corePackageName]) {
      throw new Error(
        `${binding.packageName}: core must not be a production dependency; use a required peer plus development dependency`,
      );
    }
    if (source.peerDependencies?.[corePackageName] !== "workspace:^") {
      throw new Error(
        `${binding.packageName}: source core peer must be workspace:^ so packed prerelease and stable manifests express a compatible 3.x range`,
      );
    }
    if (source.devDependencies?.[corePackageName] !== "workspace:*") {
      throw new Error(
        `${binding.packageName}: source core development dependency must be workspace:*`,
      );
    }
    if (source.peerDependenciesMeta?.[corePackageName]?.optional === true) {
      throw new Error(`${binding.packageName}: core peer must be required, not optional`);
    }

    if (packed.dependencies?.[corePackageName]) {
      throw new Error(`${binding.packageName}: packed manifest installs a private core copy`);
    }
    const packedRange = packed.peerDependencies?.[corePackageName];
    if (!packedRange || packedRange.startsWith("workspace:") || !validRange(packedRange)) {
      throw new Error(`${binding.packageName}: packed core peer is not a publishable semver range`);
    }
    if (!satisfies(coreVersion, packedRange, { includePrerelease: true })) {
      throw new Error(
        `${binding.packageName}: packed core peer ${packedRange} does not accept candidate core ${coreVersion}`,
      );
    }
    const packedDevCore = packed.devDependencies?.[corePackageName];
    if (packedDevCore?.startsWith("workspace:")) {
      throw new Error(`${binding.packageName}: packed development metadata leaks workspace protocol`);
    }

    for (const section of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      for (const [name, range] of Object.entries(packed[section] ?? {})) {
        if (typeof range === "string" && range.startsWith("workspace:")) {
          throw new Error(`${binding.packageName}: packed ${section}.${name} leaks ${range}`);
        }
      }
    }
  }
}

export async function verifyBindingSingletons({ reportPath } = {}) {
  const releaseContract = JSON.parse(
    await readFile(join(workspaceRoot, "release", "v3-release-contract.json"), "utf8"),
  );
  const changesets = JSON.parse(
    await readFile(join(workspaceRoot, ".changeset", "config.json"), "utf8"),
  );
  const tempRoot = await mkdtemp(join(shortTemporaryRoot, "prometheus-bs-"));
  const tarballDirectory = join(tempRoot, "tarballs");
  const consumerDirectory = join(tempRoot, "consumer");
  const incompatibleDirectory = join(tempRoot, "incompatible-consumer");

  try {
    await mkdir(tarballDirectory, { recursive: true });
    const packageArtifacts = await packCandidates(tarballDirectory);
    const sourceManifests = {};
    const packedManifests = {};
    for (const binding of bindings) {
      sourceManifests[binding.packageName] = JSON.parse(
        await readFile(
          join(workspaceRoot, "packages", binding.directory, "package.json"),
          "utf8",
        ),
      );
      packedManifests[binding.packageName] = packageArtifacts.get(binding.packageName).manifest;
    }

    const coreArtifact = packageArtifacts.get(corePackageName);
    const releasePackages = releaseContract.versionPolicy.npm.packages;
    validateBindingSingletonPolicy({
      sourceManifests,
      packedManifests,
      fixedGroups: changesets.fixed,
      releasePackages,
      coreVersion: coreArtifact.manifest.version,
    });

    await writePositiveConsumer(consumerDirectory, packageArtifacts);
    await run(
      "pnpm",
      [
        "install",
        "--ignore-scripts",
        "--strict-peer-dependencies",
        "--prefer-offline",
      ],
      { cwd: consumerDirectory },
    );
    const runtime = await run("node", ["consumer.mjs"], { cwd: consumerDirectory });
    const runtimeResult = JSON.parse(runtime.stdout.trim().split("\n").at(-1));
    const installedCorePaths = await collectInstalledCorePaths(
      consumerDirectory,
      bindings.map(({ packageName }) => packageName),
    );
    if (new Set(Object.values(installedCorePaths)).size !== 1) {
      throw new Error(
        `bindings resolve split core installations: ${JSON.stringify(installedCorePaths, null, 2)}`,
      );
    }

    const peerFailure = await verifyIncompatiblePeerFailure(
      incompatibleDirectory,
      packageArtifacts,
    );
    const coreInstanceAliases = aliasCoreInstances(installedCorePaths);

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      candidate: {
        coreVersion: coreArtifact.manifest.version,
        installSource: "packed-tarball-only",
        packageManager: "pnpm",
        fixedReleasePackages: releasePackages.length,
      },
      manifestPolicy: Object.fromEntries(
        bindings.map(({ id, packageName }) => [
          id,
          {
            packageName,
            productionCoreDependency: "absent",
            requiredCorePeer: packedManifests[packageName].peerDependencies[corePackageName],
            workspaceDevelopmentCore: "present in source; ignored by consumer install",
          },
        ]),
      ),
      resolution: {
        compatibleCoreInstallations: new Set(Object.values(installedCorePaths)).size,
        bindingCoreInstances: coreInstanceAliases,
        peerRangeFailure: peerFailure,
      },
      behavior: runtimeResult,
      behaviorProofs: {
        react: "React StoreApi selector subscription observed a core write",
        svelte: "Svelte entity store observed a core write",
        solid: "Solid createGraphStore accessor observed a core write",
        webComponents: "Lit reactive controller observed a core write and requested a host update",
        alpine: "Alpine reactive entity binding observed a core write",
        htmx: "HTMX server graph emitted a binding change event and shared two-way writes with core",
      },
      limitations: {
        visualEvidence: "not applicable: this verifier certifies headless package topology and reactive store behavior",
        browserOrDeviceRuntime: "not claimed by this change",
        publication: "no registry or dist-tag mutation performed",
      },
    };

    if (reportPath) {
      const absoluteReportPath = resolve(workspaceRoot, reportPath);
      await mkdir(dirname(absoluteReportPath), { recursive: true });
      await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
    }

    process.stdout.write(
      `[binding-singletons] PASS: ${bindings.length} packed bindings resolve one compatible core and observe one reactive graph; incompatible peers fail with actionable pnpm diagnostics.\n`,
    );
    return report;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function packCandidates(tarballDirectory) {
  const artifacts = new Map();
  for (const directory of packedPackageDirectories) {
    const packageDirectory = join(workspaceRoot, "packages", directory);
    const packed = await run("pnpm", [
      "--dir",
      packageDirectory,
      "pack",
      "--pack-destination",
      tarballDirectory,
      "--json",
    ]);
    const parsed = JSON.parse(packed.stdout);
    const result = Array.isArray(parsed) ? parsed[0] : parsed;
    const tarballPath = isAbsolute(result.filename)
      ? result.filename
      : resolve(workspaceRoot, result.filename);
    const manifest = JSON.parse(await extract(tarballPath, "package/package.json"));
    artifacts.set(manifest.name, { manifest, tarballPath });
  }
  return artifacts;
}

async function writePositiveConsumer(directory, artifacts) {
  await mkdir(directory, { recursive: true });
  const tarballsByName = Object.fromEntries(
    [...artifacts.entries()].map(([packageName, artifact]) => [
      packageName,
      `file:${artifact.tarballPath}`,
    ]),
  );
  const manifest = createPackedConsumerManifest(tarballsByName);
  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify({
      ...manifest,
      name: "binding-singleton-consumer",
      packageManager: "pnpm@10.33.0",
    }, null, 2)}\n`,
  );
  await writeFile(join(directory, "consumer.mjs"), positiveConsumerSource());
}

function positiveConsumerSource() {
  return `import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.customElements = dom.window.customElements;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;

const core = await import(${JSON.stringify(corePackageName)});
const reactBinding = await import("@prometheus-ags/prometheus-entity-management");
const svelteBinding = await import("@prometheus-ags/entity-graph-svelte");
const solidBinding = await import("@prometheus-ags/entity-graph-solid");
const { createRoot } = await import("solid-js");
const webBinding = await import("@prometheus-ags/entity-graph-web-components");
const alpineBinding = await import("@prometheus-ags/entity-graph-alpine");
const htmxBinding = await import("@prometheus-ags/entity-graph-htmx");

core.graphStore.setState({ entities: {}, patches: {}, lists: {}, entityStates: {} });

assert.equal(reactBinding.graphStore, core.graphStore);
let reactObserved = null;
const stopReact = reactBinding.graphStore.subscribe(
  (state) => state.entities.Singleton?.react?.name,
  (name) => { reactObserved = name; },
);
core.graphStore.getState().upsertEntity("Singleton", "react", { name: "React" });
stopReact();
assert.equal(reactObserved, "React");

assert.equal(solidBinding.graphStore, core.graphStore);
assert.equal(solidBinding.useGraphStore, core.graphStore);
let solidView;
let disposeSolid = () => {};
createRoot((dispose) => {
  disposeSolid = dispose;
  solidView = solidBinding.createGraphStore(
    (state) => state.entities.Singleton?.solid?.name ?? null,
  );
});
core.graphStore.getState().upsertEntity("Singleton", "solid", { name: "Solid" });
assert.equal(solidView(), "Solid");
disposeSolid();

const svelteView = svelteBinding.createEntityStore("Singleton", { id: "svelte", enabled: false });
core.graphStore.getState().upsertEntity("Singleton", "svelte", { name: "Svelte" });
assert.equal(svelteView.entity.name, "Svelte");
svelteView.destroy();

let webUpdates = 0;
const host = {
  addController() {},
  requestUpdate() { webUpdates += 1; },
};
const webView = new webBinding.EntityDetailController(host, "Singleton", {
  id: "web-components",
  enabled: false,
});
webView.hostConnected();
core.graphStore.getState().upsertEntity("Singleton", "web-components", { name: "Web Components" });
assert.equal(webView.entity.name, "Web Components");
assert.ok(webUpdates > 0);
webView.hostDisconnected();

const alpineView = alpineBinding.createEntityBinding(
  (value) => value,
  "Singleton",
  "alpine",
  { enabled: false },
);
core.graphStore.getState().upsertEntity("Singleton", "alpine", { name: "Alpine" });
assert.equal(alpineView.data.name, "Alpine");
alpineView.destroy();

const htmxGraph = htmxBinding.createServerGraph();
assert.equal(htmxGraph.getStore(), core.graphStore);
let htmxEvent = null;
const stopHtmx = htmxGraph.onEntityChanged((event) => { htmxEvent = event; });
htmxGraph.upsertEntity("Singleton", "htmx", { name: "HTMX" });
stopHtmx();
assert.equal(htmxEvent?.op, "upsert");
assert.equal(htmxEvent?.entity?.name, "HTMX");
assert.equal(core.graphStore.getState().readEntity("Singleton", "htmx").name, "HTMX");
core.graphStore.getState().upsertEntity("Singleton", "htmx-core", { name: "Core to HTMX" });
assert.equal(htmxGraph.readEntity("Singleton", "htmx-core").name, "Core to HTMX");

console.log(JSON.stringify({
  react: "pass",
  svelte: "pass",
  solid: "pass",
  webComponents: "pass",
  alpine: "pass",
  htmx: "pass",
  normalizedGraph: "one shared default graph",
}));
`;
}

async function collectInstalledCorePaths(consumerDirectory, bindingNames) {
  const resolverPath = join(consumerDirectory, "resolve-core.cjs");
  await writeFile(
    resolverPath,
    `const { createRequire } = require("node:module");
const { realpathSync } = require("node:fs");
const rootRequire = createRequire(__filename);
const result = { consumer: realpathSync(rootRequire.resolve(${JSON.stringify(corePackageName)})) };
for (const name of ${JSON.stringify(bindingNames)}) {
  const bindingEntry = rootRequire.resolve(name);
  const bindingRequire = createRequire(bindingEntry);
  result[name] = realpathSync(bindingRequire.resolve(${JSON.stringify(corePackageName)}));
}
console.log(JSON.stringify(result));
`,
  );
  const resolved = await run("node", ["resolve-core.cjs"], { cwd: consumerDirectory });
  const raw = JSON.parse(resolved.stdout);
  const normalized = {};
  for (const [owner, path] of Object.entries(raw)) {
    normalized[owner] = await realpath(path);
  }
  return normalized;
}

async function verifyIncompatiblePeerFailure(directory, artifacts) {
  const fakeCoreDirectory = join(directory, "fake-core");
  const fakeTarballs = join(directory, "fake-tarballs");
  await mkdir(fakeCoreDirectory, { recursive: true });
  await mkdir(fakeTarballs, { recursive: true });
  await writeFile(
    join(fakeCoreDirectory, "package.json"),
    `${JSON.stringify({
      name: corePackageName,
      version: "4.0.0",
      type: "module",
      main: "index.js",
      exports: "./index.js",
    }, null, 2)}\n`,
  );
  await writeFile(join(fakeCoreDirectory, "index.js"), "export const incompatible = true;\n");
  const fakePacked = await run("pnpm", [
    "--dir",
    fakeCoreDirectory,
    "pack",
    "--pack-destination",
    fakeTarballs,
    "--json",
  ]);
  const fakeResultRaw = JSON.parse(fakePacked.stdout);
  const fakeResult = Array.isArray(fakeResultRaw) ? fakeResultRaw[0] : fakeResultRaw;
  const fakeCoreTarball = isAbsolute(fakeResult.filename)
    ? fakeResult.filename
    : resolve(workspaceRoot, fakeResult.filename);

  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify({
      name: "incompatible-binding-consumer",
      private: true,
      packageManager: "pnpm@10.33.0",
      dependencies: {
        [corePackageName]: `file:${fakeCoreTarball}`,
        "@prometheus-ags/prometheus-entity-management": `file:${artifacts.get("@prometheus-ags/prometheus-entity-management").tarballPath}`,
        react: "19.2.8",
        "react-dom": "19.2.8",
      },
    }, null, 2)}\n`,
  );
  const failure = await runExpectFailure(
    "pnpm",
    [
      "install",
      "--ignore-scripts",
      "--strict-peer-dependencies",
      "--config.auto-install-peers=false",
      "--prefer-offline",
    ],
    { cwd: directory },
  );
  const diagnostic = `${failure.stdout}\n${failure.stderr}`;
  if (!diagnostic.includes(corePackageName) || !/peer/i.test(diagnostic)) {
    throw new Error(`incompatible core failure is not actionable:\n${diagnostic}`);
  }
  return {
    status: "pass",
    suppliedVersion: "4.0.0",
    expectedRange:
      artifacts.get("@prometheus-ags/prometheus-entity-management").manifest
        .peerDependencies[corePackageName],
    diagnosticIncludesPackage: true,
    diagnosticIncludesPeerContext: true,
  };
}

async function extract(tarballPath, path) {
  return (await run("tar", ["-xOf", tarballPath, path])).stdout;
}

function arraysEqual(first, second) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function aliasCoreInstances(installedCorePaths) {
  const aliases = new Map();
  let nextAlias = 1;
  return Object.fromEntries(
    Object.entries(installedCorePaths).map(([owner, path]) => {
      if (!aliases.has(path)) {
        aliases.set(path, `core-instance-${nextAlias}`);
        nextAlias += 1;
      }
      return [owner, aliases.get(path)];
    }),
  );
}

async function run(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: "0" },
      maxBuffer: 24 * 1024 * 1024,
      ...options,
    });
  } catch (error) {
    const stdout = error.stdout ? `\nstdout:\n${error.stdout}` : "";
    const stderr = error.stderr ? `\nstderr:\n${error.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stdout}${stderr}`, { cause: error });
  }
}

async function runExpectFailure(command, args, options = {}) {
  try {
    await run(command, args, options);
  } catch (error) {
    return {
      stdout: error.cause?.stdout ?? "",
      stderr: error.cause?.stderr ?? error.message,
    };
  }
  throw new Error(`${command} ${args.join(" ")} unexpectedly succeeded`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const reportFlag = process.argv.indexOf("--report");
  const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : undefined;
  if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");
  await verifyBindingSingletons({ reportPath });
}
