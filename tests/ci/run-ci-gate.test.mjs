import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import process from "node:process";
import test from "node:test";

import { configuredTimeout, gateDefinitions, runGate } from "../../scripts/run-ci-gate.mjs";

function withTimeoutEnvironment(value, callback) {
  const previous = process.env.CI_GATE_TIMEOUT_MS;
  if (value === undefined) delete process.env.CI_GATE_TIMEOUT_MS;
  else process.env.CI_GATE_TIMEOUT_MS = value;
  try {
    return callback();
  } finally {
    if (previous === undefined) delete process.env.CI_GATE_TIMEOUT_MS;
    else process.env.CI_GATE_TIMEOUT_MS = previous;
  }
}

test("the checked-in gate inventory is complete and every gate has a finite timeout", () => {
  assert.deepEqual(Object.keys(gateDefinitions), [
    "validate",
    "lint",
    "typecheck",
    "build",
    "test",
    "skills",
    "security",
  ]);
  for (const [name, definition] of Object.entries(gateDefinitions)) {
    assert.equal(Number.isSafeInteger(definition.timeoutMs), true, name);
    assert.ok(definition.timeoutMs > 0, name);
    assert.ok(definition.command.length >= 3, name);
  }
});

test("the aggregate test gate allows the cold multi-runtime BDD portfolio to finish", () => {
  assert.ok(gateDefinitions.test.timeoutMs >= 30 * 60_000);
  const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(workflow, /library-and-examples:\n\s+timeout-minutes: 60/);
});

test("timeout configuration accepts positive integers and rejects ambiguous values", () => {
  assert.equal(withTimeoutEnvironment(undefined, () => configuredTimeout(123)), 123);
  assert.equal(withTimeoutEnvironment("456", () => configuredTimeout(123)), 456);
  for (const invalid of ["0", "-1", "1.5", "not-a-number", ""]) {
    assert.throws(
      () => withTimeoutEnvironment(invalid, () => configuredTimeout(123)),
      /CI_GATE_TIMEOUT_MS must be a positive integer/,
      invalid,
    );
  }
});

test("unknown gates enumerate the supported names", () => {
  assert.throws(
    () => runGate("unknown"),
    /Unknown CI gate "unknown"\. Expected one of: validate, lint, typecheck, build, test, skills, security/,
  );
});

test("a successful custom gate reports its identity and duration", async () => {
  const result = await withTimeoutEnvironment(undefined, () =>
    runGate("unit-success", {
      command: [process.execPath, "-e", "process.exit(0)"],
      timeoutMs: 2_000,
    }),
  );
  assert.equal(result.name, "unit-success");
  assert.ok(result.durationMs >= 0);
});

test("a failing gate reports the responsible gate and exit code", async () => {
  await assert.rejects(
    withTimeoutEnvironment(undefined, () =>
      runGate("unit-failure", {
        command: [process.execPath, "-e", "process.exit(7)"],
        timeoutMs: 2_000,
      }),
    ),
    /CI gate unit-failure failed after \d+ms with code 7 and signal none/,
  );
});

test("a timed out gate reports its name, timeout, and command", async () => {
  const definition = {
    command: [process.execPath, "-e", "setInterval(() => {}, 1000)"],
    timeoutMs: 25,
  };
  await assert.rejects(
    withTimeoutEnvironment(undefined, () => runGate("unit-timeout", definition)),
    (error) => {
      assert.match(error.message, /CI gate unit-timeout timed out after 25ms/);
      assert.match(error.message, /command: .*setInterval/);
      return true;
    },
  );
});
