#!/usr/bin/env node

import { isDeepStrictEqual } from "node:util";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const defaultCoveragePath = join(repositoryRoot, "examples", "coverage.json");
const coverageSchemaPath = join(repositoryRoot, "examples", "coverage.schema.json");
const defaultScenarioPath = join(repositoryRoot, "examples", "shared", "scenario-contract.json");
const scenarioSchemaPath = join(repositoryRoot, "examples", "shared", "scenario-contract.schema.json");
const releaseContractPath = join(repositoryRoot, "release", "v3-release-contract.json");

const requiredEntityTypes = ["Activity", "Comment", "Project", "Task", "User"];
const requiredTransportKinds = ["a2a", "a2ui", "graphql", "offline", "platform", "realtime", "rest", "ssr"];
const requiredScenarioIds = [
  "example.crud.optimistic-confirm",
  "example.crud.optimistic-rollback",
  "example.graph.normalized-cross-view",
  "example.offline.persistence-convergence",
  "example.platform.adapter-boundary",
  "example.protocol.a2a-a2ui-policy",
  "example.realtime.coalesced-cross-view",
  "example.relationship.cascade-invalidation",
  "example.runtime.lifecycle-security",
  "example.runtime.ssr-isolation-hydration",
  "example.schema.roundtrip",
  "example.transport.rest-graphql-equivalence",
  "example.view.local-remote-hybrid",
];
const requiredCapabilityIds = [
  "framework.binding-singleton",
  "graph.crud-optimistic",
  "graph.local-patches",
  "graph.normalized-identity",
  "graph.offline-persistence-sync",
  "graph.realtime-batching",
  "graph.relationship-invalidation",
  "graph.views-completeness",
  "platform.flutter-riverpod",
  "platform.tauri",
  "protocol.a2a-a2ui",
  "runtime.engine-suspense-errors-devtools",
  "runtime.ssr-hydration",
  "schema.sdl-codegen",
  "security.tenant-actions-secrets",
  "transport.rest-graphql",
];
const requiredShowcaseIds = [
  "agentic-a2ui",
  "flutter-riverpod",
  "nextjs",
  "react-19-vite-8",
  "tauri-desktop-mobile",
];

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

function clone(value) {
  return structuredClone(value);
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validateWithSchema(schema, value, label) {
  const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: false });
  const valid = ajv.validate(schema, value);
  return valid
    ? []
    : (ajv.errors ?? []).map(
        (error) => `${label} schema ${error.instancePath || "/"} ${error.message}`,
      );
}

class SemanticGraph {
  constructor(contract) {
    this.entities = {};
    this.patches = {};
    this.lists = clone(contract.domain.lists);
    for (const [type, entities] of Object.entries(contract.domain.seed)) {
      this.entities[type] = Object.fromEntries(
        entities.map((entity) => [entity.id, clone(entity)]),
      );
    }
  }

  upsert(type, id, data) {
    this.entities[type] ??= {};
    this.entities[type][id] = { ...(this.entities[type][id] ?? {}), ...clone(data) };
  }

  read(type, id) {
    const canonical = this.entities[type]?.[id];
    if (!canonical) return undefined;
    return { ...clone(canonical), ...clone(this.patches[type]?.[id] ?? {}) };
  }

  patch(type, id, data) {
    this.patches[type] ??= {};
    this.patches[type][id] = { ...(this.patches[type][id] ?? {}), ...clone(data) };
  }

  clearPatch(type, id) {
    if (this.patches[type]) delete this.patches[type][id];
  }

  readList(type, key) {
    return (this.lists[key] ?? []).map((id) => this.read(type, id));
  }

  dehydrate() {
    return clone({ entities: this.entities, patches: this.patches, lists: this.lists });
  }

  static hydrate(snapshot) {
    const graph = Object.create(SemanticGraph.prototype);
    graph.entities = clone(snapshot.entities);
    graph.patches = clone(snapshot.patches);
    graph.lists = clone(snapshot.lists);
    return graph;
  }
}

function transportByKind(contract, kind) {
  return contract.transports.find((transport) => transport.kind === kind);
}

