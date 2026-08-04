#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultContractPath = join(
  workspaceRoot,
  "tests/fixtures/flint/portable-contract.json",
);
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "build",
  "dist",
  "node_modules",
  "target",
]);
const clientSourceExtensions = new Set([
  ".dart",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".rs",
  ".ts",
  ".tsx",
]);

export async function verifyFlintPortableContracts(options = {}) {
  const contractPath = resolve(options.contractPath ?? defaultContractPath);
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  validateContract(contract);

  const portableFiles = await repositoryContractFiles();
  await assertNoMachineSpecificPaths(portableFiles);
  await assertLiveLaneIsExplicit();
  const clientSecretScan = await scanClientExamples(
    resolve(options.examplesRoot ?? join(workspaceRoot, "examples")),
  );
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
  const files = await collectFiles(examplesRoot, (path) =>
    clientSourceExtensions.has(extname(path)),
  );
  const forbidden = [
    ["service-role environment variable", /FLINT_SERVICE_ROLE_KEY/],
    ["service-role key identifier", /service[_-]?role[_-]?key/i],
    ["server-only Flint key", /flint_sk_[A-Za-z0-9_-]+/],
    ["client-bundled secret variable", /VITE_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE)[A-Z0-9_]*/],
  ];
  for (const path of files) {
    const source = await readFile(path, "utf8");
    for (const [label, pattern] of forbidden) {
      if (pattern.test(source)) {
        throw new Error(
          `client example exposes ${label}: ${relative(workspaceRoot, path)}`,
        );
      }
    }
  }
  return { status: "pass", inspectedFiles: files.length, exposedCredentials: 0 };
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
    if (/\/Users\/[^/]+\//.test(source) || /[A-Za-z]:\\Users\\[^\\]+\\/.test(source)) {
      throw new Error(`machine-specific path in ${relative(workspaceRoot, path)}`);
    }
  }
}

async function assertLiveLaneIsExplicit() {
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
  requireCondition(!/^\s*(?:push|pull_request):/m.test(workflow), "live workflow is not opt-in");

  const rootManifest = JSON.parse(
    await readFile(join(workspaceRoot, "package.json"), "utf8"),
  );
  requireCondition(
    rootManifest.scripts.test.includes("pnpm run test:flint-contracts"),
    "default test chain omits Flint contract regressions",
  );
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
  for (const [name, source] of Object.entries(sources)) {
    const root = resolve(roots[name]);
    for (const [path, expected] of Object.entries(source.files)) {
      const contents = await readFile(join(root, path));
      const actual = createHash("sha256").update(contents).digest("hex");
      if (actual !== expected) {
        throw new Error(
          `external ${name} source hash mismatch for ${path}: expected ${expected}, received ${actual}`,
        );
      }
      files += 1;
    }
  }
  return { status: "pass", disposition: "hash-bound", files };
}

async function collectFiles(root, include) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && include(path)) files.push(path);
    }
  }
  await visit(root);
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
