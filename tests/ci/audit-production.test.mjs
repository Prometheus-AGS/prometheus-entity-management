import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAuditPolicy, readAdvisoryPolicy, runProductionAudit } from "../../scripts/audit-production.mjs";

const basePolicy = { threshold: ["critical", "high"], acceptedAdvisories: [] };

function report(advisories, vulnerabilities = {}) {
  return { advisories, metadata: { dependencies: 10, vulnerabilities } };
}

function advisory(id, severity = "high") {
  return {
    id,
    severity,
    module_name: `package-${id}`,
    title: `Advisory ${id}`,
    findings: [{ paths: [`app>package-${id}`, `app>package-${id}`] }],
  };
}

test("undispositioned critical and high production advisories fail closed", () => {
  const result = evaluateAuditPolicy(
    report({ "1": advisory(1, "critical"), "2": advisory(2, "high") }, { critical: 1, high: 1 }),
    basePolicy,
    "2026-08-01",
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.undispositioned.map(({ id }) => id), [1, 2]);
  assert.match(result.errors.join("\n"), /Critical\/high production advisories must be remediated/);
  assert.match(result.errors.join("\n"), /paths: app>package-1/);
});

test("a complete, active, time-bounded acceptance can disposition a blocking advisory", () => {
  const result = evaluateAuditPolicy(
    report({ "3": advisory(3) }, { high: 1 }),
    {
      ...basePolicy,
      acceptedAdvisories: [
        {
          id: 3,
          owner: "security@example.test",
          rationale: "Upstream fix is scheduled and the affected feature is disabled in production.",
          expiresOn: "2026-08-31",
        },
      ],
    },
    "2026-08-01",
  );
  assert.equal(result.ok, true);
  assert.equal(result.summary.acceptedBlockingAdvisories, 1);
  assert.equal(result.undispositioned.length, 0);
});

test("missing, malformed, expired, and stale acceptances fail policy evaluation", () => {
  const result = evaluateAuditPolicy(
    report({ "4": advisory(4), "5": advisory(5), "6": advisory(6) }, { high: 3 }),
    {
      ...basePolicy,
      acceptedAdvisories: [
        { id: 4, owner: "", rationale: "Missing owner", expiresOn: "2026-08-31" },
        { id: 5, owner: "owner", rationale: "Malformed date", expiresOn: "August 31" },
        { id: 6, owner: "owner", rationale: "Expired exception", expiresOn: "2026-07-31" },
        { id: 7, owner: "owner", rationale: "No longer active", expiresOn: "2026-08-31" },
      ],
    },
    "2026-08-01",
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.invalidAcceptances.map(({ id }) => id), [4]);
  assert.deepEqual(result.expiredAcceptances.map(({ id }) => id), [6]);
  assert.deepEqual(result.staleAcceptances.map(({ id }) => id), [7]);
  assert.match(result.errors.join("\n"), /invalid expiration date/);
});

test("lower severities remain visible but do not block the configured threshold", () => {
  const result = evaluateAuditPolicy(
    report({ "8": advisory(8, "moderate"), "9": advisory(9, "low") }, { moderate: 1, low: 1 }),
    basePolicy,
    "2026-08-01",
  );
  assert.equal(result.ok, true);
  assert.equal(result.advisories.length, 2);
  assert.deepEqual(result.summary.vulnerabilities, { moderate: 1, low: 1 });
});

test("the checked-in policy has no stale exception and the current production graph passes", () => {
  const policy = readAdvisoryPolicy();
  assert.deepEqual(policy.acceptedAdvisories, []);
  const result = runProductionAudit({ policy, today: "2026-08-01" });
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.summary.blockingAdvisories, 0);
});
