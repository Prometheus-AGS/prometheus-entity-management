import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const siteRoot = join(root, "site");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const MIGRATION_PAGES = ["v2-to-v3", "alpha-to-stable", "compatibility-policy"];
const OPERATIONS_PAGES = [
  "release-notes",
  "release-runbook",
  "security",
  "performance",
  "testing",
  "deployment",
  "troubleshooting",
  "faq",
  "contributing",
  "skills-usage",
];

const MIGRATION_SECTIONS = {
  "v2-to-v3": [
    "## Who this affects",
    "## Breaking changes",
    "## Core store access",
    "## React hook import",
    "## SSR isolation",
    "## Sync status readers",
    "## React presentation types",
    "## Upgrade validation fixtures",
  ],
  "alpha-to-stable": [
    "## Who this affects",
    "## Breaking changes",
    "## A2UI package boundary",
    "## A2A protocol surface",
    "## Binding peer policy",
    "## Release candidate versions",
    "## Upgrade validation fixtures",
  ],
};

// Canonical 2.x → 3.0 breaking changes: [previous tokens, current tokens].
const V2_BREAKING = [
  [["useGraphStore.getState()"], ["graphStore.getState()"]],
  [["useGraphStore(selector)"], ["useGraphStore(selector)"]],
  [["implicit global store"], ["createGraphStore()"]],
  [["useGraphSyncStatus()"], ["getGraphSyncStatus()"]],
  [["presentation types imported from core"], ["React package"]],
];

// Canonical alpha → stable breaking changes.
const ALPHA_BREAKING = [
  [["@prometheus-ags/a2ui-react` root"], ["@prometheus-ags/a2ui-react/ag-ui"]],
  [["/.well-known/agent.json"], ["/.well-known/agent-card.json"]],
  [["tasks/send`"], ["SendMessage"]],
  [["tasks/sendSubscribe"], ["SendStreamingMessage"]],
  [["tasks/get"], ["GetTask"]],
  [["tasks/cancel"], ["CancelTask"]],
  [["GraphMutationPart"], ["PROMETHEUS_GRAPH_EXTENSION_URI"]],
  [["root compatibility symbols"], ["./legacy"]],
  [["alpha prerelease"], ["3.0.0-rc.N"]],
];

const FIXTURES = [
  {
    file: "core-graph-store.ts",
    tokens: ["graphStore", "createGraphStore"],
    documentedIn: "v2-to-v3",
  },
  {
    file: "react-hook-entry.tsx",
    tokens: ["useGraphStore", "@prometheus-ags/prometheus-entity-management"],
    documentedIn: "v2-to-v3",
  },
  {
    file: "sync-status-non-react.ts",
    tokens: ["getGraphSyncStatus", "graphSyncStatusStore"],
    documentedIn: "v2-to-v3",
  },
  {
    file: "react-table-types.tsx",
    tokens: ["actionsColumn", "EmptyState"],
    documentedIn: "v2-to-v3",
  },
  {
    file: "a2ui-ag-ui-subpath.ts",
    tokens: ["@prometheus-ags/a2ui-react/ag-ui", "EntityChat"],
    documentedIn: "alpha-to-stable",
  },
  {
    file: "a2a-official-v1.ts",
    tokens: ["AGENT_CARD_PATH", "createA2AServer"],
    documentedIn: "alpha-to-stable",
  },
];

function page(dir, slug) {
  return readFileSync(join(siteRoot, "docs", dir, `${slug}.mdx`), "utf8");
}

test("the migration/operations file surface exists", () => {
  for (const slug of MIGRATION_PAGES) {
    assert.equal(existsSync(join(siteRoot, "docs/migration", `${slug}.mdx`)), true, `missing migration/${slug}`);
  }
  for (const slug of OPERATIONS_PAGES) {
    assert.equal(existsSync(join(siteRoot, "docs/operations", `${slug}.mdx`)), true, `missing operations/${slug}`);
  }
});

test("every page carries title + description front matter", () => {
  const files = [
    ...MIGRATION_PAGES.map((s) => join(siteRoot, "docs/migration", `${s}.mdx`)),
    ...OPERATIONS_PAGES.map((s) => join(siteRoot, "docs/operations", `${s}.mdx`)),
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.match(text, /^---\n[\s\S]*?title: .+[\s\S]*?description: .+[\s\S]*?---\n/,
      `${file.slice(root.length + 1)} missing front matter`);
  }
});

test("migration guides carry the full section contract", () => {
  for (const [slug, sections] of Object.entries(MIGRATION_SECTIONS)) {
    const text = page("migration", slug);
    for (const section of sections) {
      assert.ok(text.includes(section), `${slug} missing section "${section}"`);
    }
  }
});

test("every 2.x breaking change has before/after guidance", () => {
  const text = page("migration", "v2-to-v3");
  assert.ok(text.includes("**Before (2.x):**"), "v2-to-v3 missing before marker");
  assert.ok(text.includes("**After (3.0):**"), "v2-to-v3 missing after marker");
  for (const [previous, current] of V2_BREAKING) {
    for (const token of [...previous, ...current]) {
      assert.ok(text.includes(token), `v2-to-v3 missing breaking-change token "${token}"`);
    }
  }
});

