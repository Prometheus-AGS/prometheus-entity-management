import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  containsServiceRoleJwt,
  findMachineSpecificPath,
  scanClientExamples,
  verifyFlintPortableContracts,
} from "../../scripts/verify-flint-portable-contracts.mjs";

const root = process.cwd();
const contractPath = join(root, "tests/fixtures/flint/portable-contract.json");
const execFileAsync = promisify(execFile);

async function initializeGitRepository(directory, files = {}) {
  await execFileAsync("git", ["init", "--quiet", directory]);
  await execFileAsync("git", ["-C", directory, "config", "user.email", "flint-contract@example.invalid"]);
  await execFileAsync("git", ["-C", directory, "config", "user.name", "Flint Contract Test"]);
  await writeFile(join(directory, ".revision-probe"), "revision probe\n");
  for (const [path, contents] of Object.entries(files)) {
    const target = join(directory, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
  await execFileAsync("git", ["-C", directory, "add", "."]);
  await execFileAsync("git", ["-C", directory, "commit", "--quiet", "-m", "revision probe"]);
  const { stdout } = await execFileAsync("git", ["-C", directory, "rev-parse", "HEAD"]);
  return stdout.trim();
}

test("portable Flint contracts cover realtime, security, provisioning, and client secrets", async () => {
  const report = await verifyFlintPortableContracts();
  assert.equal(report.verdict, "pass");
  assert.deepEqual(report.checks.realtime.methods, ["watchEntities", "mutateEntity"]);
  assert.equal(report.checks.security.issuer, "production-required");
  assert.equal(report.checks.security.tenant, "required-and-equality-enforced");
  assert.equal(report.checks.security.kid, "required-for-asymmetric-tokens");
  assert.equal(report.checks.security.roleAndKeySeparation, "service-role-server-only");
  assert.equal(report.checks.provisioning.adapterClaimed, false);
  assert.equal(report.checks.clientSecrets.exposedCredentials, 0);
  assert.equal(report.checks.documentation.coverageEntries, 2);
  assert.equal(report.checks.documentation.documentedFiles, 7);
  assert.deepEqual(report.checks.documentation.runtimeExports, [
    "createFlintAdapter",
    "publishFlintMutation",
  ]);
  assert.equal(report.checks.documentation.runtimeLedgerChanged, false);
  assert.deepEqual(report.checks.externalSources, {
    status: "not-requested",
    disposition: "explicit-opt-in",
    files: 0,
  });
});

test("security contract drift fails closed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-flint-contract-"));
  try {
    const contract = JSON.parse(await readFile(contractPath, "utf8"));
    contract.security.tokenHeader.asymmetricKidRequired = false;
    const tampered = join(directory, "portable-contract.json");
    await writeFile(tampered, `${JSON.stringify(contract, null, 2)}\n`);
    await assert.rejects(
      verifyFlintPortableContracts({ contractPath: tampered }),
      /asymmetric kid requirement drifted/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("hash-bound external verification rejects source drift", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-flint-source-"));
  try {
    const relativePath = "sdks/entity-management/src/types.ts";
    const revision = await initializeGitRepository(directory, {
      [relativePath]: "drifted\n",
    });
    const contract = JSON.parse(await readFile(contractPath, "utf8"));
    for (const source of Object.values(contract.externalSources)) {
      source.revision = revision;
    }
    const tampered = join(directory, "portable-contract.json");
    await writeFile(tampered, `${JSON.stringify(contract, null, 2)}\n`);
    await assert.rejects(
      verifyFlintPortableContracts({
        contractPath: tampered,
        externalRoots: { realtime: directory, gate: directory, forge: directory },
      }),
      /external realtime committed source hash mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("external verification rejects dirty pinned source files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-flint-dirty-"));
  try {
    const relativePath = "sdks/entity-management/src/types.ts";
    const committedContents = "committed contract\n";
    const revision = await initializeGitRepository(directory, {
      [relativePath]: committedContents,
    });
    const expected = createHash("sha256").update(committedContents).digest("hex");
    const contract = JSON.parse(await readFile(contractPath, "utf8"));
    for (const source of Object.values(contract.externalSources)) {
      source.revision = revision;
      source.files = { [relativePath]: expected };
    }
    const tampered = join(directory, "portable-contract.json");
    await writeFile(tampered, `${JSON.stringify(contract, null, 2)}\n`);
    await writeFile(join(directory, relativePath), "dirty contract\n");

    await assert.rejects(
      verifyFlintPortableContracts({
        contractPath: tampered,
        externalRoots: { realtime: directory, gate: directory, forge: directory },
      }),
      /external realtime working source hash mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("external verification rejects a Git worktree at the wrong pinned revision", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-flint-revision-"));
  try {
    const actualRevision = await initializeGitRepository(directory);
    const contract = JSON.parse(await readFile(contractPath, "utf8"));
    await assert.rejects(
      verifyFlintPortableContracts({
        externalRoots: { realtime: directory, gate: directory, forge: directory },
      }),
      new RegExp(
        `external realtime revision mismatch: expected ${contract.externalSources.realtime.revision}, received ${actualRevision}`,
      ),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("client examples reject service-role credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-flint-client-"));
  try {
    await writeFile(
      join(directory, "client.ts"),
      'const key = process.env.FLINT_SERVICE_ROLE_KEY;\n',
    );
    await assert.rejects(
      scanClientExamples(directory),
      /client example exposes service-role environment variable/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("client examples scan dot-env configuration files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-flint-env-"));
  try {
    await writeFile(
      join(directory, ".env.local"),
      "FLINT_SERVICE_ROLE_KEY=server-only\n",
    );
    await assert.rejects(
      scanClientExamples(directory),
      /client example exposes service-role environment variable.*\.env\.local/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("client examples reject common service-role environment assignments", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-flint-service-role-env-"));
  try {
    await writeFile(
      join(directory, ".env.production"),
      "SUPABASE_SERVICE_ROLE_TOKEN=server-only\n",
    );
    await assert.rejects(
      scanClientExamples(directory),
      /client example exposes service-role environment assignment.*\.env\.production/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("client examples reject service-role JWT values behind public variable names", async () => {
  const directory = await mkdtemp(join(tmpdir(), "prometheus-flint-service-role-jwt-"));
  try {
    const header = Buffer.from(' {"alg":"HS256","typ":"JWT"}').toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ sub: "client-mislabel", roles: "authenticated service_role" }),
    ).toString("base64url");
    assert.equal(containsServiceRoleJwt(`${header}.${payload}.`), true);
    await writeFile(
      join(directory, ".env.production"),
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${header}.${payload}.signature-\n`,
    );
    await assert.rejects(
      scanClientExamples(directory),
      /client example exposes service-role JWT value.*\.env\.production/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("portable contract files reject workstation and absolute Flint roots", () => {
  for (const source of [
    "/Users/alice/Projects/flint-gate/src/index.ts",
    "/home/alice/Projects/flint-realtime-fabric/sdks/index.ts",
    "/root/flint-forge/src/main.rs",
    "C:\\Users\\alice\\Projects\\flint-gate\\src\\index.ts",
    "C:/Users/alice/project/file.ts",
    "D:\\checkouts\\flint-gate\\src\\index.ts",
    "D:/checkouts/flint-gate/src/index.ts",
    "\\\\server\\share\\flint-gate\\src\\index.ts",
    "/opt/company/checkouts/flint-forge/src/main.rs",
  ]) {
    assert.ok(findMachineSpecificPath(source), source);
  }
  assert.equal(
    findMachineSpecificPath("https://github.com/Prometheus-AGS/flint-gate/tree/main"),
    null,
  );
  assert.equal(findMachineSpecificPath("../../flint-gate/src/index.ts"), null);
});

test("current Gate contract records the corrected RSA and remaining EC strict-JWK boundary", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  assert.deepEqual(contract.security.jwks.rsaStandardMembers, ["n", "e"]);
  assert.equal(contract.security.jwks.rsaStrictConsumerCompatible, true);
  assert.equal(contract.security.jwks.ecStrictConsumerCompatible, false);
  assert.deepEqual(contract.security.jwks.ecMissingStandardMembers, ["crv", "x", "y"]);
  assert.equal(contract.security.jwks.symmetricKeysPublished, false);
});

test("Forge contract requires plan-before-apply without claiming a Prometheus adapter", async () => {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  assert.deepEqual(contract.provisioning.routes, ["plan", "apply", "status", "ddl"]);
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
    assert.equal(contract.provisioning[field], true, field);
  }
  assert.equal(contract.provisioning.rawSqlAccepted, false);
  assert.equal(contract.provisioning.prometheusForgeAdapterImplemented, false);
});

test("coverage, public API, skills, and release guidance stay synchronized", async () => {
  const report = await verifyFlintPortableContracts();
  assert.equal(report.checks.documentation.status, "pass");
  assert.equal(report.checks.documentation.coverageEntries, 2);
  assert.equal(report.checks.documentation.documentedFiles, 7);
  assert.equal(report.checks.documentation.runtimeLedgerChanged, false);
});
