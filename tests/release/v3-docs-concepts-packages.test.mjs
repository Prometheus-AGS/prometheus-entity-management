import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const siteRoot = join(root, "site");
const guidesRoot = join(siteRoot, "docs/guides");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const CONCEPT_PAGES = [
  "normalized-entities",
  "id-only-lists",
  "queries-as-instructions",
  "layers-and-dataflow",
  "graph-patches-lists",
  "engine-swr-gc-suspense",
  "views-and-filtering",
  "crud-and-relations",
  "realtime-batching",
  "graphql-and-rest",
  "sync-and-persistence",
  "sdl-and-codegen",
  "devtools",
];
const BINDING_PAGES = [
  "react",
  "svelte",
  "solid",
  "alpine",
  "htmx",
  "web-components",
  "flutter",
  "tauri",
];
const PRACTICE_PAGES = [
  "recipes",
  "failure-modes",
  "performance",
  "security",
  "package-selection",
];

const ALL_GUIDE_DOC_IDS = [
  "guides/quickstart-react",
  ...CONCEPT_PAGES.map((p) => `guides/concepts/${p}`),
  ...BINDING_PAGES.map((p) => `guides/bindings/${p}`),
  ...PRACTICE_PAGES.map((p) => `guides/practices/${p}`),
];

/** Route → committed source file (generated API pages ensured lazily). */
function routeToFile(route) {
  const slug = route.replace(/^\/docs\//, "");
  for (const ext of [".mdx", ".md"]) {
    const file = join(siteRoot, "docs", `${slug}${ext}`);
    if (existsSync(file)) return file;
  }
  return null;
}

let generated = false;
/** Generated API pages are git-ignored; regenerate lazily on a fresh checkout. */
function ensureGenerated() {
  if (generated) return;
  if (!existsSync(join(siteRoot, "docs/api/npm"))) {
    execFileSync("node", ["scripts/generate-api-reference.mjs", "--skip-artifacts"], {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: "inherit",
    });
  }
  generated = true;
}

function* walkGuides(dir = guidesRoot) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkGuides(full);
    else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) yield full;
  }
}

test("the guides file surface exists (27 hand-authored pages)", () => {
  assert.equal(existsSync(join(siteRoot, "capability-map.json")), true, "missing capability map");
  const files = [...walkGuides()];
  assert.equal(files.length, 27, `expected 27 guide pages, found ${files.length}`);
  for (const docId of ALL_GUIDE_DOC_IDS) {
    assert.equal(
      existsSync(join(siteRoot, "docs", `${docId}.mdx`)),
      true,
      `missing ${docId}.mdx`,
    );
  }
});

test("every guide page carries title + description front matter", () => {
  for (const file of walkGuides()) {
    const text = readFileSync(file, "utf8");
    assert.match(text, /^---\n[\s\S]*?title: .+[\s\S]*?description: .+[\s\S]*?---\n/,
      `${file.slice(root.length + 1)} missing title/description front matter`);
  }
});

test("every guide page is reachable from guidesSidebar", () => {
  const sidebars = readFileSync(join(siteRoot, "sidebars.js"), "utf8");
  assert.ok(sidebars.includes("guidesSidebar"), "guidesSidebar missing from sidebars.js");
  for (const docId of ALL_GUIDE_DOC_IDS) {
    assert.ok(sidebars.includes(`'${docId}'`), `sidebars.js missing '${docId}'`);
  }
  const config = readFileSync(join(siteRoot, "docusaurus.config.js"), "utf8");
  assert.ok(config.includes("guidesSidebar"), "navbar must include the Guides section");
});

test("capability map routes exist and cover every guide page", () => {
  ensureGenerated();
  const map = JSON.parse(readFileSync(join(siteRoot, "capability-map.json"), "utf8"));
  assert.equal(map.version, 1);
  assert.ok(Array.isArray(map.capabilities) && map.capabilities.length >= 20,
    "capability map must cover the stable capability set");

  const referenced = new Set();
  for (const entry of map.capabilities) {
    for (const key of ["concept", "api", "example"]) {
      const route = entry[key];
      assert.ok(typeof route === "string" && route.startsWith("/docs/"),
        `${entry.capability}.${key} must be a /docs/ route`);
      const file = routeToFile(route.split("#")[0]);
      assert.ok(file, `${entry.capability}.${key} route ${route} has no source page`);
    }
    referenced.add(entry.concept);
  }

  // No orphan pages: every committed guide is referenced by a capability.
  for (const docId of ALL_GUIDE_DOC_IDS) {
    assert.ok(
      referenced.has(`/docs/${docId}`),
      `guide page ${docId} is not referenced by any capability`,
    );
  }
});

test("no guide prescribes hooks or components calling fetch/APIs directly", () => {
  const BAD_PATTERNS = [
    /Hooks?\s*(?:→|->)\s*\(?fetch/i,
    /hooks?\s+call\s+(?:the\s+)?(?:REST|GraphQL|API)/i,
    /components?\s+call\s+(?:the\s+)?(?:REST|GraphQL|API)/i,
  ];
  const offenders = [];
  for (const file of walkGuides()) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (/must not|never|except through|do not|don't/i.test(line)) continue;
      for (const re of BAD_PATTERNS) {
        if (re.test(line)) offenders.push(`${file.slice(root.length + 1)}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `data-flow language violations:\n${offenders.join("\n")}`);
});

test("install instructions use pnpm from the registry only", () => {
  const offenders = [];
  const BASH_FENCE_RE = /```bash\n(.*?)```/gs;
  for (const file of walkGuides()) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(BASH_FENCE_RE)) {
      for (const line of match[1].split("\n")) {
        if (/\bnpm\s+(install|i|add)\b|\byarn\s+add\b/.test(line)) {
          offenders.push(`${file.slice(root.length + 1)}: non-pnpm install: ${line.trim()}`);
        }
        if (/pnpm\s+add\s+.*(?:file:|link:|workspace:)/.test(line)) {
          offenders.push(`${file.slice(root.length + 1)}: local-protocol install: ${line.trim()}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `install-rule violations:\n${offenders.join("\n")}`);
});

test("root scripts expose the concepts-packages gates", () => {
  for (const script of [
    "verify:docs-snippets",
    "verify:docs-concepts",
    "test:v3-docs-concepts-packages",
    "bdd:docs-concepts-packages",
  ]) {
    assert.ok(rootPkg.scripts[script], `missing root script ${script}`);
  }
});

test("the docs snippet harness is parameterized for the site docs root", () => {
  const script = readFileSync(join(root, "scripts/verify-skills-snippets.mjs"), "utf8");
  for (const flag of ["--root", "--ext", "--skip", "--all-packages"]) {
    assert.ok(script.includes(flag), `verify-skills-snippets.mjs missing ${flag} support`);
  }
  assert.ok(
    rootPkg.scripts["verify:docs-snippets"].includes("--root site/docs"),
    "verify:docs-snippets must target site/docs",
  );
});