test("every alpha breaking change has before/after guidance", () => {
  const text = page("migration", "alpha-to-stable");
  assert.ok(text.includes("**Before (alpha):**"), "alpha-to-stable missing before marker");
  assert.ok(text.includes("**After (stable 3.0):**"), "alpha-to-stable missing after marker");
  for (const [previous, current] of ALPHA_BREAKING) {
    for (const token of [...previous, ...current]) {
      assert.ok(text.includes(token), `alpha-to-stable missing breaking-change token "${token}"`);
    }
  }
});

test("upgrade validation fixtures exist and are referenced by the guides", () => {
  for (const { file, tokens, documentedIn } of FIXTURES) {
    const fixturePath = join(root, "tests/release/fixtures/upgrade", file);
    assert.equal(existsSync(fixturePath), true, `missing fixture ${file}`);
    const fixture = readFileSync(fixturePath, "utf8");
    for (const token of tokens) {
      assert.ok(fixture.includes(token), `fixture ${file} missing token "${token}"`);
    }
    const guide = page("migration", documentedIn);
    assert.ok(guide.includes(`tests/release/fixtures/upgrade/${file}`),
      `${documentedIn} must reference fixture ${file}`);
  }
});

test("the security page covers tenant boundaries and secret handling", () => {
  const text = page("operations", "security");
  for (const marker of [
    "## Tenant boundaries",
    "## Secret and key handling",
    "anon key",
    "Row Level Security",
    "default-deny",
    "OIDC",
    "advisory",
  ]) {
    assert.ok(text.includes(marker), `security page missing "${marker}"`);
  }
});

test("release/rollback/partial-publish procedures match the automation", () => {
  const runbook = page("operations", "release-runbook");
  for (const command of ["release:rc:plan", "release:rc:rehearse", "release:rc:stage"]) {
    assert.ok(runbook.includes(command), `runbook missing ${command}`);
    assert.ok(rootPkg.scripts[command], `root scripts missing ${command}`);
  }
  const workflow = readFileSync(join(root, ".github/workflows/publish.yml"), "utf8");
  assert.ok(workflow.includes("release:rc:rehearse"), "publish.yml must run the rehearsal");
  assert.ok(workflow.includes("release:rc:stage"), "publish.yml must run staging");
  assert.ok(workflow.includes("npm-rc"), "publish.yml must target the npm-rc environment");
  for (const state of ["declared", "packed", "verified", "classified", "submitted", "registry-verified", "complete"]) {
    assert.ok(runbook.includes(state), `runbook missing journal state "${state}"`);
  }
  assert.ok(runbook.includes("never overwrite"), "runbook must state the immutability recovery rule");
  assert.ok(runbook.includes("corrective"), "runbook must document corrective-version recovery");
  assert.ok(runbook.includes("next"), "runbook must document the next channel");
});

test("operations pages cover the remaining plan topics", () => {
  const expectations = {
    "release-notes": ["changelog", "next", "latest"],
    performance: ["staleTime", "16 ms", "IncrementalView"],
    testing: ["createGraphStore()", "pnpm run ci"],
    deployment: ["createGraphStore()", "Tauri", "Flutter"],
    troubleshooting: ["singleton", "SSR", "RealtimeManager"],
    faq: ["TanStack Query", "GraphQL"],
    contributing: ["pnpm", "Changesets"],
    "skills-usage": ["verify:skills", "refresh:exports", "plugin"],
  };
  for (const [slug, markers] of Object.entries(expectations)) {
    const text = page("operations", slug);
    for (const marker of markers) {
      assert.ok(text.includes(marker), `operations/${slug} missing "${marker}"`);
    }
  }
});

test("media carries alt text (no bare images)", () => {
  const offenders = [];
  for (const dir of ["docs/migration", "docs/operations"]) {
    for (const file of readdirSync(join(siteRoot, dir))) {
      const text = readFileSync(join(siteRoot, dir, file), "utf8");
      for (const m of text.matchAll(/!\[([^\]]*)\]\(/g)) {
        if (m[1].trim() === "") offenders.push(`${dir}/${file}: image without alt text`);
      }
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n"));
});

test("every page is reachable from operationsSidebar and the navbar", () => {
  const sidebars = readFileSync(join(siteRoot, "sidebars.js"), "utf8");
  for (const slug of MIGRATION_PAGES) {
    assert.ok(sidebars.includes(`'migration/${slug}'`), `sidebars.js missing migration/${slug}`);
  }
  for (const slug of OPERATIONS_PAGES) {
    assert.ok(sidebars.includes(`'operations/${slug}'`), `sidebars.js missing operations/${slug}`);
  }
  const config = readFileSync(join(siteRoot, "docusaurus.config.js"), "utf8");
  assert.ok(config.includes("operationsSidebar"), "navbar missing operationsSidebar entry");
});

test("root scripts expose the operations-migration gates", () => {
  for (const script of [
    "verify:docs-operations",
    "test:v3-docs-operations-migration",
    "bdd:docs-operations-migration",
  ]) {
    assert.ok(rootPkg.scripts[script], `missing root script ${script}`);
  }
});