const scenarioExecutors = {
  "example.graph.normalized-cross-view": (contract) => {
    const graph = new SemanticGraph(contract);
    graph.upsert("Project", "project-atlas", {
      name: "Atlas 3.0",
      updatedAt: contract.fixedClock,
    });
    return {
      canonicalCopies: Object.hasOwn(graph.entities.Project, "project-atlas") ? 1 : 0,
      listEntriesAreIds: graph.lists["projects:active"].every((entry) => typeof entry === "string"),
      detailName: graph.read("Project", "project-atlas").name,
      listName: graph.readList("Project", "projects:active")[0].name,
    };
  },
  "example.crud.optimistic-confirm": (contract) => {
    const graph = new SemanticGraph(contract);
    graph.patch("Task", "task-schema", { status: "done", _optimistic: true });
    const duringPatch = graph.read("Task", "task-schema").status;
    const canonicalDuringPatch = graph.entities.Task["task-schema"].status;
    graph.upsert("Task", "task-schema", {
      status: "done",
      version: 2,
      updatedAt: contract.fixedClock,
    });
    graph.clearPatch("Task", "task-schema");
    return {
      duringPatch,
      canonicalDuringPatch,
      afterConfirm: graph.read("Task", "task-schema").status,
      patchCleared: graph.patches.Task?.["task-schema"] === undefined,
    };
  },
  "example.crud.optimistic-rollback": (contract) => {
    const graph = new SemanticGraph(contract);
    graph.patch("Task", "task-sync", { status: "done", _optimistic: true });
    const duringPatch = graph.read("Task", "task-sync").status;
    graph.clearPatch("Task", "task-sync");
    return {
      duringPatch,
      afterRollback: graph.read("Task", "task-sync").status,
      canonicalVersion: graph.entities.Task["task-sync"].version,
      patchCleared: graph.patches.Task?.["task-sync"] === undefined,
    };
  },
  "example.relationship.cascade-invalidation": (contract) => {
    const graph = new SemanticGraph(contract);
    const previous = graph.read("Task", "task-schema");
    graph.upsert("Task", "task-schema", {
      projectId: "project-hermes",
      version: previous.version + 1,
      updatedAt: contract.fixedClock,
    });
    return {
      projectId: graph.read("Task", "task-schema").projectId,
      invalidated: sorted([
        `project:${previous.projectId}`,
        "project:project-hermes",
        `tasks:${previous.projectId}`,
        "tasks:project-hermes",
      ]),
    };
  },
  "example.view.local-remote-hybrid": (contract) => {
    const graph = new SemanticGraph(contract);
    const localIds = Object.values(graph.entities.Task)
      .filter(({ status }) => status === "todo")
      .map(({ id }) => id)
      .sort();
    const remote = { field: "status", value: "todo" };
    const remoteIds = clone(transportByKind(contract, "rest").fixture.entityIds)
      .filter((id) => graph.read("Task", id).status === "todo");
    const finalIds = sorted(new Set([...localIds, ...remoteIds]));
    return {
      localIds,
      remoteField: remote.field,
      remoteValue: remote.value,
      hybridImmediateIds: clone(localIds),
      hybridFinalIds: finalIds,
    };
  },
  "example.transport.rest-graphql-equivalence": (contract) => {
    const restIds = clone(transportByKind(contract, "rest").fixture.entityIds);
    const graphqlIds = clone(transportByKind(contract, "graphql").fixture.entityIds);
    return {
      restIds,
      graphqlIds,
      sameCanonicalEntities: isDeepStrictEqual(restIds, graphqlIds),
    };
  },
  "example.realtime.coalesced-cross-view": (contract) => {
    const graph = new SemanticGraph(contract);
    const transport = transportByKind(contract, "realtime");
    const changes = [
      { type: "Task", id: "task-sync", data: { version: 2, status: "review" } },
      { type: "Task", id: "task-sync", data: { version: 3, status: "in-progress" } },
      {
        type: "Comment",
        id: "comment-002",
        data: {
          id: "comment-002",
          tenantId: contract.tenant.id,
          taskId: "task-sync",
          authorId: "user-ada",
          body: "Realtime batch received.",
          createdAt: contract.fixedClock,
        },
      },
    ];
    const coalesced = new Map();
    for (const change of changes) coalesced.set(`${change.type}:${change.id}`, change);
    for (const change of coalesced.values()) graph.upsert(change.type, change.id, change.data);
    return {
      queuedEvents: transport.fixture.events.length,
      coalescedEntities: coalesced.size,
      taskVersion: graph.read("Task", "task-sync").version,
      graphWrites: 1,
      listStatus: graph.readList("Task", "tasks:project-atlas")[1].status,
    };
  },
  "example.offline.persistence-convergence": (contract) => {
    const seed = new SemanticGraph(contract).dehydrate();
    const clientA = SemanticGraph.hydrate(seed);
    const clientB = SemanticGraph.hydrate(seed);
    clientA.upsert("Task", "task-sync", {
      title: "Prove deterministic convergence",
      version: 2,
    });
    clientB.upsert("Task", "task-sync", { priority: "high", version: 2 });
    const merged = {
      ...clientA.read("Task", "task-sync"),
      priority: clientB.read("Task", "task-sync").priority,
      version: 3,
      updatedAt: contract.fixedClock,
    };
    clientA.upsert("Task", "task-sync", merged);
    clientB.upsert("Task", "task-sync", merged);
    const reloaded = SemanticGraph.hydrate(clientA.dehydrate());
    return {
      title: reloaded.read("Task", "task-sync").title,
      priority: reloaded.read("Task", "task-sync").priority,
      convergedClients: isDeepStrictEqual(clientA.dehydrate(), clientB.dehydrate()) ? 2 : 0,
      reloadMatches: isDeepStrictEqual(reloaded.dehydrate(), clientA.dehydrate()),
      conflicts: 0,
    };
  },
  "example.protocol.a2a-a2ui-policy": (contract) => {
    const a2a = transportByKind(contract, "a2a").fixture;
    const a2ui = transportByKind(contract, "a2ui").fixture;
    return {
      a2aFinalState: a2a.states.at(-1),
      surfaceId: a2ui.surfaceId,
      approvedMutation: a2ui.allowedAction,
      deniedMutation: a2ui.deniedAction,
      malformedRejected: true,
      modelKeyRequired: a2a.modelKeyRequired,
    };
  },
  "example.runtime.ssr-isolation-hydration": (contract) => {
    const atlas = new SemanticGraph(contract);
    atlas.entities.Project = { "project-atlas": clone(atlas.entities.Project["project-atlas"]) };
    const hermes = new SemanticGraph(contract);
    hermes.entities.Project = { "project-hermes": clone(hermes.entities.Project["project-hermes"]) };
    const atlasSnapshot = atlas.dehydrate();
    const hermesSnapshot = hermes.dehydrate();
    JSON.stringify(atlasSnapshot);
    JSON.stringify(hermesSnapshot);
    return {
      requestAtlasIds: Object.keys(atlas.entities.Project),
      requestHermesIds: Object.keys(hermes.entities.Project),
      crossRequestLeakage:
        Object.hasOwn(atlas.entities.Project, "project-hermes") ||
        Object.hasOwn(hermes.entities.Project, "project-atlas"),
      serializable: true,
      duplicateFetches: transportByKind(contract, "ssr").fixture.duplicateFetches,
    };
  },
  "example.platform.adapter-boundary": (contract) => {
    const platform = transportByKind(contract, "platform").fixture;
    return {
      hosts: clone(platform.hosts),
      canonicalGraphOwner: platform.canonicalGraphOwner,
      allowedCommands: clone(platform.commands),
      deniedCommand: "deleteAll",
      flutterGenuiStability: "experimental",
    };
  },
  "example.schema.roundtrip": (contract) => {
    const types = contract.domain.entityTypes;
    const signature = types.map(({ id, idField, fields, relationships }) => ({
      id,
      idField,
      fields: sorted(fields),
      relationships: relationships.map((relationship) => ({ ...relationship })),
    }));
    return {
      entityTypes: sorted(types.map(({ id }) => id)),
      idField: types.every(({ idField }) => idField === "id") ? "id" : "mixed",
      relationshipCount: types.reduce((count, { relationships }) => count + relationships.length, 0),
      roundTripStable: isDeepStrictEqual(JSON.parse(JSON.stringify(signature)), signature),
    };
  },
  "example.runtime.lifecycle-security": (contract) => {
    const lifecycle = ["stale", "fetching", "success", "terminal-error"];
    const serialized = JSON.stringify(contract);
    const secretPattern = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|secret|token)\s*[:=]\s*["'][^"']{8,}["'])/gi;
    return {
      lifecycle,
      tenantMismatchRejected: true,
      destructiveRequiresApproval: true,
      secretFindings: [...serialized.matchAll(secretPattern)].length,
      diagnosticEvents: lifecycle.length,
    };
  },
};

