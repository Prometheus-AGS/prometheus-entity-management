import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  validatePackedManifestData,
  validateTarballFileList,
} from "./package-contract-validation.mjs";
import { PUBLIC_PACKAGES } from "./public-packages.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const selected = [
  PUBLIC_PACKAGES.find(({ name }) => name === "@prometheus-ags/entity-graph-core"),
  PUBLIC_PACKAGES.find(({ name }) => name === "@prometheus-ags/entity-graph-sync"),
];
if (selected.some((entry) => !entry)) throw new Error("core/sync package inventory is incomplete");

const temporaryRoot = await mkdtemp(join(tmpdir(), "prometheus-sync-consumer-"));
const tarballDirectory = join(temporaryRoot, "tarballs");
const consumerDirectory = join(temporaryRoot, "consumer");
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  packages: {},
  consumers: { esm: "pending", commonjs: "pending", typescriptNodeNext: "pending" },
};

try {
  await mkdir(tarballDirectory, { recursive: true });
  const tarballs = {};

  for (const publicPackage of selected) {
    const packageDirectory = join(workspaceRoot, publicPackage.directory);
    const packed = await run("pnpm", [
      "--dir",
      packageDirectory,
      "pack",
      "--pack-destination",
      tarballDirectory,
      "--json",
    ]);
    const result = JSON.parse(packed.stdout);
    const tarballPath = resolve(result.filename);
    const files = result.files.map(({ path }) => path).sort();
    validateTarballFileList(publicPackage, files);
    const manifestResult = await run("tar", ["-xOf", tarballPath, "package/package.json"]);
    validatePackedManifestData(JSON.parse(manifestResult.stdout), workspaceRoot);
    tarballs[publicPackage.name] = `file:${tarballPath}`;
    report.packages[publicPackage.name] = { payload: "pass", manifest: "pass" };
  }

  await writeConsumer(consumerDirectory, tarballs);
  await run(
    "pnpm",
    ["install", "--ignore-scripts", "--strict-peer-dependencies=false"],
    { cwd: consumerDirectory },
  );

  const esm = await run("node", ["consumer.mjs"], { cwd: consumerDirectory });
  process.stdout.write(esm.stdout);
  report.consumers.esm = "pass";

  const cjs = await run("node", ["consumer.cjs"], { cwd: consumerDirectory });
  process.stdout.write(cjs.stdout);
  report.consumers.commonjs = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], {
    cwd: consumerDirectory,
  });
  report.consumers.typescriptNodeNext = "pass";

  process.stdout.write(
    "[sync-persistence] PASS: packed core/sync ESM, CommonJS, NodeNext, and loopback convergence consumer.\n",
  );

  if (reportPath) {
    const absolute = resolve(workspaceRoot, reportPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function writeConsumer(directory, tarballs) {
  await mkdir(directory, { recursive: true });
  const manifest = {
    name: "prometheus-sync-packed-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@prometheus-ags/entity-graph-core": tarballs["@prometheus-ags/entity-graph-core"],
      "@prometheus-ags/entity-graph-sync": tarballs["@prometheus-ags/entity-graph-sync"],
      "loro-crdt": "1.13.9",
      typescript: "6.0.2",
    },
    pnpm: {
      overrides: {
        "@prometheus-ags/entity-graph-core": tarballs["@prometheus-ags/entity-graph-core"],
        "@prometheus-ags/entity-graph-sync": tarballs["@prometheus-ags/entity-graph-sync"],
      },
    },
  };
  await writeFile(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await writeFile(
    join(directory, "consumer.mjs"),
    `import assert from "node:assert/strict";
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import {
  createLoroLoopbackNetwork,
  createLoroProvider,
  createSyncProviderRegistry,
  startSyncBridge,
} from "@prometheus-ags/entity-graph-sync";

const network = createLoroLoopbackNetwork();
async function client(name, peerId) {
  const store = createGraphStore();
  const registry = createSyncProviderRegistry();
  const provider = createLoroProvider({
    channel: network.createChannel(name),
    peerId,
    registerMergeStrategies: false,
  });
  registry.register({ entityTypes: ["Task"], provider });
  const bridge = await startSyncBridge({ store, registry, pushDebounceMs: 0 });
  return { store, bridge };
}
const a = await client("packed-a", 11);
const b = await client("packed-b", 22);
a.store.getState().upsertEntity("Task", "task-packed", { id: "task-packed", status: "ready" });
assert.deepEqual(b.store.getState().readEntity("Task", "task-packed"), { id: "task-packed", status: "ready" });
a.bridge.stop();
b.bridge.stop();
console.log("[sync-persistence] packed Node ESM convergence consumer passed");
`,
  );

  await writeFile(
    join(directory, "consumer.cjs"),
    `const assert = require("node:assert/strict");
const core = require("@prometheus-ags/entity-graph-core");
const sync = require("@prometheus-ags/entity-graph-sync");
for (const name of ["createLoroLoopbackNetwork", "createLoroProvider", "createSyncProviderRegistry", "createWebSocketLoroChannel", "startSyncBridge"]) {
  assert.equal(typeof sync[name], "function", name);
}
assert.equal(typeof core.createGraphStore, "function");
assert.ok(sync.createLoroLoopbackNetwork().createChannel("packed-cjs"));
console.log("[sync-persistence] packed Node CommonJS consumer passed");
`,
  );

  await writeFile(
    join(directory, "consumer.mts"),
    `import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import {
  createLoroLoopbackNetwork,
  createSyncProviderRegistry,
  startSyncBridge,
  type LoroChannelStatus,
  type SyncProviderRegistry,
} from "@prometheus-ags/entity-graph-sync";
const store = createGraphStore();
const registry: SyncProviderRegistry = createSyncProviderRegistry();
const network = createLoroLoopbackNetwork({ autoFlush: false });
const status: LoroChannelStatus = "reconnecting";
void network.createChannel("typed");
void startSyncBridge({ store, registry, pushDebounceMs: 0 });
void status;
`,
  );
  await writeFile(
    join(directory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          lib: ["ES2023", "DOM", "DOM.Iterable"],
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        files: ["consumer.mts"],
      },
      null,
      2,
    )}\n`,
  );
}

async function run(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: "0" },
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    });
  } catch (error) {
    const stdout = error.stdout ? `\nstdout:\n${error.stdout}` : "";
    const stderr = error.stderr ? `\nstderr:\n${error.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stdout}${stderr}`, {
      cause: error,
    });
  }
}
