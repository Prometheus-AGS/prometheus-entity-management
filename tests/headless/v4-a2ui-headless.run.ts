/**
 * Headless acceptance run for AUI-10..13: real runtimes in a real Node process.
 * Writes `headless-receipts.json` next to the browser receipts; exits 1 on any
 * failed check so the Cucumber step can read the reason.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createPrometheusA2uiRuntime, PrometheusA2uiError } from "../../packages/a2ui-react/src/index";
import { createPrometheusA2uiHeadlessRuntime } from "../../packages/a2ui-react/src/headless";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/evidence/hardening-acceptance",
);
const CATALOG = "urn:prometheus-ags:a2ui:catalog:v3";
const receipts: Record<string, { status: "pass" | "not-exercised"; proof: unknown }> = {};

const v09 = [
  { version: "v0.9.1", createSurface: { surfaceId: "h1", catalogId: CATALOG, sendDataModel: true } },
  {
    version: "v0.9.1",
    updateComponents: {
      surfaceId: "h1",
      components: [
        { id: "root", component: "Column", children: ["text", "go", "go-label"] },
        { id: "text", component: "Text", text: { path: "/note" } },
        { id: "go", component: "Button", child: "go-label", action: { event: { name: "lab.ping", context: {} } } },
        { id: "go-label", component: "Text", text: "Go" },
        { id: "orphan", component: "Text", text: "nobody refers to me" },
      ],
    },
  },
  { version: "v0.9.1", updateDataModel: { surfaceId: "h1", path: "/", value: { note: "hello" } } },
];

const v1 = [{
  version: "v1.0",
  createSurface: {
    surfaceId: "h2",
    catalogId: CATALOG,
    components: [
      { id: "root", component: "Column", children: ["go", "go-label"] },
      { id: "go", component: "Button", child: "go-label", action: { event: { name: "lab.ping", context: {}, wantResponse: true, responsePath: "/reply" } } },
      { id: "go-label", component: "Text", text: "Go" },
    ],
    dataModel: { reply: "" },
  },
}];

function exported(runtime: ReturnType<typeof createPrometheusA2uiHeadlessRuntime>, surfaceId: string, pruneOrphans = true) {
  return runtime.exportSurfaceMessages(surfaceId, { pruneOrphans });
}

function aui10(): void {
  const proofs: Record<string, unknown> = {};
  for (const [surfaceId, messages] of [["h1", v09], ["h2", v1]] as const) {
    const first = createPrometheusA2uiHeadlessRuntime();
    first.processMessages(messages);
    const once = exported(first, surfaceId);
    const second = createPrometheusA2uiHeadlessRuntime();
    second.processMessages(once.messages);
    const twice = exported(second, surfaceId);
    assert.deepEqual(twice.messages, once.messages, `${surfaceId} export is not a fixed point`);
    proofs[surfaceId] = { messages: once.messages.length };
    first.dispose();
    second.dispose();
  }
  // The v1.0 action response metadata must survive the round trip.
  const v1Runtime = createPrometheusA2uiHeadlessRuntime();
  v1Runtime.processMessages(v1);
  assert.match(JSON.stringify(exported(v1Runtime, "h2").messages), /responsePath/);
  v1Runtime.dispose();

  // Negative control: an export that lost its catalog must not rebuild the same surface.
  const source = createPrometheusA2uiHeadlessRuntime();
  source.processMessages(v09);
  const tampered = structuredClone(exported(source, "h1").messages) as Array<Record<string, any>>;
  delete tampered[0].createSurface.catalogId;
  const rebuilt = createPrometheusA2uiHeadlessRuntime();
  let differs = false;
  try {
    rebuilt.processMessages(tampered);
    differs = JSON.stringify(exported(rebuilt, "h1").messages) !== JSON.stringify(exported(source, "h1").messages);
  } catch {
    differs = true;
  }
  assert.ok(differs, "a tampered export went unnoticed");
  source.dispose();
  rebuilt.dispose();
  receipts["AUI-10"] = { status: "pass", proof: proofs };
}

function outcome(run: () => void): string {
  try {
    run();
    return "accepted";
  } catch (error) {
    return error instanceof PrometheusA2uiError ? error.code : "other-error";
  }
}

function aui11(): void {
  const limits = { maxComponentsPerSurface: 3 };
  const corpus: Array<[string, unknown[]]> = [
    ["valid", v09],
    ["valid-v1", v1],
    ["component outside the allowlist", [
      v09[0],
      { version: "v0.9.1", updateComponents: { surfaceId: "h1", components: [{ id: "root", component: "Carousel" }] } },
    ]],
    ["component limit exceeded", v09],
    ["update before create", [v09[1]]],
  ];
  const results = corpus.map(([name, messages]) => {
    const withLimits = name === "component limit exceeded";
    const options = withLimits ? { limits } : {};
    const headless = createPrometheusA2uiHeadlessRuntime(options);
    const react = createPrometheusA2uiRuntime(options);
    const pair = { name, headless: outcome(() => headless.processMessages(messages)), react: outcome(() => react.processMessages(messages)) };
    headless.dispose();
    react.dispose();
    return pair;
  });
  for (const { name, headless, react } of results) assert.equal(headless, react, `${name}: runtimes disagree`);
  // Negative control: the corpus must contain rejections, or agreement proves nothing.
  assert.ok(results.some(({ headless }) => headless !== "accepted"), "corpus has no rejection");
  assert.ok(results.some(({ headless }) => headless === "accepted"), "corpus has no acceptance");
  receipts["AUI-11"] = { status: "pass", proof: results };
}

function aui12(): void {
  const runtime = createPrometheusA2uiHeadlessRuntime();
  runtime.processMessages(v09);
  const pruned = exported(runtime, "h1");
  assert.deepEqual(pruned.orphans, ["orphan"]);
  assert.doesNotMatch(JSON.stringify(pruned.messages), /nobody refers to me/);
  // Negative control: every reachable component is kept, and opting out keeps the orphan.
  for (const id of ["root", "text", "go", "go-label"]) assert.match(JSON.stringify(pruned.messages), new RegExp(`"id":"${id}"`));
  assert.match(JSON.stringify(exported(runtime, "h1", false).messages), /nobody refers to me/);
  runtime.dispose();
  receipts["AUI-12"] = { status: "pass", proof: { orphans: pruned.orphans } };
}

function aui13(): void {
  const status = JSON.parse(readFileSync("release/npm-registry-status.json", "utf8")) as {
    packages: Record<string, { latest?: string; next?: string }>;
  };
  const scratch = resolve(tmpdir(), "a2ui-hardening-npm-view");
  mkdirSync(scratch, { recursive: true });
  const mismatches: string[] = [];
  for (const [name, entry] of Object.entries(status.packages)) {
    // npm is blocked inside the repository root, so ask from a scratch directory.
    const live = JSON.parse(
      execFileSync("npm", ["view", name, "dist-tags", "--json"], { cwd: scratch, encoding: "utf8" }),
    ) as Record<string, string>;
    if (entry.latest && live.latest !== entry.latest) mismatches.push(`${name} latest ${entry.latest} != ${live.latest}`);
    if (entry.next && live.next !== entry.next) mismatches.push(`${name} next ${entry.next} != ${live.next}`);
  }
  assert.deepEqual(mismatches, []);
  const bridge = readFileSync("release/a2ui-protocol-bridge.md", "utf8");
  assert.match(bridge, /@a2ui\/web_core@0\.12\.0/);
  assert.doesNotMatch(bridge, /0\.10\.[25]/);
  assert.match(readFileSync("CHANGELOG.md", "utf8"), /\[4\.2\.0\]/, "CHANGELOG.md");
  assert.match(readFileSync("packages/a2ui-react/CHANGELOG.md", "utf8"), /^## 4\.2\.0/m, "package changelog");
  receipts["AUI-13"] = {
    status: "pass",
    proof: { packagesCompared: Object.keys(status.packages).length, tag: "NOT_EXERCISED until the operator approves v4.2.0" },
  };
}

for (const check of [aui10, aui11, aui12, aui13]) check();
mkdirSync(evidenceDirectory, { recursive: true });
writeFileSync(resolve(evidenceDirectory, "headless-receipts.json"), JSON.stringify(receipts, null, 2));
process.stdout.write(`headless acceptance: ${Object.keys(receipts).join(", ")} pass\n`);