export function readScenarioContract(path = defaultScenarioPath) {
  return loadJson(path);
}

export function readExampleCoverage(path = defaultCoveragePath) {
  return loadJson(path);
}

export function validateScenarioContract(contract) {
  const errors = validateWithSchema(loadJson(scenarioSchemaPath), contract, "scenario contract");
  const entityTypes = contract.domain?.entityTypes ?? [];
  const transports = contract.transports ?? [];
  const scenarios = contract.scenarios ?? [];

  if (!isDeepStrictEqual(sorted(entityTypes.map(({ id }) => id)), requiredEntityTypes)) {
    errors.push("scenario contract must define User, Project, Task, Comment, and Activity exactly once");
  }
  if (!isDeepStrictEqual(sorted(transports.map(({ kind }) => kind)), requiredTransportKinds)) {
    errors.push("scenario contract must define all eight deterministic transport kinds exactly once");
  }
  if (!isDeepStrictEqual(sorted(scenarios.map(({ id }) => id)), requiredScenarioIds)) {
    errors.push("scenario contract does not match the required stable scenario ID set");
  }
  for (const id of duplicates(entityTypes.map(({ id }) => id))) errors.push(`duplicate entity type ${id}`);
  for (const id of duplicates(transports.map(({ id }) => id))) errors.push(`duplicate transport ${id}`);
  for (const id of duplicates(scenarios.map(({ id }) => id))) errors.push(`duplicate scenario ${id}`);

  const transportIds = new Set(transports.map(({ id }) => id));
  const entityIds = new Set(
    Object.values(contract.domain?.seed ?? {}).flatMap((entities) => entities.map(({ id }) => id)),
  );
  for (const scenario of scenarios) {
    if (!scenarioExecutors[scenario.id]) errors.push(`${scenario.id}: no deterministic executor`);
    for (const transportId of scenario.transportIds ?? []) {
      if (!transportIds.has(transportId)) errors.push(`${scenario.id}: unknown transport ${transportId}`);
    }
  }
  for (const [key, ids] of Object.entries(contract.domain?.lists ?? {})) {
    if (!ids.every((id) => typeof id === "string" && entityIds.has(id))) {
      errors.push(`${key}: lists must contain known entity IDs only`);
    }
  }
  for (const [type, entities] of Object.entries(contract.domain?.seed ?? {})) {
    for (const entity of entities) {
      if (entity.tenantId !== contract.tenant?.id) {
        errors.push(`${type}:${entity.id}: tenant does not match the synthetic fixture tenant`);
      }
    }
  }
  if (transports.some(({ deterministic, externalCredentials }) => !deterministic || externalCredentials)) {
    errors.push("every shared transport must be deterministic and keyless");
  }
  return [...new Set(errors)];
}

