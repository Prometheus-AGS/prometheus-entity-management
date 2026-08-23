import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Given, Then } from "@cucumber/cucumber";

import { verifyFlintPortableContracts } from "../../scripts/verify-flint-portable-contracts.mjs";

const root = process.cwd();
const contract = JSON.parse(
  readFileSync(join(root, "tests/fixtures/flint/portable-contract.json"), "utf8"),
);
let report: Awaited<ReturnType<typeof verifyFlintPortableContracts>>;

Given("the checked Flint portable contract is verified", async function () {
  report = await verifyFlintPortableContracts();
  assert.equal(report.verdict, "pass");
});

Then(
  "the default Flint surface contains no machine-specific paths or silent live skips",
  function () {
    assert.equal(report.checks.portableRepository.machineSpecificPaths, 0);
    assert.equal(report.checks.portableRepository.silentLiveSkips, 0);
  },
);

Then("client examples contain no service-role credential", function () {
  assert.equal(report.checks.clientSecrets.exposedCredentials, 0);
});

Then("watchEntities and mutateEntity remain the consumed realtime methods", function () {
  assert.deepEqual(report.checks.realtime.methods, ["watchEntities", "mutateEntity"]);
});

Then(
  "production issuer, tenant equality, kid, JWKS, role, and key separation are required",
  function () {
    assert.equal(contract.security.issuer.productionRequired, true);
    assert.equal(contract.security.tenant.publishMustMatchChannel, true);
    assert.equal(contract.security.tenant.subscribeDropsForeignTenant, true);
    assert.equal(contract.security.tokenHeader.asymmetricKidRequired, true);
    assert.equal(contract.security.jwks.symmetricKeysPublished, false);
    assert.equal(contract.security.keySeparation.serviceRoleServerOnly, true);
  },
);

Then("RSA JWKs contain standard modulus and exponent members", function () {
  assert.deepEqual(contract.security.jwks.rsaStandardMembers, ["n", "e"]);
  assert.equal(contract.security.jwks.rsaStrictConsumerCompatible, true);
});

Then("the remaining EC strict-consumer caveat names the missing coordinates", function () {
  assert.equal(contract.security.jwks.ecStrictConsumerCompatible, false);
  assert.deepEqual(contract.security.jwks.ecMissingStandardMembers, ["crv", "x", "y"]);
});

Then(
  "plan apply status and DDL inspection require typed specs and a reviewed hash",
  function () {
    assert.deepEqual(contract.provisioning.routes, ["plan", "apply", "status", "ddl"]);
    assert.equal(contract.provisioning.typedJsonOnly, true);
    assert.equal(contract.provisioning.rawSqlAccepted, false);
    assert.equal(contract.provisioning.planHashRequired, true);
  },
);

Then(
  "service-role authorization RLS audit transactions and restart semantics are required",
  function () {
    for (const field of [
      "serviceRoleOnly",
      "enableRls",
      "forceRls",
      "perVerbTenantPolicies",
      "auditLedger",
      "singleTransaction",
      "restartRequiredForNewRestRoutes",
    ]) {
      assert.equal(contract.provisioning[field], true, field);
    }
  },
);

Then("no Prometheus Forge provisioning adapter is claimed", function () {
  assert.equal(contract.provisioning.prometheusForgeAdapterImplemented, false);
});

Then("the portable run records external source verification as not requested", function () {
  assert.equal(report.checks.externalSources.status, "not-requested");
  assert.equal(report.checks.externalSources.disposition, "explicit-opt-in");
});

Then("every external source file has a pinned revision and SHA-256 digest", function () {
  for (const source of Object.values(contract.externalSources) as Array<{
    revision: string;
    files: Record<string, string>;
  }>) {
    assert.match(source.revision, /^[a-f0-9]{40}$/);
    for (const hash of Object.values(source.files)) assert.match(hash, /^[a-f0-9]{64}$/);
  }
});

Then("Flint realtime and security coverage are implemented", function () {
  assert.equal(report.checks.documentation.coverageEntries, 2);
  assert.equal(report.checks.documentation.status, "pass");
});

Then("the existing Flint runtime exports remain in the public ledger", function () {
  assert.deepEqual(report.checks.documentation.runtimeExports, [
    "createFlintAdapter",
    "publishFlintMutation",
  ]);
  assert.equal(report.checks.documentation.runtimeLedgerChanged, false);
});

Then(
  "the skills and release guide preserve security and provisioning exclusions",
  function () {
    assert.equal(report.checks.documentation.documentedFiles, 7);
    assert.equal(contract.provisioning.prometheusForgeAdapterImplemented, false);
    assert.equal(contract.security.keySeparation.serviceRoleServerOnly, true);
  },
);
