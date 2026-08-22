import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const skillsRoot = join(root, "prometheus-entity-skills");
const referencesDir = join(skillsRoot, "_shared", "references");
const rootScripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;

const REQUIRED_FILES = [
  "prometheus-entity-skills/SKILLS.md",
  "scripts/skills-package-registry.mjs",
  "scripts/refresh-exports-ledger.mjs",
  "scripts/verify-skills-exports.mjs",
  "scripts/verify-skills-snippets.mjs",
  "scripts/verify-skills-ecosystem.mjs",
  "prometheus-entity-skills/_shared/references/package-selection.md",
  "prometheus-entity-skills/_shared/references/framework-bindings.md",
  "prometheus-entity-skills/_shared/references/sdl-and-rust-tooling.md",
  "prometheus-entity-skills/_shared/references/examples-gallery.md",
  "prometheus-entity-skills/_shared/references/ecosystem-claims.json",
];

const NPM_LEDGERS = [
  "library-exports.json",
  "core-library-exports.json",
  "sync-library-exports.json",
  "a2ui-library-exports.json",
  "a2a-library-exports.json",
  "tauri-library-exports.json",
  "svelte-library-exports.json",
  "solid-library-exports.json",
  "alpine-library-exports.json",
  "htmx-library-exports.json",
  "web-components-library-exports.json",
  "sdl-library-exports.json",
  "dart-library-exports.json",
];

function* walkMarkdown(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walkMarkdown(full);
    else if (entry.endsWith(".md")) yield full;
  }
}

test("the skills-ecosystem file surface exists", () => {
  for (const file of REQUIRED_FILES) {
    assert.equal(existsSync(join(root, file)), true, `missing ${file}`);
  }
});

test("every public npm package plus Dart has a registered export ledger", () => {
  const registry = readFileSync(join(root, "scripts/skills-package-registry.mjs"), "utf8");
  for (const ledger of NPM_LEDGERS) {
    assert.equal(
      existsSync(join(referencesDir, ledger)),
      true,
      `missing ledger ${ledger}`,
    );
  }
  // The registry covers every ledger-driven npm package (tauri/dart keep their
  // dedicated contract scripts).
  for (const id of ["react", "sync", "a2ui", "a2a", "core", "svelte", "solid", "alpine", "htmx", "web-components", "sdl"]) {
    assert.ok(registry.includes(`id: "${id}"`), `registry missing ${id}`);
  }
  // Root gates chain every ledger-bearing package.
  for (const name of [
    "@prometheus-ags/prometheus-entity-management",
    "@prometheus-ags/entity-graph-core",
    "@prometheus-ags/entity-graph-sync",
    "@prometheus-ags/a2ui-react",
    "@prometheus-ags/entity-graph-a2a",
    "@prometheus-ags/entity-graph-tauri",
    "@prometheus-ags/entity-graph-svelte",
    "@prometheus-ags/entity-graph-solid",
    "@prometheus-ags/entity-graph-alpine",
    "@prometheus-ags/entity-graph-htmx",
    "@prometheus-ags/entity-graph-web-components",
    "@prometheus-ags/entity-graph-sdl",
  ]) {
    assert.ok(rootScripts["verify:skills"].includes(name), `verify:skills missing ${name}`);
    assert.ok(rootScripts["refresh:exports"].includes(name), `refresh:exports missing ${name}`);
  }
});

