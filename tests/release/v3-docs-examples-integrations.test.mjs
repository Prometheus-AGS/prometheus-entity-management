import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const siteRoot = join(root, "site");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const TUTORIALS = [
  { slug: "vite-react19", source: "examples/vite-app", gate: "verify:vite-react19" },
  { slug: "nextjs-app-router", source: "examples/nextjs-app", gate: "verify:nextjs-app-router" },
  { slug: "agentic-a2ui", source: "examples/agentic-a2ui", gate: "verify:agentic-a2ui" },
  { slug: "flutter-riverpod", source: "examples/flutter-riverpod", gate: "verify:flutter-riverpod-a2ui" },
  { slug: "tauri-universal", source: "examples/tauri-app", gate: "verify:tauri-universal" },
];
const INTEGRATIONS = ["websocket", "supabase", "graphql", "pglite-loro", "a2a-a2ui", "flint"];

const TUTORIAL_SECTIONS = [
  "## Architecture",
  "## Setup",
  "## Feature scenarios",
  "## Test commands",
  "## Deployment and platform notes",
  "## Troubleshooting",
];

function scenarioIds() {
  const contract = JSON.parse(
    readFileSync(join(root, "examples/shared/scenario-contract.json"), "utf8"),
  );
  return new Set(contract.scenarios.map((s) => s.id));
}

test("the examples/integrations file surface exists", () => {
  for (const { slug } of TUTORIALS) {
    assert.equal(existsSync(join(siteRoot, "docs/examples", `${slug}.mdx`)), true, `missing tutorial ${slug}`);
  }
  for (const slug of INTEGRATIONS) {
    assert.equal(existsSync(join(siteRoot, "docs/integrations", `${slug}.mdx`)), true, `missing integration ${slug}`);
  }
});

test("every page carries title + description front matter", () => {
  const files = [
    ...TUTORIALS.map(({ slug }) => join(siteRoot, "docs/examples", `${slug}.mdx`)),
    ...INTEGRATIONS.map((slug) => join(siteRoot, "docs/integrations", `${slug}.mdx`)),
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.match(text, /^---\n[\s\S]*?title: .+[\s\S]*?description: .+[\s\S]*?---\n/,
      `${file.slice(root.length + 1)} missing front matter`);
  }
});

test("tutorials carry the full content contract", () => {
  for (const { slug } of TUTORIALS) {
    const text = readFileSync(join(siteRoot, "docs/examples", `${slug}.mdx`), "utf8");
    for (const section of TUTORIAL_SECTIONS) {
      assert.ok(text.includes(section), `${slug} missing section "${section}"`);
    }
  }
});

test("tutorial scenario tables reference valid coverage scenario IDs", () => {
  const valid = scenarioIds();
  for (const { slug } of TUTORIALS) {
    const text = readFileSync(join(siteRoot, "docs/examples", `${slug}.mdx`), "utf8");
    const ids = [...text.matchAll(/`(example\.[a-z0-9._-]+)`/g)].map((m) => m[1]);
    assert.ok(ids.length > 0, `${slug} must annotate scenarios with coverage IDs`);
    for (const id of ids) {
      assert.ok(valid.has(id), `${slug} references unknown scenario ID ${id}`);
    }
  }
});

test("tutorial gates exist as root scripts and CI exercises the suite", () => {
  for (const { slug, gate } of TUTORIALS) {
    assert.ok(rootPkg.scripts[gate], `${slug} gate ${gate} missing from root scripts`);
    const text = readFileSync(join(siteRoot, "docs/examples", `${slug}.mdx`), "utf8");
    assert.ok(text.includes(`pnpm run ${gate}`), `${slug} must document its gate command`);
  }
  const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
  assert.ok(ci.includes("ci:test"), "ci.yml must run the test gate that includes release tests");
});

test("runnable-source links resolve to real example directories", () => {
  for (const { slug, source } of TUTORIALS) {
    const text = readFileSync(join(siteRoot, "docs/examples", `${slug}.mdx`), "utf8");
    assert.ok(text.includes(`/tree/main/${source}`), `${slug} must link runnable source ${source}`);
    assert.equal(existsSync(join(root, source, "package.json")) || existsSync(join(root, source, "pubspec.yaml")),
      true, `${source} is not a runnable example directory`);
  }
});

test("integration guides separate deterministic demo mode from live credentials", () => {
  for (const slug of INTEGRATIONS) {
    const text = readFileSync(join(siteRoot, "docs/integrations", `${slug}.mdx`), "utf8");
    assert.ok(text.includes("Deterministic demo mode"), `${slug} missing demo-mode separation`);
    assert.ok(/live/i.test(text), `${slug} missing live-credentials section`);
  }
});

test("media carries alt text (no bare images)", () => {
  const offenders = [];
  for (const dir of ["docs/examples", "docs/integrations"]) {
    for (const file of readdirSync(join(siteRoot, dir))) {
      const text = readFileSync(join(siteRoot, dir, file), "utf8");
      for (const m of text.matchAll(/!\[([^\]]*)\]\(/g)) {
        if (m[1].trim() === "") offenders.push(`${dir}/${file}: image without alt text`);
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n"));
});

test("every page is reachable from examplesSidebar", () => {
  const sidebars = readFileSync(join(siteRoot, "sidebars.js"), "utf8");
  for (const { slug } of TUTORIALS) {
    assert.ok(sidebars.includes(`'examples/${slug}'`), `sidebars.js missing examples/${slug}`);
  }
  for (const slug of INTEGRATIONS) {
    assert.ok(sidebars.includes(`'integrations/${slug}'`), `sidebars.js missing integrations/${slug}`);
  }
});

test("root scripts expose the examples-integrations gates", () => {
  for (const script of [
    "verify:docs-examples",
    "test:v3-docs-examples-integrations",
    "bdd:docs-examples-integrations",
  ]) {
    assert.ok(rootPkg.scripts[script], `missing root script ${script}`);
  }
});