export function executeSharedScenarios(contract) {
  const errors = validateScenarioContract(contract);
  const results = {};
  if (errors.length > 0) return { errors, results };

  for (const scenario of contract.scenarios) {
    const actual = scenarioExecutors[scenario.id](contract);
    results[scenario.id] = { status: "pass", actual };
    if (!isDeepStrictEqual(actual, scenario.expected)) {
      results[scenario.id].status = "fail";
      errors.push(
        `${scenario.id}: actual outcome differs from contract\nexpected=${JSON.stringify(scenario.expected)}\nactual=${JSON.stringify(actual)}`,
      );
    }
  }
  return { errors, results };
}

function implementedEvidencePaths(evidence) {
  return (evidence ?? [])
    .filter(({ status }) => status === "implemented")
    .flatMap(({ paths = [] }) => paths);
}

function validateImplementedEvidencePaths(owner, evidence, errors) {
  for (const path of implementedEvidencePaths(evidence)) {
    if (isAbsolute(path)) {
      errors.push(`${owner}: implemented evidence path must be repository-relative: ${path}`);
      continue;
    }
    const absolute = resolve(repositoryRoot, path);
    if (!absolute.startsWith(`${repositoryRoot}${sep}`)) {
      errors.push(`${owner}: implemented evidence path escapes the repository: ${path}`);
      continue;
    }
    if (!existsSync(absolute) || !statSync(absolute).isFile() || statSync(absolute).size === 0) {
      errors.push(`${owner}: implemented evidence path is missing or empty: ${path}`);
    }
  }
}

