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
  PUBLIC_PACKAGES.find(({ name }) => name === "@prometheus-ags/entity-graph-a2a"),
];
if (selected.some((entry) => !entry)) {
  throw new Error("core/A2A package inventory is incomplete");
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "prometheus-a2a-consumer-"));
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
    officialRoot: "pending",
    legacySubpath: "pending",
    externalExecutor: "pending",
  },
  protocol: "A2A 1.0 JSONRPC",
  sdk: "@a2a-js/sdk@1.0.1",
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
    const packedManifest = JSON.parse(manifestResult.stdout);
    validatePackedManifestData(packedManifest, workspaceRoot);
    if (publicPackage.name === "@prometheus-ags/entity-graph-a2a") {
      if (packedManifest.dependencies?.["@a2a-js/sdk"] !== "1.0.1") {
        throw new Error("packed A2A package must pin @a2a-js/sdk@1.0.1");
      }
      for (const required of [
        "dist/legacy.mjs",
        "dist/legacy.cjs",
        "dist/legacy.d.ts",
        "dist/legacy.d.cts",
      ]) {
        if (!files.includes(required)) throw new Error(`packed A2A package is missing ${required}`);
      }
    }
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
  report.consumers.officialRoot = "pass";
  report.consumers.legacySubpath = "pass";
  report.consumers.externalExecutor = "pass";

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
    "[a2a-conformance] PASS: packed A2A ESM, CommonJS, NodeNext, Node16, official root, legacy subpath, and external executor consumer.\n",
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
  const a2aTarball = tarballs["@prometheus-ags/entity-graph-a2a"];
  const manifest = {
    name: "prometheus-a2a-packed-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@prometheus-ags/entity-graph-core": coreTarball,
      "@prometheus-ags/entity-graph-a2a": a2aTarball,
      "@types/node": "22.20.1",
      typescript: "6.0.2",
    },
    pnpm: {
      overrides: {
        "@prometheus-ags/entity-graph-core": coreTarball,
        "@prometheus-ags/entity-graph-a2a": a2aTarball,
      },
    },
  };
  await writeFile(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await writeFile(
    join(directory, "consumer.mjs"),
    `import assert from "node:assert/strict";
import * as root from "@prometheus-ags/entity-graph-a2a";
import * as legacy from "@prometheus-ags/entity-graph-a2a/legacy";

assert.equal(root.A2A_PROTOCOL_VERSION, "1.0");
assert.equal(root.TaskState.TASK_STATE_COMPLETED, 3);
assert.equal(typeof root.createA2AServer, "function");
assert.equal("createLegacyA2AAdapter" in root, false);
assert.equal(typeof legacy.createLegacyA2AAdapter, "function");

const server = root.createA2AServer({
  card: root.buildAgentCard({ url: "http://127.0.0.1/a2a" }),
  deterministicExecutor: {
    clock: () => "2026-08-01T00:00:00.000Z",
    idFactory: (() => { let id = 0; return () => \`packed-\${++id}\`; })(),
  },
});
const cardResponse = await server.fetch(new Request("http://127.0.0.1/.well-known/agent-card.json"));
const card = await cardResponse.json();
assert.equal(card.supportedInterfaces[0].protocolVersion, "1.0");
assert.equal(card.capabilities.streaming, true);
assert.equal(card.capabilities.pushNotifications, false);
assert.ok(cardResponse.headers.get("etag"));

const response = await server.handleRequest({
  jsonrpc: "2.0",
  id: "packed-request",
  method: "SendMessage",
  params: {
    message: {
      role: "ROLE_USER",
      parts: [{ text: "packed official request" }],
      messageId: "packed-message",
    },
  },
}, { requestedVersion: "1.0" });
assert.equal(response.result.task.status.state, "TASK_STATE_COMPLETED");
assert.equal(response.result.task.artifacts[0].parts[0].text.includes("Prometheus A2A v1"), true);
console.log("[a2a-conformance] packed Node ESM discovery and official task lifecycle passed");

const remoteEndpoint = "http://127.0.0.1:43119/a2a";
const remoteServer = root.createA2AServer({
  card: root.buildAgentCard({ url: remoteEndpoint }),
  deterministicExecutor: {
    clock: () => "2026-08-01T00:00:00.000Z",
    idFactory: (() => { let id = 0; return () => \`remote-packed-\${++id}\`; })(),
  },
});
const externalRequests = [];
const externalFetch = async (input, init) => {
  const request = new Request(input, init);
  externalRequests.push({
    method: request.method,
    pathname: new URL(request.url).pathname,
    token: request.headers.get("x-external-token"),
  });
  return remoteServer.fetch(request);
};
const externalServer = root.createA2AServer({
  card: root.buildAgentCard({ url: "http://127.0.0.1/a2a" }),
  executor: root.createExternalA2AExecutor({
    baseUrl: "http://127.0.0.1:43119",
    fetch: externalFetch,
    serviceParameters: { "x-external-token": "packed-token" },
  }),
});
const externalResponse = await externalServer.fetch(new Request("http://127.0.0.1/a2a", {
  method: "POST",
  headers: { "content-type": "application/json", "A2A-Version": "1.0" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: "external-packed-request",
    method: "SendStreamingMessage",
    params: {
      message: {
        role: "ROLE_USER",
        parts: [{ text: "delegate from packed consumer" }],
        messageId: "external-packed-message",
      },
    },
  }),
}));
const externalEvents = (await externalResponse.text())
  .split(/\\r?\\n/)
  .filter((line) => line.startsWith("data:"))
  .map((line) => JSON.parse(line.slice(5).trim()));
assert.equal(externalEvents.length, 4);
assert.equal(externalEvents.at(-1).result.statusUpdate.status.state, "TASK_STATE_COMPLETED");
assert.deepEqual(externalRequests, [
  { method: "GET", pathname: "/.well-known/agent-card.json", token: null },
  { method: "POST", pathname: "/a2a", token: "packed-token" },
]);
console.log("[a2a-conformance] packed external JSON-RPC executor passed");

const adapter = legacy.createLegacyA2AAdapter({ server, idFactory: () => "legacy-packed-message" });
const legacyResponse = await adapter.handleRequest({
  jsonrpc: "2.0",
  id: "legacy-request",
  method: "tasks/send",
  params: { id: "legacy-task", message: { parts: [{ type: "text", text: "legacy seam" }] } },
}, { requestedVersion: "1.0" });
assert.equal(legacyResponse.result.task.status.state, "TASK_STATE_COMPLETED");
console.log("[a2a-conformance] packed explicit legacy subpath passed");
`,
  );

  await writeFile(
    join(directory, "consumer.cjs"),
    `const assert = require("node:assert/strict");
const root = require("@prometheus-ags/entity-graph-a2a");
const legacy = require("@prometheus-ags/entity-graph-a2a/legacy");
assert.equal(root.A2A_PROTOCOL_VERSION, "1.0");
assert.equal(typeof root.buildAgentCard, "function");
assert.equal(typeof root.createA2AServer, "function");
assert.equal(typeof root.createExternalA2AExecutor, "function");
assert.equal("createLegacyA2AAdapter" in root, false);
assert.equal(typeof legacy.createLegacyA2AAdapter, "function");
console.log("[a2a-conformance] packed Node CommonJS root and legacy subpath passed");
`,
  );

  await writeFile(
    join(directory, "consumer.mts"),
    `import {
  A2A_PROTOCOL_VERSION,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  TaskState,
  buildAgentCard,
  createA2AServer,
  createExternalA2AExecutor,
  type A2AApplicationPolicy,
  type AgentCard,
  type ExternalA2AExecutorOptions,
  type Task,
} from "@prometheus-ags/entity-graph-a2a";
import { createLegacyA2AAdapter } from "@prometheus-ags/entity-graph-a2a/legacy";
const card: AgentCard = buildAgentCard({ url: "http://localhost/a2a" });
const policy: A2AApplicationPolicy | undefined = undefined;
const server = createA2AServer({ card, policy });
const task: Task | undefined = undefined;
const adapter = createLegacyA2AAdapter({ server });
const externalOptions: ExternalA2AExecutorOptions = { baseUrl: "https://agents.example.test" };
const externalExecutor = createExternalA2AExecutor(externalOptions);
void task;
void adapter;
void externalExecutor;
if (A2A_PROTOCOL_VERSION !== "1.0") throw new Error("protocol mismatch");
if (PROMETHEUS_A2UI_PROTOCOL_VERSION !== "v0.9.1") throw new Error("A2UI mismatch");
if (TaskState.TASK_STATE_COMPLETED !== 3) throw new Error("enum mismatch");
`,
  );

  await writeFile(
    join(directory, "consumer.cts"),
    `import {
  A2A_PROTOCOL_VERSION,
  buildAgentCard,
  createA2AServer,
  type A2AServer,
  type AgentCard,
} from "@prometheus-ags/entity-graph-a2a";
import { createLegacyA2AAdapter } from "@prometheus-ags/entity-graph-a2a/legacy";
const card: AgentCard = buildAgentCard({ url: "http://localhost/a2a" });
const server: A2AServer = createA2AServer({ card });
const adapter = createLegacyA2AAdapter({ server });
void adapter;
if (A2A_PROTOCOL_VERSION !== "1.0") throw new Error("protocol mismatch");
`,
  );

  await writeFile(
    join(directory, "tsconfig.json"),
    `${JSON.stringify({
      compilerOptions: {
        target: "ES2023",
        lib: ["ES2023", "DOM", "DOM.Iterable"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        types: ["node"],
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      files: ["consumer.mts"],
    }, null, 2)}\n`,
  );

  await writeFile(
    join(directory, "tsconfig.cjs.json"),
    `${JSON.stringify({
      compilerOptions: {
        target: "ES2023",
        lib: ["ES2023", "DOM", "DOM.Iterable"],
        module: "Node16",
        moduleResolution: "Node16",
        types: ["node"],
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      files: ["consumer.cts"],
    }, null, 2)}\n`,
  );
}

async function run(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd: options.cwd ?? workspaceRoot,
      env: { ...process.env, FORCE_COLOR: "0", ...(options.env ?? {}) },
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      timeout: 180_000,
    });
  } catch (error) {
    const stdout = error.stdout ? `\nstdout:\n${error.stdout}` : "";
    const stderr = error.stderr ? `\nstderr:\n${error.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed.${stdout}${stderr}`, { cause: error });
  }
}
