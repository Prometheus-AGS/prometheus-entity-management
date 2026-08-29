import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
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

const corePackage = PUBLIC_PACKAGES.find(({ name }) => name === "@prometheus-ags/entity-graph-core");
if (!corePackage) throw new Error("core package inventory is incomplete");

const coreFixturePath = join(
  workspaceRoot,
  "packages/entity-graph-core/fixtures/devtools/entity-inspection-v1.json",
);
const flutterFixturePath = join(
  workspaceRoot,
  "packages/entity_graph_flutter/fixtures/devtools/entity-inspection-v1.json",
);
const [coreFixture, flutterFixture] = await Promise.all([
  readFile(coreFixturePath),
  readFile(flutterFixturePath),
]);
if (!coreFixture.equals(flutterFixture)) throw new Error("core and Flutter inspection fixtures drifted");
const fixtureSha256 = createHash("sha256").update(coreFixture).digest("hex");

const temporaryRoot = await mkdtemp(join(tmpdir(), "prometheus-devtools-inspection-"));
const tarballDirectory = join(temporaryRoot, "tarballs");
const consumerDirectory = join(temporaryRoot, "consumer");
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  boundary: "assembled-multi-store-packed-consumer",
  fixture: { sha256: fixtureSha256, parity: "pass", packed: "pending" },
  package: { payload: "pending", manifest: "pending" },
  consumers: { esm: "pending", commonjs: "pending", typescriptNodeNext: "pending" },
  scenarios: {
    entityProjection: "pending",
    dirtyOriginalAndLiveValues: "pending",
    viewMembershipAndCleanup: "pending",
    listStatistics: "pending",
    relationships: "pending",
    missingTargets: "pending",
    previewPropagation: "pending",
    exactRestore: "pending",
    metadataOnlyRestore: "pending",
    patchConflictRefusal: "pending",
    canonicalConflictRefusal: "pending",
    multiStoreIsolation: "pending",
    compositeIdentityIsolation: "pending",
    compositeMetadataIdentity: "pending",
    projectionFailureConflictRefusal: "pending",
    valuePolicyBoundary: "pending",
  },
};