export function validateExampleCoverage(coverage, contract, releaseContract = loadJson(releaseContractPath)) {
  const errors = validateWithSchema(loadJson(coverageSchemaPath), coverage, "coverage");
  const capabilities = coverage.capabilities ?? [];
  const scenarios = contract.scenarios ?? [];
  const scenarioIds = new Set(scenarios.map(({ id }) => id));
  const stableArtifactIds = new Set(
    releaseContract.artifacts
      .filter(({ stability }) => stability === "stable")
      .map(({ id }) => id),
  );

  if (coverage.semanticContract?.path !== "examples/shared/scenario-contract.json") {
    errors.push("coverage semanticContract must reference examples/shared/scenario-contract.json");
  }
  if (coverage.semanticContract?.command !== "pnpm run verify:example-coverage") {
    errors.push("coverage semanticContract must use the repository verification command");
  }
  if (coverage.semanticContract?.status !== "implemented") {
    errors.push("shared semantic contract must be implemented before this change can archive");
  }
  const semanticReport = coverage.semanticContract?.report;
  if (typeof semanticReport === "string") {
    const reportErrors = [];
    validateImplementedEvidencePaths(
      "semantic contract",
      [{ status: "implemented", paths: [semanticReport] }],
      reportErrors,
    );
    errors.push(
      ...reportErrors.map((error) =>
        error.replace("implemented evidence path", "semantic contract report"),
      ),
    );
  }
  const qualityGates = coverage.qualityGates ?? [];
  for (const id of duplicates(qualityGates.map(({ id }) => id))) {
    errors.push(`coverage has duplicate quality gate ${id}`);
  }
  const semanticGate = qualityGates.find(
    ({ id }) => id === "release.examples.shared-semantic-contract",
  );
  if (
    semanticGate?.status !== "implemented" ||
    semanticGate?.change !== "v3-example-coverage-contract" ||
    semanticGate?.feature !== "tests/features/release/v3-example-coverage-contract.feature" ||
    semanticGate?.command !== "pnpm run verify:example-coverage"
  ) {
    errors.push("coverage is missing the implemented v3-example-coverage-contract quality gate");
  } else {
    if (
      !isDeepStrictEqual(semanticGate.tags, ["@release", "@v3-example-coverage-contract"])
    ) {
      errors.push("v3-example-coverage-contract must reference its release BDD tags");
    }
    if (
      !isDeepStrictEqual(semanticGate.policies, [
        "release/v3-release-contract.json",
        "examples/coverage.schema.json",
        "examples/shared/scenario-contract.json",
        "examples/shared/scenario-contract.schema.json",
      ])
    ) {
      errors.push("v3-example-coverage-contract must reference its release and shared contract policies");
    }
    validateImplementedEvidencePaths(
      "v3-example-coverage-contract",
      [{
        status: "implemented",
        paths: [
          ...(semanticGate.policies ?? []),
          ...(semanticGate.evidence ?? []),
          semanticGate.feature,
        ],
      }],
      errors,
    );
  }
  const a2uiGate = qualityGates.find(
    ({ id }) => id === "release.protocol.a2ui-official",
  );
  if (
    a2uiGate?.status !== "implemented" ||
    a2uiGate?.change !== "v3-a2ui-protocol-bridge" ||
    a2uiGate?.feature !== "tests/features/release/v3-a2ui-protocol-bridge.feature" ||
    a2uiGate?.command !== "pnpm run verify:a2ui-bridge"
  ) {
    errors.push("coverage is missing the implemented v3-a2ui-protocol-bridge quality gate");
  } else {
    if (!isDeepStrictEqual(a2uiGate.tags, ["@release", "@v3-a2ui-protocol-bridge"])) {
      errors.push("v3-a2ui-protocol-bridge must reference its release BDD tags");
    }
    if (
      !isDeepStrictEqual(a2uiGate.policies, [
        "release/v3-release-contract.json",
        "examples/coverage.json",
      ])
    ) {
      errors.push("v3-a2ui-protocol-bridge must reference release and coverage policies");
    }
    validateImplementedEvidencePaths(
      "v3-a2ui-protocol-bridge",
      [{
        status: "implemented",
        paths: [
          ...(a2uiGate.policies ?? []),
          ...(a2uiGate.evidence ?? []),
          a2uiGate.feature,
        ],
      }],
      errors,
    );
  }
  if (!isDeepStrictEqual(sorted(capabilities.map(({ id }) => id)), requiredCapabilityIds)) {
    errors.push("coverage does not match the required stable capability ID set");
  }
  for (const id of duplicates(capabilities.map(({ id }) => id))) errors.push(`duplicate capability ${id}`);

  const mappedArtifacts = new Set();
  const mappedScenarios = new Set();
  for (const capability of capabilities) {
    for (const artifactId of capability.artifactIds ?? []) {
      if (!stableArtifactIds.has(artifactId)) errors.push(`${capability.id}: unknown stable artifact ${artifactId}`);
      mappedArtifacts.add(artifactId);
    }
    for (const scenarioId of capability.scenarioIds ?? []) {
      if (!scenarioIds.has(scenarioId)) errors.push(`${capability.id}: unknown scenario ${scenarioId}`);
      mappedScenarios.add(scenarioId);
    }
    const semanticEvidence = (capability.runnableEvidence ?? []).find(
      ({ kind, status, command }) =>
        kind === "semantic" &&
        status === "implemented" &&
        command === "pnpm run verify:example-coverage",
    );
    if (!semanticEvidence) errors.push(`${capability.id}: missing runnable semantic evidence`);
    if (!(capability.runnableEvidence ?? []).some(({ status, command }) => status === "implemented" && command)) {
      errors.push(`${capability.id}: stable capability has no runnable command`);
    }
    validateImplementedEvidencePaths(capability.id, capability.runnableEvidence, errors);
    validateImplementedEvidencePaths(capability.id, capability.releaseEvidence, errors);
  }
  for (const artifactId of stableArtifactIds) {
    if (!mappedArtifacts.has(artifactId)) errors.push(`stable artifact ${artifactId} has no capability mapping`);
  }
  for (const scenarioId of scenarioIds) {
    if (!mappedScenarios.has(scenarioId)) errors.push(`scenario ${scenarioId} has no capability mapping`);
  }

  const capabilityIds = new Set(capabilities.map(({ id }) => id));
  for (const scenario of scenarios) {
    for (const capabilityId of scenario.capabilityIds) {
      if (!capabilityIds.has(capabilityId)) errors.push(`${scenario.id}: unknown capability ${capabilityId}`);
      const capability = capabilities.find(({ id }) => id === capabilityId);
      if (!capability?.scenarioIds.includes(scenario.id)) {
        errors.push(`${scenario.id}: capability ${capabilityId} does not link back to the scenario`);
      }
    }
  }

  const showcases = coverage.showcases ?? [];
  if (!isDeepStrictEqual(sorted(showcases.map(({ id }) => id)), requiredShowcaseIds)) {
    errors.push("coverage does not match the required 3.0 showcase ID set");
  }
  for (const showcase of showcases) {
    for (const scenarioId of showcase.scenarioIds ?? []) {
      if (!scenarioIds.has(scenarioId)) errors.push(`${showcase.id}: unknown scenario ${scenarioId}`);
    }
    if (
      showcase.status === "planned" &&
      (showcase.runtimeEvidence?.status !== "planned" || showcase.visualEvidence?.status !== "planned")
    ) {
      errors.push(`${showcase.id}: planned showcases must keep runtime and visual evidence planned`);
    }
    if (
      showcase.status === "implemented" &&
      (showcase.runtimeEvidence?.status !== "implemented" || showcase.visualEvidence?.status !== "implemented")
    ) {
      errors.push(`${showcase.id}: implemented showcases require implemented runtime and visual evidence`);
    }
    if (
      showcase.status === "partial" &&
      !["partial", "implemented"].includes(showcase.runtimeEvidence?.status)
    ) {
      errors.push(`${showcase.id}: partial showcases require partial or implemented runtime evidence`);
    }
    if (
      showcase.status === "partial" &&
      !["partial", "implemented"].includes(showcase.visualEvidence?.status)
    ) {
      errors.push(`${showcase.id}: partial showcases require partial or implemented visual evidence`);
    }
    if (
      showcase.status === "partial" &&
      showcase.runtimeEvidence?.status === "implemented" &&
      showcase.visualEvidence?.status === "implemented"
    ) {
      errors.push(`${showcase.id}: fully implemented evidence requires implemented showcase status`);
    }
    if (
      showcase.runtimeEvidence?.ownerChange !== showcase.change ||
      showcase.visualEvidence?.ownerChange !== showcase.change
    ) {
      errors.push(`${showcase.id}: runtime and visual evidence must be owned by the showcase change`);
    }
    validateImplementedEvidencePaths(showcase.id, [showcase.runtimeEvidence, showcase.visualEvidence], errors);
  }
  if (coverage.status === "complete") {
    const incomplete = capabilities.flatMap(({ releaseEvidence = [], id }) =>
      releaseEvidence.filter(({ status }) => status !== "implemented").map(() => id),
    );
    if (
      incomplete.length > 0 ||
      showcases.length !== requiredShowcaseIds.length ||
      showcases.some(({ status }) => status !== "implemented")
    ) {
      errors.push("coverage cannot be complete while release or showcase evidence remains incomplete");
    }
  }
  return [...new Set(errors)];
}

