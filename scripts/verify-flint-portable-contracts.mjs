#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, open, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const defaultContractPath = join(
  workspaceRoot,
  "tests/fixtures/flint/portable-contract.json",
);
const ignoredDirectories = new Set([
  ".git",
  ".gradle",
  ".next",
  "build",
  "dist",
  "node_modules",
  "target",
]);
const clientDependencyDirectories = new Set([".git", ".gradle", "node_modules"]);
const generatedExampleDirectories = [".next", "build", "dist", "target"];
const clientBinaryExtensions = new Set([
  ".a",
  ".bin",
  ".gif",
  ".icns",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".so",
  ".wasm",
  ".zip",
]);

export async function verifyFlintPortableContracts(options = {}) {
  const contractPath = resolve(options.contractPath ?? defaultContractPath);
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  validateContract(contract);

  const portableFiles = await repositoryContractFiles();
  await assertNoMachineSpecificPaths(portableFiles);
  await assertLiveLaneIsExplicit(contract, contractPath === defaultContractPath);
  const clientSecretScan = await scanClientExamples(
    resolve(options.examplesRoot ?? join(workspaceRoot, "examples")),
  );
  const documentation = await assertDocumentationContracts();
  const externalSources = await verifyExternalSources(
    contract.externalSources,
    options.externalRoots,
  );

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    verdict: "pass",
    contract: relative(workspaceRoot, contractPath),
    sourceRevisions: Object.fromEntries(
      Object.entries(contract.externalSources).map(([name, source]) => [
        name,
        source.revision,
      ]),
    ),
    checks: {
      portableRepository: {
        status: "pass",
        inspectedFiles: portableFiles.length,
        machineSpecificPaths: 0,
        silentLiveSkips: 0,
      },
      realtime: {
        status: "pass",
        methods: contract.realtime.clientMethods,
        entityChangeKind: contract.realtime.entityChangeKind,
      },
      security: {
        status: "pass",
        issuer: "production-required",
        tenant: "required-and-equality-enforced",
        kid: "required-for-asymmetric-tokens",
        jwks: "rsa-rfc7517-with-ec-strict-consumer-caveat",
        roleAndKeySeparation: "service-role-server-only",
      },
      provisioning: {
        status: "pass",
        modes: contract.provisioning.routes,
        adapterClaimed: contract.provisioning.prometheusForgeAdapterImplemented,
      },
      clientSecrets: clientSecretScan,
      documentation,
      externalSources,
    },
  };

  if (options.reportPath) {
    const reportPath = resolve(options.reportPath);
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

export async function scanClientExamples(examplesRoot) {
  const excludedDependencyDirectories = [];
  const files = await collectFiles(
    examplesRoot,
    () => true,
    clientDependencyDirectories,
    excludedDependencyDirectories,
  );
  const forbidden = [
    ["service-role environment variable", /FLINT_SERVICE_ROLE_KEY/],
    [
      "service-role environment assignment",
      /\b(?:[A-Z0-9]+_)*SERVICE_ROLE(?:_[A-Z0-9]+)*\s*=/i,
    ],
    ["service-role key identifier", /service[_-]?role[_-]?key/i],
    ["server-only Flint key", /flint_sk_[A-Za-z0-9_-]+/],
    ["client-bundled secret variable", /VITE_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE)[A-Z0-9_]*/],
  ];
  let inspectedFiles = 0;
  let skippedBinaryFiles = 0;
  for (const path of files) {
    const source = await readTextLikeFile(path);
    if (source === null) {
      skippedBinaryFiles += 1;
      continue;
    }
    inspectedFiles += 1;
    if (containsServiceRoleJwt(source)) {
      throw new Error(
        `client example exposes service-role JWT value: ${relative(workspaceRoot, path)}`,
      );
    }
    for (const [label, pattern] of forbidden) {
      if (pattern.test(source)) {
        throw new Error(
          `client example exposes ${label}: ${relative(workspaceRoot, path)}`,
        );
      }
    }
  }
  return {
    status: "pass",
    scope: "repository-owned-example-tree-including-generated-outputs",
    inspectedFiles,
    skippedBinaryFiles,
    traversedGeneratedDirectories: generatedExampleDirectories,
    excludedDependencyDirectories,
    exposedCredentials: 0,
  };
}

