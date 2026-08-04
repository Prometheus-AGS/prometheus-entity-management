import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { verifyTauriUniversalExample } from "../../scripts/verify-tauri-universal-example.mjs";

const root = process.cwd();

test("the universal Tauri source contract is complete and honest about platform evidence", () => {
  const report = verifyTauriUniversalExample({ root });
  assert.equal(report.status, "pass");
  assert.equal(report.countsAsPlatformBuildEvidence, false);
  assert.deepEqual(
    report.checks.map(({ id }) => id),
    ["workspace", "native-host", "configuration", "capability", "layering", "offline-runtime", "platform-shells"],
  );
});

test("the verifier rejects a capability that grants destructive clear", () => {
  const path = "examples/tauri-universal/src-tauri/capabilities/universal-main.json";
  const capability = JSON.parse(readFileSync(path, "utf8"));
  capability.permissions.push("entity-graph-tauri:allow-graph-clear");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, JSON.stringify(capability)]]),
      }),
    /must remain withheld: entity-graph-tauri:allow-graph-clear/,
  );
});

test("the verifier rejects direct graph access from a component", () => {
  const path = "examples/tauri-universal/src/features/platform/components/platform-dashboard.tsx";
  const source = readFileSync(path, "utf8");
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        overrides: new Map([[path, `${source}\nvoid useGraphStore;\n`]]),
      }),
    /component boundary violation/,
  );
});

test("the verifier rejects a missing generated mobile shell", () => {
  assert.throws(
    () =>
      verifyTauriUniversalExample({
        root,
        missingPaths: new Set([
          "examples/tauri-universal/src-tauri/gen/android/app/src/main/AndroidManifest.xml",
        ]),
      }),
    /generated platform artifact is missing/,
  );
});