try {
  await mkdir(tarballDirectory, { recursive: true });
  const packageDirectory = join(workspaceRoot, corePackage.directory);
  const packed = await run("pnpm", [
    "--dir",
    packageDirectory,
    "pack",
    "--pack-destination",
    tarballDirectory,
    "--json",
  ]);
  const packedResult = JSON.parse(packed.stdout);
  const tarballPath = resolve(packedResult.filename);
  const files = packedResult.files.map(({ path }) => path).sort();
  validateTarballFileList(corePackage, files);
  if (!files.includes("fixtures/devtools/entity-inspection-v1.json")) {
    throw new Error("packed core package is missing the inspection fixture");
  }
  const manifest = await run("tar", ["-xOf", tarballPath, "package/package.json"]);
  validatePackedManifestData(JSON.parse(manifest.stdout), workspaceRoot);
  const packedFixture = await run("tar", [
    "-xOf",
    tarballPath,
    "package/fixtures/devtools/entity-inspection-v1.json",
  ]);
  if (!Buffer.from(packedFixture.stdout).equals(coreFixture)) {
    throw new Error("packed inspection fixture differs from the shared source fixture");
  }
  report.fixture.packed = "pass";
  report.package.payload = "pass";
  report.package.manifest = "pass";

  await writeConsumer(consumerDirectory, `file:${tarballPath}`);
  await run("pnpm", ["install", "--ignore-scripts"], { cwd: consumerDirectory });

  const esm = await run("node", ["consumer.mjs"], { cwd: consumerDirectory });
  process.stdout.write(esm.stdout);
  Object.assign(report.scenarios, JSON.parse(esm.stdout.trim().split("\n").at(-1)));
  report.consumers.esm = "pass";

  const commonjs = await run("node", ["consumer.cjs"], { cwd: consumerDirectory });
  process.stdout.write(commonjs.stdout);
  report.consumers.commonjs = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], { cwd: consumerDirectory });
  report.consumers.typescriptNodeNext = "pass";

  process.stdout.write("[devtools-inspection] PASS: assembled packed acceptance gate.\n");
  if (reportPath) {
    const absolute = resolve(workspaceRoot, reportPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function writeConsumer(directory, coreTarball) {
  await mkdir(directory, { recursive: true });
  const manifest = {
    name: "prometheus-devtools-inspection-packed-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@prometheus-ags/entity-graph-core": coreTarball,
      "@types/node": "25.5.0",
      typescript: "6.0.2",
    },
    pnpm: { overrides: { "@prometheus-ags/entity-graph-core": coreTarball } },
  };
  await writeFile(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  await writeFile(join(directory, "consumer.mjs"), String.raw`
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  createGraphStore,
  registerSchema,
  serializeKey,
} from "@prometheus-ags/entity-graph-core";
import {
  attachGraphDevtools,
  createGraphDevtoolsClient,
} from "@prometheus-ags/entity-graph-core/devtools";

const require = createRequire(import.meta.url);
const packedFixture = require("@prometheus-ags/entity-graph-core/devtools/fixtures/entity-inspection-v1.json");
assert.equal(packedFixture.fixture, "prometheus.entity-graph.devtools.entity-inspection");
assert.equal(packedFixture.fixtureVersion, 1);

registerSchema({
  type: "Project",
  relations: {
    owner: { cardinality: "belongsTo", foreignKey: "ownerId", targetType: "User" },
    contributors: {
      cardinality: "manyToMany",
      targetType: "User",
      localArrayField: "contributorIds",
      listKeyPrefix: (id) => ["project-contributors", id],
    },
  },
});
registerSchema({
  type: "User",
  relations: {
    projects: {
      cardinality: "hasMany",
      targetType: "Project",
      foreignKey: "ownerId",
      listKeyPrefix: (id) => ["projects", { ownerId: id }],
    },
  },
});

const storeA = createGraphStore();
const storeB = createGraphStore();
const attachmentA = attachGraphDevtools(storeA, {
  storeId: "inspection-a",
  values: { mode: "include" },
});
const attachmentB = attachGraphDevtools(storeB, {
  storeId: "inspection-b",
  values: { mode: "include" },
});
const controllerA = attachmentA.controller;
const controllerB = attachmentB.controller;
assert.ok(controllerA && controllerB);
const clientA = createGraphDevtoolsClient("inspection-a", controllerA.connect("inspection-client"));
const events = [];
clientA.subscribe((event) => events.push(event));

storeA.getState().upsertEntity("Project", "p1", {
  id: "p1",
  name: "Apollo",
  ownerId: "u1",
  status: "active",
  contributorIds: ["u1", "u-missing-two"],
});
storeA.getState().upsertEntity("Project", "p2", {
  id: "p2",
  name: "Hermes",
  ownerId: "u-missing",
  status: "active",
});
storeA.getState().upsertEntity("User", "u1", { id: "u1", displayName: "Ada" });
storeA.getState().patchEntity("Project", "p1", { name: "Apollo RC", status: "review" });
storeA.getState().setEntityFetched("Project", "p1");
storeA.getState().setEntitySyncMetadata("Project", "p1", {
  synced: false,
  origin: "optimistic",
  updatedAt: Date.parse("2026-08-29T15:04:00.000Z"),
});
storeA.getState().setEntityError("Project", "p2", "Background refresh failed");
storeA.getState().setEntityStale("Project", "p2", true);
const projectListKey = serializeKey(["projects", { ownerId: "u1" }]);
storeA.getState().setListResult(projectListKey, ["p1", "p2", "ghost"], { total: 3 });
storeB.getState().upsertEntity("Project", "b-only", { id: "b-only", name: "Store B" });

const detail = controllerA.registerView({
  viewId: "project-detail:p1",
  label: "Project detail",
  kind: "entity",
  entityType: "Project",
});
detail.updateMembership(["p1"]);
const duplicateDetail = controllerA.registerView({
  viewId: "project-detail:p1",
  label: "Project detail",
  kind: "entity",
  entityType: "Project",
});
duplicateDetail.updateMembership(["p2"]);
const listView = controllerA.registerView({
  viewId: "project-list:owned",
  label: "Owned projects",
  kind: "list",
  entityType: "Project",
  queryKey: projectListKey,
});
listView.updateMembership(["p1", "p2"]);

let viewSnapshot = controllerA.getViews();
let detailRecord = viewSnapshot.views.find((view) => view.viewId === "project-detail:p1");
assert.deepEqual(detailRecord.membership.map(({ id }) => id), ["p1", "p2"]);
duplicateDetail.unregister();
viewSnapshot = controllerA.getViews();
detailRecord = viewSnapshot.views.find((view) => view.viewId === "project-detail:p1");
assert.deepEqual(detailRecord.membership.map(({ id }) => id), ["p1"]);
const listRecord = viewSnapshot.views.find((view) => view.viewId === "project-list:owned");
assert.deepEqual(listRecord.list, {
  visibleCount: 2,
  graphCount: 3,
  total: 3,
  isFetching: false,
  isFetchingMore: false,
  stale: false,
  hasNextPage: false,
  hasPreviousPage: false,
});
assert.deepEqual(
  viewSnapshot.entityViewMembership.find(({ type, id }) => type === "Project" && id === "p1").viewIds,
  ["project-detail:p1", "project-list:owned"],
);

const entityResult = await clientA.request("get-entity-records");
assert.equal(entityResult.ok, true);
const p1 = entityResult.result.entityRecords.find(({ key }) => key === "Project:p1");
assert.deepEqual(p1.canonical, {
  id: "p1",
  name: "Apollo",
  ownerId: "u1",
  status: "active",
  contributorIds: ["u1", "u-missing-two"],
});
assert.deepEqual(p1.patch, { name: "Apollo RC", status: "review" });
assert.equal(p1.merged.name, "Apollo RC");
assert.equal(p1.dirty, true);
assert.ok(p1.dirtyReasons.some(({ kind, field }) => kind === "local-patch" && field === "name"));
assert.ok(p1.dirtyReasons.some(({ kind }) => kind === "sync-state"));
assert.deepEqual(p1.viewIds, ["project-detail:p1", "project-list:owned"]);
assert.equal(p1.sync.updatedAt, "2026-08-29T15:04:00.000Z");
const p2 = entityResult.result.entityRecords.find(({ key }) => key === "Project:p2");
assert.deepEqual(p2.entityState.error, {
  kind: "entity-fetch",
  message: "Background refresh failed",
  retryable: null,
});

const relationshipResult = await clientA.request("get-relationships");
assert.equal(relationshipResult.ok, true);
const relationships = relationshipResult.result.relationships;
assert.ok(relationships.some((edge) => edge.relation === "owner" && edge.source.id === "p1" && edge.target.id === "u1" && edge.status === "resolved"));
assert.ok(relationships.some((edge) => edge.relation === "owner" && edge.source.id === "p2" && edge.target.id === "u-missing" && edge.status === "missing-target"));
assert.ok(relationships.some((edge) => edge.relation === "projects" && edge.source.id === "u1" && edge.target.id === "p1" && edge.direction === "reverse"));
assert.ok(relationships.some((edge) => edge.relation === "projects" && edge.target.id === "ghost" && edge.status === "missing-target"));
assert.ok(relationships.some((edge) => edge.relation === "contributors" && edge.target.id === "u-missing-two" && edge.status === "missing-target"));

const beforePreviewPatch = { ...storeA.getState().patches.Project.p1 };
const applied = await clientA.request("preview-entity-patch", {
  type: "Project",
  id: "p1",
  patch: { status: "paused" },
});
assert.equal(applied.ok, true);
assert.deepEqual(applied.result.priorPatch, beforePreviewPatch);
assert.equal(storeA.getState().readEntity("Project", "p1").status, "paused");
const previewRecord = controllerA.getEntityRecords().entityRecords.find(({ key }) => key === "Project:p1");
assert.equal(previewRecord.merged.status, "paused");
const restored = await clientA.request("restore-entity-preview", { previewId: applied.result.previewId });
assert.equal(restored.ok, true);
assert.equal(restored.result.status, "restored");
assert.deepEqual(storeA.getState().patches.Project.p1, beforePreviewPatch);

const metadataPreview = await clientA.request("preview-entity-patch", {
  type: "Project",
  id: "p1",
  patch: { status: "metadata-control" },
});
storeA.getState().setEntityFetching("Project", "p1", true);
storeA.getState().setEntitySyncMetadata("Project", "p1", { origin: "client" });
const metadataRestore = await clientA.request("restore-entity-preview", {
  previewId: metadataPreview.result.previewId,
});
assert.equal(metadataRestore.result.status, "restored");
assert.deepEqual(storeA.getState().patches.Project.p1, beforePreviewPatch);

const patchConflictPreview = await clientA.request("preview-entity-patch", {
  type: "Project",
  id: "p1",
  patch: { status: "conflict-preview" },
});
storeA.getState().patchEntity("Project", "p1", { name: "Apollo Final" });
const patchConflict = await clientA.request("restore-entity-preview", {
  previewId: patchConflictPreview.result.previewId,
});
assert.equal(patchConflict.result.status, "conflict");
assert.equal(patchConflict.result.reason, "entity-changed-since-preview");
assert.equal(storeA.getState().patches.Project.p1.name, "Apollo Final");

const canonicalConflictPreview = await clientA.request("preview-entity-patch", {
  type: "Project",
  id: "p2",
  patch: { name: "Hermes Preview" },
});
storeA.getState().replaceEntity("Project", "p2", {
  id: "p2",
  name: "Hermes Server",
  ownerId: "u-missing",
  status: "active",
});
const canonicalConflict = await clientA.request("restore-entity-preview", {
  previewId: canonicalConflictPreview.result.previewId,
});
assert.equal(canonicalConflict.result.status, "conflict");
assert.equal(storeA.getState().patches.Project.p2.name, "Hermes Preview");

assert.deepEqual(controllerB.getEntityRecords().entityRecords.map(({ key }) => key), ["Project:b-only"]);
assert.equal(controllerB.getRelationships().relationships.some((edge) => edge.source.id === "p1"), false);

const collisionStore = createGraphStore();
collisionStore.getState().upsertEntity("a:b", "c", { id: "c", name: "left" });
collisionStore.getState().upsertEntity("a", "b:c", { id: "b:c", name: "right" });
const collisionAttachment = attachGraphDevtools(collisionStore, {
  storeId: "collision-store",
  values: { mode: "include" },
});
const collisionController = collisionAttachment.controller;
const collisionClient = createGraphDevtoolsClient(
  collisionController.storeId,
  collisionController.connect("collision-client"),
);
const leftView = collisionController.registerView({
  viewId: "collision:left",
  label: "Left collision control",
  kind: "entity",
  entityType: "a:b",
});
const rightView = collisionController.registerView({
  viewId: "collision:right",
  label: "Right collision control",
  kind: "entity",
  entityType: "a",
});
leftView.updateMembership(["c"]);
rightView.updateMembership(["b:c"]);
const collisionRecords = collisionController.getEntityRecords().entityRecords;
assert.deepEqual(
  collisionRecords.find(({ type, id }) => type === "a:b" && id === "c").viewIds,
  ["collision:left"],
);
assert.deepEqual(
  collisionRecords.find(({ type, id }) => type === "a" && id === "b:c").viewIds,
  ["collision:right"],
);
const leftRevisionBeforeMetadata = collisionRecords.find(
  ({ type, id }) => type === "a:b" && id === "c",
).revision;
const rightRevisionBeforeMetadata = collisionRecords.find(
  ({ type, id }) => type === "a" && id === "b:c",
).revision;
collisionStore.getState().setEntityFetching("a:b", "c", true);
collisionStore.getState().setEntitySyncMetadata("a", "b:c", {
  synced: false,
  origin: "client",
});
const recordsAfterMetadata = collisionController.getEntityRecords().entityRecords;
assert.equal(recordsAfterMetadata.length, 2);
assert.ok(recordsAfterMetadata.find(
  ({ type, id }) => type === "a:b" && id === "c",
).revision > leftRevisionBeforeMetadata);
assert.ok(recordsAfterMetadata.find(
  ({ type, id }) => type === "a" && id === "b:c",
).revision > rightRevisionBeforeMetadata);
const leftPreview = await collisionClient.request("preview-entity-patch", {
  type: "a:b",
  id: "c",
  patch: { name: "left-preview" },
});
const rightPreview = await collisionClient.request("preview-entity-patch", {
  type: "a",
  id: "b:c",
  patch: { name: "right-preview" },
});
const leftRestore = await collisionClient.request("restore-entity-preview", {
  previewId: leftPreview.result.previewId,
});
assert.equal(leftRestore.result.status, "restored");
assert.equal(collisionStore.getState().readEntity("a:b", "c").name, "left");
assert.equal(collisionStore.getState().readEntity("a", "b:c").name, "right-preview");
const secondLeftPreview = await collisionClient.request("preview-entity-patch", {
  type: "a:b",
  id: "c",
  patch: { name: "left-second-preview" },
});
collisionStore.getState().replaceEntity("a", "b:c", { id: "b:c", name: "right-server" });
const secondLeftRestore = await collisionClient.request("restore-entity-preview", {
  previewId: secondLeftPreview.result.previewId,
});
assert.equal(secondLeftRestore.result.status, "restored");
const rightConflict = await collisionClient.request("restore-entity-preview", {
  previewId: rightPreview.result.previewId,
});
assert.equal(rightConflict.result.status, "conflict");
leftView.unregister();
rightView.unregister();
collisionClient.disconnect();
collisionAttachment.detach();

const projectionFailureStore = createGraphStore();
projectionFailureStore.getState().upsertEntity("Project", "projection-failure", {
  id: "projection-failure",
  name: "Before projection failure",
});
const projectionFailureAttachment = attachGraphDevtools(projectionFailureStore, {
  storeId: "projection-failure-store",
  values: { mode: "include" },
});
const projectionFailureClient = createGraphDevtoolsClient(
  projectionFailureAttachment.controller.storeId,
  projectionFailureAttachment.controller.connect("projection-failure-client"),
);
const projectionFailurePreview = await projectionFailureClient.request("preview-entity-patch", {
  type: "Project",
  id: "projection-failure",
  patch: { name: "Preview before unknown publication" },
});
const validEntities = projectionFailureStore.getState().entities;
const unreadableEntities = new Proxy(validEntities, {
  ownKeys() {
    throw new Error("intentional assembled projection failure");
  },
});
projectionFailureStore.setState({ entities: unreadableEntities });
projectionFailureStore.setState({ entities: validEntities });
const projectionFailureRestore = await projectionFailureClient.request(
  "restore-entity-preview",
  { previewId: projectionFailurePreview.result.previewId },
);
assert.equal(projectionFailureRestore.result.status, "conflict");
assert.equal(
  projectionFailureStore.getState().patches.Project["projection-failure"].name,
  "Preview before unknown publication",
);
projectionFailureClient.disconnect();
projectionFailureAttachment.detach();

const policyStore = createGraphStore();
const policyAttachment = attachGraphDevtools(policyStore, { storeId: "policy-store" });
policyStore.getState().upsertEntity("Secret", "one", { id: "one", token: "hidden" });
const policyRecord = policyAttachment.controller.getEntityRecords().entityRecords[0];
assert.deepEqual(policyRecord.canonical, { $type: "hidden-by-policy" });
const policyClient = createGraphDevtoolsClient("policy-store", policyAttachment.controller.connect());
const policyPreview = await policyClient.request("preview-entity-patch", {
  type: "Secret",
  id: "one",
  patch: { token: "still-hidden" },
});
assert.deepEqual(policyPreview.result.previewPatch, { $type: "hidden-by-policy" });
const policyRestore = await policyClient.request("restore-entity-preview", {
  previewId: policyPreview.result.previewId,
});
assert.equal(policyRestore.result.status, "restored");

assert.ok(events.some((event) => event.type === "view" && event.payload.state === "registered"));
assert.ok(events.some((event) => event.type === "mutation" && event.payload.changes.some((change) => change.category === "patch")));

detail.unregister();
listView.unregister();
policyClient.disconnect();
policyAttachment.detach();
clientA.disconnect();
attachmentA.detach();
attachmentB.detach();

console.log("[devtools-inspection] packed Node ESM integration passed");
console.log(JSON.stringify({
  entityProjection: "pass",
  dirtyOriginalAndLiveValues: "pass",
  viewMembershipAndCleanup: "pass",
  listStatistics: "pass",
  relationships: "pass",
  missingTargets: "pass",
  previewPropagation: "pass",
  exactRestore: "pass",
  metadataOnlyRestore: "pass",
  patchConflictRefusal: "pass",
  canonicalConflictRefusal: "pass",
  multiStoreIsolation: "pass",
  compositeIdentityIsolation: "pass",
  compositeMetadataIdentity: "pass",
  projectionFailureConflictRefusal: "pass",
  valuePolicyBoundary: "pass"
}));
`);

  await writeFile(join(directory, "consumer.cjs"), String.raw`
const assert = require("node:assert/strict");
const core = require("@prometheus-ags/entity-graph-core");
const devtools = require("@prometheus-ags/entity-graph-core/devtools");
const fixture = require("@prometheus-ags/entity-graph-core/devtools/fixtures/entity-inspection-v1.json");
const store = core.createGraphStore();
const attachment = devtools.attachGraphDevtools(store, { storeId: "cjs-inspection", values: { mode: "include" } });
store.getState().upsertEntity("Task", "one", { id: "one", title: "CJS" });
assert.equal(attachment.controller.getEntityRecords().entityRecords[0].merged.title, "CJS");
assert.equal(attachment.controller.getViews().views.length, 0);
assert.equal(attachment.controller.getRelationships().relationships.length, 0);
assert.equal(fixture.fixtureVersion, 1);
attachment.detach();
console.log("[devtools-inspection] packed CommonJS integration passed");
`);

  await writeFile(join(directory, "consumer.mts"), String.raw`
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import {
  attachGraphDevtools,
  createGraphDevtoolsClient,
  type GraphDevtoolsEntityRecord,
  type GraphDevtoolsPreviewAppliedReceipt,
  type GraphDevtoolsPreviewRestoreReceipt,
  type GraphDevtoolsRelationship,
  type GraphDevtoolsViewRecord,
} from "@prometheus-ags/entity-graph-core/devtools";
const store = createGraphStore();
const attachment = attachGraphDevtools(store, { values: { mode: "include" } });
if (!attachment.controller) throw new Error("controller unavailable");
const client = createGraphDevtoolsClient(attachment.controller.storeId, attachment.controller.connect());
const entity: GraphDevtoolsEntityRecord | undefined = attachment.controller.getEntityRecords().entityRecords[0];
const view: GraphDevtoolsViewRecord | undefined = attachment.controller.getViews().views[0];
const relationship: GraphDevtoolsRelationship | undefined = attachment.controller.getRelationships().relationships[0];
const applyResult = await client.request("preview-entity-patch", { type: "Task", id: "one", patch: { title: "Draft" } });
const applied = applyResult.ok ? applyResult.result as GraphDevtoolsPreviewAppliedReceipt : undefined;
const restoreResult = applied ? await client.request("restore-entity-preview", { previewId: applied.previewId }) : undefined;
const restored = restoreResult?.ok ? restoreResult.result as GraphDevtoolsPreviewRestoreReceipt : undefined;
void entity;
void view;
void relationship;
void restored;
client.disconnect();
attachment.detach();
`);
  await writeFile(join(directory, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      target: "ES2023",
      lib: ["ES2023", "DOM"],
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: ["node"],
    },
    files: ["consumer.mts"],
  }, null, 2)}\n`);
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
    throw new Error(`${command} ${args.join(" ")} failed${stdout}${stderr}`, { cause: error });
  }
}