export function containsServiceRoleJwt(source) {
  const candidates = source.matchAll(
    /(?<![A-Za-z0-9_-])([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]*)(?![A-Za-z0-9_-])/g,
  );
  for (const candidate of candidates) {
    try {
      const header = JSON.parse(
        Buffer.from(candidate[1], "base64url").toString("utf8"),
      );
      const payload = JSON.parse(
        Buffer.from(candidate[2], "base64url").toString("utf8"),
      );
      if (
        header &&
        typeof header === "object" &&
        typeof header.alg === "string" &&
        containsServiceRoleClaim(payload)
      ) {
        return true;
      }
    } catch {
      // A token-shaped string that is not a JSON JWT payload is not a credential claim.
    }
  }
  return false;
}

function containsServiceRoleClaim(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, claim] of Object.entries(value)) {
    if (["role", "roles"].includes(key.toLowerCase())) {
      const roles = Array.isArray(claim) ? claim : [claim];
      if (
        roles.some(
          (role) =>
            typeof role === "string" &&
            role
              .toLowerCase()
              .split(/[\s,;|]+/)
              .some((token) => ["service_role", "service-role"].includes(token)),
        )
      ) {
        return true;
      }
    }
    if (containsServiceRoleClaim(claim)) return true;
  }
  return false;
}

async function readTextLikeFile(path) {
  if (clientBinaryExtensions.has(extname(path).toLowerCase())) return null;
  const handle = await open(path, "r");
  try {
    const probe = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(probe, 0, probe.length, 0);
    if (probe.subarray(0, bytesRead).includes(0)) return null;
  } finally {
    await handle.close();
  }
  return readFile(path, "utf8");
}

function validateContract(contract) {
  requireEqual(contract.schemaVersion, 1, "contract schemaVersion");
  for (const [name, source] of Object.entries(contract.externalSources ?? {})) {
    requireMatch(source.revision, /^[a-f0-9]{40}$/, `${name} revision`);
    requireCondition(
      Object.keys(source.files ?? {}).length > 0,
      `${name} source file set is empty`,
    );
    for (const [path, hash] of Object.entries(source.files)) {
      requireCondition(!path.startsWith("/"), `${name} source path must be relative`);
      requireMatch(hash, /^[a-f0-9]{64}$/, `${name} source hash for ${path}`);
    }
  }
  requireArrayEqual(
    contract.realtime.clientMethods,
    ["watchEntities", "mutateEntity"],
    "realtime client methods",
  );
  requireEqual(contract.realtime.entityChangeKind, 1, "entity change kind");
  requireEqual(contract.security.issuer.productionRequired, true, "issuer enforcement");
  requireEqual(contract.security.tenant.requiredUuid, true, "tenant UUID requirement");
  requireEqual(
    contract.security.tenant.publishMustMatchChannel,
    true,
    "publish tenant equality",
  );
  requireEqual(
    contract.security.tenant.subscribeDropsForeignTenant,
    true,
    "subscribe tenant isolation",
  );
  requireEqual(
    contract.security.tokenHeader.asymmetricKidRequired,
    true,
    "asymmetric kid requirement",
  );
  requireArrayEqual(
    contract.security.jwks.rsaStandardMembers,
    ["n", "e"],
    "RSA JWK members",
  );
  requireEqual(
    contract.security.jwks.rsaStrictConsumerCompatible,
    true,
    "RSA strict-JWK compatibility",
  );
  requireEqual(
    contract.security.jwks.ecStrictConsumerCompatible,
    false,
    "EC strict-JWK caveat",
  );
  requireArrayEqual(
    contract.security.jwks.ecMissingStandardMembers,
    ["crv", "x", "y"],
    "EC strict-JWK missing members",
  );
  requireEqual(
    contract.security.jwks.symmetricKeysPublished,
    false,
    "symmetric JWKS publication",
  );
  requireEqual(
    contract.security.roles.serverRole,
    "service_role",
    "server role",
  );
  requireEqual(
    contract.security.keySeparation.serviceRoleServerOnly,
    true,
    "service-role key separation",
  );
  requireEqual(
    contract.security.keySeparation.browserLikeClientsRejectServerKeys,
    true,
    "browser server-key rejection",
  );

  const provisioning = contract.provisioning;
  requireArrayEqual(
    provisioning.routes,
    ["plan", "apply", "status", "ddl"],
    "provisioning routes",
  );
  for (const field of [
    "typedJsonOnly",
    "planHashRequired",
    "namespaceAllowlistRequired",
    "serviceRoleOnly",
    "singleTransaction",
    "enableRls",
    "forceRls",
    "perVerbTenantPolicies",
    "auditLedger",
    "restartRequiredForNewRestRoutes",
  ]) {
    requireEqual(provisioning[field], true, `provisioning ${field}`);
  }
  requireEqual(provisioning.enabledByDefault, false, "provisioning default");
  requireEqual(provisioning.rawSqlAccepted, false, "raw SQL acceptance");
  requireEqual(
    provisioning.prometheusForgeAdapterImplemented,
    false,
    "unbuilt Forge adapter claim",
  );
}