test("every repo-relative path referenced in the skills pack exists", () => {
  const PATH_RE = /`((?:packages|release|examples|docs|security|prometheus-entity-skills|scripts|tests)\/[^`\s]+?)`/g;
  const missing = [];
  for (const file of walkMarkdown(skillsRoot)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(PATH_RE)) {
      const candidate = match[1];
      if (candidate.includes("<")) continue; // placeholder segments like skills/<name>/
      if (candidate.includes("*")) {
        // Glob references: the parent directory must exist.
        const parent = join(root, candidate.slice(0, candidate.indexOf("*")));
        assert.equal(existsSync(parent.slice(0, parent.lastIndexOf("/") + 1) || parent), true, `${file}: bad glob ${candidate}`);
        continue;
      }
      // Plugin docs reference plugin-relative paths (e.g. scripts/state-init.sh
      // inside the plugin folder); accept repo-root or any ancestor of the
      // referencing file up to the skills pack root.
      if (existsSync(join(root, candidate))) continue;
      let dir = join(file, "..");
      let found = false;
      while (dir.startsWith(skillsRoot) || dir === skillsRoot) {
        if (existsSync(join(dir, candidate))) { found = true; break; }
        const parent = join(dir, "..");
        if (parent === dir || !parent.startsWith(skillsRoot)) break;
        dir = parent;
      }
      if (!found) {
        missing.push(`${file.slice(root.length + 1)} → ${candidate}`);
      }
    }
  }
  assert.deepEqual(missing, [], `missing referenced paths:\n${missing.join("\n")}`);
});

test("every ecosystem claim is backed by existing evidence and a real gate", () => {
  const claims = JSON.parse(readFileSync(join(referencesDir, "ecosystem-claims.json"), "utf8"));
  assert.ok(claims.claims.length >= 15, "claims map should cover the full surface");
  for (const claim of claims.claims) {
    assert.ok(claim.evidence.length >= 1, `${claim.id}: no evidence`);
    for (const evidencePath of claim.evidence) {
      assert.equal(existsSync(join(root, evidencePath)), true, `${claim.id}: missing ${evidencePath}`);
    }
    if (claim.gate) {
      assert.ok(rootScripts[claim.gate], `${claim.id}: root script ${claim.gate} missing`);
    } else {
      assert.ok(claim.gateCommand, `${claim.id}: needs gate or gateCommand`);
    }
  }
});

test("the bundle index covers the full 3.0 surface", () => {
  const index = readFileSync(join(skillsRoot, "SKILLS.md"), "utf8");
  const required = [
    "@prometheus-ags/entity-graph-core",
    "@prometheus-ags/prometheus-entity-management",
    "@prometheus-ags/entity-graph-svelte",
    "@prometheus-ags/entity-graph-solid",
    "@prometheus-ags/entity-graph-alpine",
    "@prometheus-ags/entity-graph-htmx",
    "@prometheus-ags/entity-graph-web-components",
    "@prometheus-ags/entity-graph-sync",
    "@prometheus-ags/a2ui-react",
    "@prometheus-ags/entity-graph-a2a",
    "@prometheus-ags/entity-graph-tauri",
    "@prometheus-ags/entity-graph-sdl",
    "entity_graph_flutter",
    "entity-graph-cli",
    "entity-graph-mcp",
    "package-selection.md",
    "framework-bindings.md",
    "sdl-and-rust-tooling.md",
    "examples-gallery.md",
    "ecosystem-claims.json",
    "docs/flint-integration.md",
  ];
  for (const marker of required) {
    assert.ok(index.includes(marker), `SKILLS.md missing ${marker}`);
  }
});

test("no skill doc prescribes hooks or components calling fetch/APIs directly", () => {
  const offenders = [];
  const BAD_PATTERNS = [
    /Hooks?\s*(?:→|->)\s*\(?fetch/i, // "Hooks → (fetch)" arrow diagrams
    /hooks?\s+call\s+(?:the\s+)?(?:REST|GraphQL|API)/i, // "hooks call the API"
  ];
  for (const file of walkMarkdown(skillsRoot)) {
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      const isProhibition = /must not|never|except through|do not/i.test(line);
      if (isProhibition) continue;
      for (const re of BAD_PATTERNS) {
        if (re.test(line)) offenders.push(`${file.slice(root.length + 1)}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `data-flow language violations:\n${offenders.join("\n")}`);
});

test("public snippets exist and the harness covers them", () => {
  const FENCE_RE = /```tsx?\n/g;
  let count = 0;
  for (const file of walkMarkdown(skillsRoot)) {
    count += (readFileSync(file, "utf8").match(FENCE_RE) ?? []).length;
  }
  assert.ok(count >= 19, `expected at least 19 public snippets, found ${count}`);
});