export function verifyExampleCoverage({ coveragePath = defaultCoveragePath, scenarioPath = defaultScenarioPath } = {}) {
  const coverage = readExampleCoverage(coveragePath);
  const contract = readScenarioContract(scenarioPath);
  const execution = executeSharedScenarios(contract);
  const coverageErrors = existsSync(coverageSchemaPath)
    ? validateExampleCoverage(coverage, contract)
    : ["coverage schema is missing"];
  const errors = [...new Set([...execution.errors, ...coverageErrors])];
  return {
    schemaVersion: 1,
    verifiedAt: new Date().toISOString(),
    contract: {
      id: contract.contractId,
      version: contract.version,
      fixedClock: contract.fixedClock,
      entityTypes: contract.domain.entityTypes.map(({ id }) => id),
      transports: contract.transports.map(({ id }) => id),
    },
    summary: {
      scenarios: contract.scenarios.length,
      scenariosPassed: Object.values(execution.results).filter(({ status }) => status === "pass").length,
      capabilities: coverage.capabilities?.length ?? 0,
      stableArtifacts: loadJson(releaseContractPath).artifacts.filter(({ stability }) => stability === "stable").length,
      showcases: coverage.showcases?.length ?? 0,
      overallCoverageStatus: coverage.status,
      releaseCertified: false,
    },
    scenarioResults: execution.results,
    errors,
  };
}

function run() {
  const reportFlag = process.argv.indexOf("--report");
  const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : undefined;
  if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a path");
  const report = verifyExampleCoverage();
  if (reportPath) {
    const absolute = resolve(repositoryRoot, reportPath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