async function repositoryContractFiles() {
  const adapterFiles = await collectFiles(
    join(workspaceRoot, "packages/entity-graph-core/src/adapters"),
    (path) => [".ts", ".tsx"].includes(extname(path)),
  );
  return [
    ...adapterFiles,
    join(workspaceRoot, ".github/workflows/flint-live-contract.yml"),
    join(workspaceRoot, "package.json"),
    join(workspaceRoot, "packages/entity-graph-core/package.json"),
    join(workspaceRoot, "packages/entity-graph-core/vitest.config.ts"),
    join(workspaceRoot, "packages/entity-graph-core/vitest.flint-live.config.ts"),
  ];
}

async function assertNoMachineSpecificPaths(files) {
  for (const path of files) {
    const source = await readFile(path, "utf8");
    const machinePath = findMachineSpecificPath(source);
    if (machinePath) {
      throw new Error(
        `machine-specific path ${machinePath} in ${relative(workspaceRoot, path)}`,
      );
    }
  }
}

export function findMachineSpecificPath(source) {
  const workstationPatterns = [
    /\/Users\/[^/\s"'`]+(?:\/|$)/,
    /\/home\/[^/\s"'`]+(?:\/|$)/,
    /\/root(?:\/|$)/,
    /[A-Za-z]:[\\/]Users[\\/][^\\/\s"'`]+(?:[\\/]|$)/i,
    /[A-Za-z]:[\\/](?:[^\\/\s"'`]+[\\/])*?(?:flint-realtime-fabric|flint-gate|flint-forge)(?:[\\/]|$)/i,
    /\\\\[^\\\s"'`]+\\(?:[^\\\s"'`]+\\)*?(?:flint-realtime-fabric|flint-gate|flint-forge)(?:\\|$)/i,
  ];
  for (const pattern of workstationPatterns) {
    const match = source.match(pattern);
    if (match) return match[0];
  }

  const absoluteFlintRoot = source.match(
    /(?:^|[\s"'`=(])((?:\/[^/\s"'`]+)+\/(?:flint-realtime-fabric|flint-gate|flint-forge)(?:\/[^\s"'`]*)?)/i,
  );
  return absoluteFlintRoot?.[1] ?? null;
}

async function assertLiveLaneIsExplicit(contract, requirePinnedDefaults) {
  const livePath = join(
    workspaceRoot,
    "packages/entity-graph-core/src/adapters/flint-live.integration.test.ts",
  );
  const live = await readFile(livePath, "utf8");
  requireCondition(
    live.includes("FLINT_REALTIME_FABRIC_ROOT is required"),
    "live lane does not require its external root",
  );
  requireCondition(
    !/(?:ctx\.)?skip\s*\(|\.skip\s*\(/.test(live),
    "live lane contains a skip branch",
  );

  const defaultConfig = await readFile(
    join(workspaceRoot, "packages/entity-graph-core/vitest.config.ts"),
    "utf8",
  );
  requireCondition(
    defaultConfig.includes("flint-live.integration.test.ts"),
    "default Vitest config does not explicitly exclude the live lane",
  );
  const liveConfig = await readFile(
    join(workspaceRoot, "packages/entity-graph-core/vitest.flint-live.config.ts"),
    "utf8",
  );
  requireCondition(
    liveConfig.includes("flint-live.integration.test.ts"),
    "dedicated Vitest config does not include the live lane",
  );
  const workflow = await readFile(
    join(workspaceRoot, ".github/workflows/flint-live-contract.yml"),
    "utf8",
  );
  for (const required of [
    "workflow_dispatch:",
    "Reject mutable or mismatched Flint refs",
    "--external-realtime-root",
    "test:flint-live",
  ]) {
    requireCondition(workflow.includes(required), `live workflow is missing ${required}`);
  }
  if (requirePinnedDefaults) {
    for (const [name, source] of Object.entries(contract.externalSources)) {
      requireCondition(
        workflow.includes(`default: ${source.revision}`),
        `live workflow default omits pinned ${name} revision`,
      );
    }
  }
  requireCondition(!/^\s*(?:push|pull_request):/m.test(workflow), "live workflow is not opt-in");

  const rootManifest = JSON.parse(
    await readFile(join(workspaceRoot, "package.json"), "utf8"),
  );
  requireCondition(
    rootManifest.scripts.test.includes("pnpm run test:flint-contracts"),
    "default test chain omits Flint contract regressions",
  );
}

async function assertDocumentationContracts() {
  const currentExternalReceipt =
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-flint-portable-contracts/task-6-external-source-verification.json";
  const coverage = JSON.parse(
    await readFile(join(workspaceRoot, "examples/coverage.json"), "utf8"),
  );
  const realtime = coverage.capabilities.find(
    (capability) => capability.id === "graph.realtime-batching",
  );
  const security = coverage.capabilities.find(
    (capability) => capability.id === "security.tenant-actions-secrets",
  );
  const realtimeEvidence = realtime?.releaseEvidence.find(
    (evidence) => evidence.ownerChange === "v3-flint-portable-contracts",
  );
  const securityEvidence = security?.releaseEvidence.find(
    (evidence) => evidence.ownerChange === "v3-flint-portable-contracts",
  );
  for (const [label, evidence] of [
    ["realtime coverage", realtimeEvidence],
    ["security coverage", securityEvidence],
  ]) {
    requireEqual(evidence?.status, "implemented", `${label} status`);
    requireEqual(
      evidence?.command,
      "pnpm run verify:flint-contracts",
      `${label} command`,
    );
    requireCondition(
      Array.isArray(evidence?.paths) && evidence.paths.length > 0,
      `${label} paths are missing`,
    );
    requireCondition(
      evidence.paths.includes(currentExternalReceipt),
      `${label} omits the current exact-source receipt`,
    );
  }

  const exportsLedger = JSON.parse(
    await readFile(
      join(
        workspaceRoot,
        "prometheus-entity-skills/_shared/references/library-exports.json",
      ),
      "utf8",
    ),
  );
  const runtimeExports = Array.isArray(exportsLedger)
    ? exportsLedger
    : Object.values(exportsLedger).filter(Array.isArray).flat();
  for (const name of ["createFlintAdapter", "publishFlintMutation"]) {
    requireCondition(runtimeExports.includes(name), `runtime export ledger omits ${name}`);
  }

  const requiredDocumentation = new Map([
    [
      "release/flint-portable-contracts.md",
      ["watchEntities", "mutateEntity", "FLINT_ANON_KEY", "crv", "/schema/v1"],
    ],
    [
      "prometheus-entity-skills/_shared/references/flint-portable-contracts.md",
      ["createFlintAdapter", "publishFlintMutation", "service-role", "Forge"],
    ],
    [
      "prometheus-entity-skills/_shared/references/library-api.md",
      ["createFlintAdapter", "publishFlintMutation", "FlintClientLike"],
    ],
    [
      "prometheus-entity-skills/entity-graph-realtime/SKILL.md",
      ["createFlintAdapter", "flint-portable-contracts.md"],
    ],
    [
      "prometheus-entity-skills/entity-graph-realtime/references/adapter-catalog.md",
      ["CreateFlintAdapterOptions", "publishFlintMutation", "strict EC"],
    ],
    ["README.md", ["release/flint-portable-contracts.md", "publishFlintMutation"]],
    ["packages/entity-graph-react/README.md", ["createFlintAdapter", "publishFlintMutation"]],
  ]);
  for (const [path, required] of requiredDocumentation) {
    const source = await readFile(join(workspaceRoot, path), "utf8");
    for (const token of required) {
      requireCondition(source.includes(token), `${path} omits ${token}`);
    }
  }

  return {
    status: "pass",
    coverageEntries: 2,
    documentedFiles: requiredDocumentation.size,
    runtimeExports: ["createFlintAdapter", "publishFlintMutation"],
    runtimeLedgerChanged: false,
  };
}

async function verifyExternalSources(sources, roots) {
  const values = roots ? Object.values(roots).filter(Boolean) : [];
  if (values.length === 0) {
    return { status: "not-requested", disposition: "explicit-opt-in", files: 0 };
  }
  for (const name of Object.keys(sources)) {
    requireCondition(roots?.[name], `external ${name} root is required when source verification is enabled`);
  }

  let files = 0;
  const revisions = {};
  for (const [name, source] of Object.entries(sources)) {
    const root = resolve(roots[name]);
    let actualRevision;
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", root, "rev-parse", "--verify", "HEAD^{commit}"],
        { encoding: "utf8" },
      );
      actualRevision = stdout.trim();
    } catch {
      throw new Error(
        `external ${name} root is not a Git worktree at pinned revision ${source.revision}`,
      );
    }
    if (actualRevision !== source.revision) {
      throw new Error(
        `external ${name} revision mismatch: expected ${source.revision}, received ${actualRevision}`,
      );
    }
    revisions[name] = actualRevision;
    for (const [path, expected] of Object.entries(source.files)) {
      let committedContents;
      try {
        const { stdout } = await execFileAsync(
          "git",
          ["-C", root, "show", `${source.revision}:${path}`],
          { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 },
        );
        committedContents = stdout;
      } catch {
        throw new Error(
          `external ${name} pinned commit does not contain ${path}`,
        );
      }
      const committedHash = createHash("sha256")
        .update(committedContents)
        .digest("hex");
      if (committedHash !== expected) {
        throw new Error(
          `external ${name} committed source hash mismatch for ${path}: expected ${expected}, received ${committedHash}`,
        );
      }
      const contents = await readFile(join(root, path));
      const actual = createHash("sha256").update(contents).digest("hex");
      if (actual !== expected) {
        throw new Error(
          `external ${name} working source hash mismatch for ${path}: expected ${expected}, received ${actual}`,
        );
      }
      files += 1;
    }
  }
  return {
    status: "pass",
    disposition: "revision-commit-and-worktree-hash-bound",
    revisions,
    committedFiles: files,
    workingFiles: files,
    files,
  };
}

async function collectFiles(
  root,
  include,
  excludedDirectoryNames = ignoredDirectories,
  excludedDirectories = [],
) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) {
        excludedDirectories.push(relative(root, path));
        continue;
      }
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && include(path)) files.push(path);
    }
  }
  await visit(root);
  excludedDirectories.sort();
  return files.sort();
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} drifted: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function requireArrayEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} drifted`);
  }
}

function requireMatch(actual, pattern, label) {
  if (typeof actual !== "string" || !pattern.test(actual)) {
    throw new Error(`${label} is invalid`);
  }
}

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value) throw new Error(`${name} requires a value`);
  return value;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
async function main() {
  try {
    const report = await verifyFlintPortableContracts({
      reportPath: option("--report"),
      externalRoots: {
        realtime: option("--external-realtime-root"),
        gate: option("--external-gate-root"),
        forge: option("--external-forge-root"),
      },
    });
    process.stdout.write(
      `[flint-contracts] PASS: portable=${report.checks.portableRepository.status}, external=${report.checks.externalSources.status}, client-secrets=0\n`,
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (isMain) void main();
