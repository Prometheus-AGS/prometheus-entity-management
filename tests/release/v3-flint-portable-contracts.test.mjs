import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  scanClientExamples,
  verifyFlintPortableContracts,
} from "../../scripts/verify-flint-portable-contracts.mjs";

const root = process.cwd();
const contractPath = join(root, "tests/fixtures/flint/portable-contract.json");

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
    const firstPath = join(directory, "sdks/entity-management/src/types.ts");
    await mkdir(dirname(firstPath), { recursive: true });
    await writeFile(firstPath, "drifted\n");
    await assert.rejects(
      verifyFlintPortableContracts({
        externalRoots: { realtime: directory, gate: directory, forge: directory },
      }),
      /external realtime source hash mismatch/,
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
