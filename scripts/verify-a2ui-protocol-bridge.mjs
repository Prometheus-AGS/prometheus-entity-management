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
  PUBLIC_PACKAGES.find(({ name }) => name === "@prometheus-ags/a2ui-react"),
];
if (selected.some((entry) => !entry)) {
  throw new Error("core/A2UI package inventory is incomplete");
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "prometheus-a2ui-consumer-"));
const tarballDirectory = join(temporaryRoot, "tarballs");
const consumerDirectory = join(temporaryRoot, "consumer");
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  packages: {},
  consumers: {
    esm: "pending",
    commonjs: "pending",
    typescriptNodeNext: "pending",
    typescriptNode16: "pending",
    serverRender: "pending",
  },
  protocol: "v0.9.1",
  workspaceAliases: "forbidden",
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
    report.packages[publicPackage.name] = {
      payload: "pass",
      manifest: "pass",
      files: files.length,
    };
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
  report.consumers.serverRender = "pass";

  const cjs = await run("node", ["consumer.cjs"], { cwd: consumerDirectory });
  process.stdout.write(cjs.stdout);
  report.consumers.commonjs = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], {
    cwd: consumerDirectory,
  });
  report.consumers.typescriptNodeNext = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.cjs.json"], {
    cwd: consumerDirectory,
  });
  report.consumers.typescriptNode16 = "pass";

  process.stdout.write(
    "[a2ui-bridge] PASS: packed A2UI ESM, CommonJS, NodeNext, Node16, and render consumer.\n",
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
  const coreTarball = tarballs["@prometheus-ags/entity-graph-core"];
  const a2uiTarball = tarballs["@prometheus-ags/a2ui-react"];
  const manifest = {
    name: "prometheus-a2ui-packed-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@prometheus-ags/entity-graph-core": coreTarball,
      "@prometheus-ags/a2ui-react": a2uiTarball,
      "@types/react": "19.2.18",
      "@types/react-dom": "19.2.4",
      react: "19.2.8",
      "react-dom": "19.2.8",
      typescript: "6.0.2",
      zod: "3.25.76",
    },
    pnpm: {
      overrides: {
        "@prometheus-ags/entity-graph-core": coreTarball,
        "@prometheus-ags/a2ui-react": a2uiTarball,
      },
    },
  };
  await writeFile(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await writeFile(
    join(directory, "consumer.mjs"),
    `import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import * as root from "@prometheus-ags/a2ui-react";
import * as legacy from "@prometheus-ags/a2ui-react/ag-ui";

assert.equal(typeof root.createPrometheusA2uiRuntime, "function");
assert.equal("EntityChat" in root, false);
console.log("[a2ui-bridge] packed official root separation passed");
assert.equal(typeof legacy.EntityChat, "function");
assert.equal(typeof legacy.useChatSession, "function");
console.log("[a2ui-bridge] packed AG-UI compatibility subpath passed");

const store = createGraphStore();
const policy = root.createEntityGraphA2uiActionPolicy({
  graphStore: store,
  entities: {
    Order: {
      actions: [root.ENTITY_GRAPH_A2UI_ACTIONS.upsert],
      fields: ["status"],
    },
  },
  authorize: ({ tenantId }) => tenantId === "packed-tenant",
});
const runtime = root.createPrometheusA2uiRuntime({ actionPolicy: policy });
runtime.processMessages([
  { version: "v0.9.1", createSurface: { surfaceId: "packed", catalogId: root.PROMETHEUS_A2UI_CATALOG_ID } },
  { version: "v0.9.1", updateComponents: { surfaceId: "packed", components: [
    { id: "root", component: "Column", children: ["title"] },
    { id: "title", component: "Text", text: "Packed official surface" },
  ] } },
]);
const surface = runtime.getSurface("packed");
assert.equal(surface.catalog.id, root.PROMETHEUS_A2UI_CATALOG_ID);
await surface.dispatchAction({ event: { name: root.ENTITY_GRAPH_A2UI_ACTIONS.upsert, context: {
  entityType: "Order", entityId: "packed-order", tenantId: "packed-tenant", data: { status: "verified" },
} } }, "title");
assert.deepEqual(store.getState().readEntity("Order", "packed-order"), { status: "verified" });
const html = renderToStaticMarkup(
  React.createElement(root.PrometheusA2uiProvider, { runtime },
    React.createElement(root.PrometheusA2uiSurface, { surfaceId: "packed" }),
  ),
);
assert.match(html, /data-prometheus-a2ui-surface="packed"/);
runtime.dispose();
console.log("[a2ui-bridge] packed Node ESM official runtime and render passed");
`,
  );

  await writeFile(
    join(directory, "consumer.cjs"),
    `const assert = require("node:assert/strict");
const root = require("@prometheus-ags/a2ui-react");
const legacy = require("@prometheus-ags/a2ui-react/ag-ui");
assert.equal(typeof root.createPrometheusA2uiRuntime, "function");
assert.equal(typeof root.PrometheusA2uiSurface, "function");
assert.equal("EntityChat" in root, false);
assert.equal(typeof legacy.EntityChat, "function");
const runtime = root.createPrometheusA2uiRuntime();
assert.equal(runtime.processor.version, "v0.9.1");
runtime.dispose();
console.log("[a2ui-bridge] packed Node CommonJS root and subpath passed");
`,
  );

  await writeFile(
    join(directory, "consumer.mts"),
    `import {
  ENTITY_GRAPH_A2UI_ACTIONS,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  createEntityGraphA2uiActionPolicy,
  createPrometheusA2uiRuntime,
  type A2uiActionDecision,
  type EntityGraphA2uiEntityPolicy,
  type PrometheusA2uiMessageInput,
} from "@prometheus-ags/a2ui-react";
import { EntityChat, type StreamEvent } from "@prometheus-ags/a2ui-react/ag-ui";
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
const entityPolicy: EntityGraphA2uiEntityPolicy = {
  actions: [ENTITY_GRAPH_A2UI_ACTIONS.upsert],
  fields: ["status"],
};
const graphStore = createGraphStore();
const policy = createEntityGraphA2uiActionPolicy({
  graphStore,
  entities: { Order: entityPolicy },
  authorize: () => true,
});
const runtime = createPrometheusA2uiRuntime({ actionPolicy: policy });
const messages: PrometheusA2uiMessageInput = [];
const decision: A2uiActionDecision | undefined = undefined;
const event: StreamEvent = { type: "DONE" };
void EntityChat;
void decision;
void event;
runtime.processMessages(messages);
if (PROMETHEUS_A2UI_PROTOCOL_VERSION !== "v0.9.1") throw new Error("protocol mismatch");
runtime.dispose();
`,
  );

  await writeFile(
    join(directory, "consumer.cts"),
    `import {
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  createPrometheusA2uiRuntime,
  type A2uiClientCapabilities,
} from "@prometheus-ags/a2ui-react";
import { EntityChat, type StreamEvent } from "@prometheus-ags/a2ui-react/ag-ui";
const runtime = createPrometheusA2uiRuntime();
const capabilities: A2uiClientCapabilities = runtime.getClientCapabilities();
const event: StreamEvent = { type: "DONE" };
void EntityChat;
void capabilities;
void event;
if (PROMETHEUS_A2UI_PROTOCOL_VERSION !== "v0.9.1") throw new Error("protocol mismatch");
runtime.dispose();
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

  await writeFile(
    join(directory, "tsconfig.cjs.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          lib: ["ES2023", "DOM", "DOM.Iterable"],
          module: "Node16",
          moduleResolution: "Node16",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        files: ["consumer.cts"],
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
      maxBuffer: 30 * 1024 * 1024,
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
