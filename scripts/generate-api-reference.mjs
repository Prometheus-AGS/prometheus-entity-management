#!/usr/bin/env node
/**
 * generate-api-reference.mjs — multi-language API reference generator for
 * v3-docs-api-reference.
 *
 * What it does:
 *   1. Runs TypeDoc 0.28.20 once per publishable npm package (12 runs,
 *      explicit entry points incl. secondary exports) → one JSON model each.
 *   2. Enforces the doc-coverage policy against the 13 export ledgers:
 *      vanished stable exports fail; new undocumented exports fail; the
 *      baseline can only shrink (ratchet). `--write-baseline` regenerates
 *      site/api-docs-baseline.json.
 *   3. Renders deterministic MDX pages into site/docs/api/ plus per-package
 *      chooser pages into site/docs/packages/ and a generated sidebar file.
 *   4. Generates Dart (dart doc) and Rust (cargo doc) artifacts into
 *      site/static/api/ (skippable with --skip-artifacts).
 *
 * Usage:
 *   node scripts/generate-api-reference.mjs [--write-baseline] [--skip-artifacts]
 *   node scripts/generate-api-reference.mjs --report <path>
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const referencesDir = join(workspaceRoot, "prometheus-entity-skills/_shared/references");
const siteRoot = join(workspaceRoot, "site");
const baselinePath = join(siteRoot, "api-docs-baseline.json");
const generatedDocsRoot = join(siteRoot, "docs/api");
const chooserDocsRoot = join(siteRoot, "docs/packages");
const sidebarPath = join(siteRoot, "api-sidebar.generated.json");
const typedocBin = join(siteRoot, "node_modules/typedoc/bin/typedoc");
const repoBlobBase = "https://github.com/Prometheus-AGS/prometheus-entity-management/blob/main";

const args = process.argv.slice(2);
const writeBaseline = args.includes("--write-baseline");
const skipArtifacts = args.includes("--skip-artifacts");
const reportFlag = args.indexOf("--report");
const reportPath = reportFlag >= 0 ? args[reportFlag + 1] : null;

/** The 12 publishable npm packages: slug, directory, ledger, entry points. */
const NPM_PACKAGES = [
  { slug: "entity-graph-core", name: "@prometheus-ags/entity-graph-core", directory: "entity-graph-core", ledger: "core-library-exports.json", entries: ["src/index.ts", "src/devtools/index.ts"] },
  { slug: "prometheus-entity-management", name: "@prometheus-ags/prometheus-entity-management", directory: "entity-graph-react", ledger: "library-exports.json", entries: ["src/index.ts"] },
  { slug: "entity-graph-sync", name: "@prometheus-ags/entity-graph-sync", directory: "entity-graph-sync", ledger: "sync-library-exports.json", entries: ["src/index.ts"] },
  { slug: "entity-graph-svelte", name: "@prometheus-ags/entity-graph-svelte", directory: "entity-graph-svelte", ledger: "svelte-library-exports.json", entries: ["src/index.ts"] },
  { slug: "entity-graph-solid", name: "@prometheus-ags/entity-graph-solid", directory: "entity-graph-solid", ledger: "solid-library-exports.json", entries: ["src/index.ts"] },
  { slug: "entity-graph-alpine", name: "@prometheus-ags/entity-graph-alpine", directory: "entity-graph-alpine", ledger: "alpine-library-exports.json", entries: ["src/index.ts"] },
  { slug: "entity-graph-htmx", name: "@prometheus-ags/entity-graph-htmx", directory: "entity-graph-htmx", ledger: "htmx-library-exports.json", entries: ["src/index.ts"] },
  { slug: "entity-graph-web-components", name: "@prometheus-ags/entity-graph-web-components", directory: "entity-graph-web-components", ledger: "web-components-library-exports.json", entries: ["src/index.ts"] },
  { slug: "a2ui-react", name: "@prometheus-ags/a2ui-react", directory: "a2ui-react", ledger: "a2ui-library-exports.json", entries: ["src/index.ts", "src/ag-ui/index.ts"] },
  { slug: "entity-graph-a2a", name: "@prometheus-ags/entity-graph-a2a", directory: "entity-graph-a2a", ledger: "a2a-library-exports.json", entries: ["src/index.ts", "src/legacy/index.ts"] },
  { slug: "entity-graph-tauri", name: "@prometheus-ags/entity-graph-tauri", directory: "entity-graph-tauri", ledger: "tauri-library-exports.json", entries: ["src/index.ts"] },
  { slug: "entity-graph-sdl", name: "@prometheus-ags/entity-graph-sdl", directory: "entity-graph-sdl", ledger: "sdl-library-exports.json", entries: ["src/index.ts"] },
];

const RUST_CRATES = [
  { slug: "entity-graph-cli", manifest: "packages/entity-graph-cli/Cargo.toml" },
  { slug: "entity-graph-mcp", manifest: "packages/entity-graph-mcp/Cargo.toml" },
];

const KIND_LABELS = {
  8: "enum",
  32: "variable",
  64: "function",
  128: "class",
  256: "interface",
  2097152: "type alias",
};

const report = {
  schemaVersion: 1,
  change: "v3-docs-api-reference",
  generatedAt: new Date().toISOString(),
  packages: {},
  policy: { vanished: [], newUndocumented: [], tightenRequired: [] },
  artifacts: { dart: "skipped", rust: "skipped" },
  result: "pass",
};
const failures = [];
function fail(message) {
  failures.push(message);
  report.result = "fail";
}

// ── Type rendering ───────────────────────────────────────────────────────────
function typeToString(type, depth = 0) {
  if (!type || depth > 6) return "unknown";
  switch (type.type) {
    case "intrinsic":
      return type.name;
    case "literal":
      return JSON.stringify(type.value);
    case "reference": {
      const args = (type.typeArguments ?? []).map((t) => typeToString(t, depth + 1));
      return args.length > 0 ? `${type.name}<${args.join(", ")}>` : type.name;
    }
    case "array":
      return `${typeToString(type.elementType, depth + 1)}[]`;
    case "union":
      return type.types.map((t) => typeToString(t, depth + 1)).join(" | ");
    case "intersection":
      return type.types.map((t) => typeToString(t, depth + 1)).join(" & ");
    case "tuple":
      return `[${type.elements.map((t) => typeToString(t, depth + 1)).join(", ")}]`;
    case "typeOperator":
      return `${type.operator} ${typeToString(type.target, depth + 1)}`;
    case "indexedAccess":
      return `${typeToString(type.objectType, depth + 1)}[${typeToString(type.indexType, depth + 1)}]`;
    case "reflection": {
      const decl = type.declaration;
      if (!decl) return "{ … }";
      if (decl.signatures?.length) return signatureToString(decl.signatures[0], depth + 1, true);
      if (decl.children?.length) return "{ … }";
      return "{}";
    }
    case "predicate":
      return `asserts ${type.name}`;
    case "rest":
      return `...${typeToString(type.elementType, depth + 1)}`;
    case "optional":
      return `${typeToString(type.elementType, depth + 1)}?`;
    case "namedTupleMember":
      return `${type.name}: ${typeToString(type.element, depth + 1)}`;
    case "query":
      return `typeof ${typeToString(type.queryType, depth + 1)}`;
    default:
      return type.name ?? "unknown";
  }
}

function signatureToString(sig, depth = 0, arrow = false) {
  const typeParams = (sig.typeParameters ?? [])
    .map((tp) => (tp.type ? `${tp.name} extends ${typeToString(tp.type, depth + 1)}` : tp.name))
    .join(", ");
  const params = (sig.parameters ?? [])
    .map((p) => {
      const optional = p.flags?.isOptional ? "?" : "";
      const rest = p.flags?.isRest ? "..." : "";
      return `${rest}${p.name}${optional}: ${typeToString(p.type, depth + 1)}`;
    })
    .join(", ");
  const ret = typeToString(sig.type, depth + 1);
  const tp = typeParams ? `<${typeParams}>` : "";
  return arrow ? `${tp}(${params}) => ${ret}` : `${tp}(${params}): ${ret}`;
}

function renderSignature(symbol) {
  switch (symbol.kind) {
    case 64: {
      const sig = symbol.signatures?.[0];
      if (!sig) return `function ${symbol.name}(…);`;
      return `function ${symbol.name}${signatureToString(sig)};`;
    }
    case 32: {
      const kw = symbol.flags?.isConst === false ? "let" : "const";
      return `${kw} ${symbol.name}: ${typeToString(symbol.type)};`;
    }
    case 128: {
      const members = (symbol.children ?? []).filter((c) => c.kind === 2048 || c.kind === 1024).length;
      const ext = symbol.extendedTypes?.length
        ? ` extends ${symbol.extendedTypes.map((t) => typeToString(t)).join(", ")}`
        : "";
      return `class ${symbol.name}${ext} { /* ${members} members */ }`;
    }
    case 256: {
      const members = (symbol.children ?? []).length;
      const ext = symbol.extendedTypes?.length
        ? ` extends ${symbol.extendedTypes.map((t) => typeToString(t)).join(", ")}`
        : "";
      return `interface ${symbol.name}${ext} { /* ${members} members */ }`;
    }
    case 2097152:
      return `type ${symbol.name} = ${typeToString(symbol.type)};`;
    case 8: {
      const members = (symbol.children ?? []).map((c) => c.name).join(", ");
      return `enum ${symbol.name} { ${members} }`;
    }
    default:
      return `${KIND_LABELS[symbol.kind] ?? "symbol"} ${symbol.name}`;
  }
}

// ── MDX helpers ──────────────────────────────────────────────────────────────
function mdxEscape(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}

/** YAML-safe double-quoted scalar for generated front matter. */
function yamlQuote(text) {
  return `"${String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function commentText(comment) {
  if (!comment) return "";
  const parts = [];
  for (const part of comment.summary ?? []) {
    if (part.kind === "text" || part.kind === "code") parts.push(part.text);
    else if (part.kind === "inline-tag") parts.push(part.text ?? "");
  }
  return parts.join("").trim();
}

function anchorFor(name) {
  return name.toLowerCase().replace(/[^a-z0-9_$-]/g, "-");
}

// ── Step 1: TypeDoc models ───────────────────────────────────────────────────
const tmpRoot = mkdtempSync(join(tmpdir(), "api-ref-"));
const models = new Map();
for (const pkg of NPM_PACKAGES) {
  const entries = pkg.entries.map((e) => join("packages", pkg.directory, e));
  for (const entry of entries) {
    if (!existsSync(join(workspaceRoot, entry))) {
      fail(`entry point missing: ${entry}`);
    }
  }
  const out = join(tmpRoot, `${pkg.slug}.json`);
  execFileSync(
    process.execPath,
    [
      typedocBin,
      "--entryPoints",
      ...entries,
      "--json",
      out,
      "--skipErrorChecking",
      "--excludePrivate",
      "--excludeInternal",
    ],
    { cwd: workspaceRoot, stdio: ["ignore", "ignore", "pipe"] },
  );
  models.set(pkg.slug, JSON.parse(readFileSync(out, "utf8")));
}

function collectTopLevel(model) {
  const map = new Map();
  const visit = (node) => {
    for (const child of node.children ?? []) {
      if (child.kind === 2 || child.kind === 4) visit(child); // module / namespace
      else if (!map.has(child.name)) map.set(child.name, child);
    }
  };
  visit(model);
  return map;
}

// ── Step 2: policy enforcement ───────────────────────────────────────────────
const baseline = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : { packages: {} };
const nextBaseline = { schemaVersion: 1, packages: {} };
const packageData = [];

/** Normalize all ledger shapes to a flat list of export names. */
function ledgerNames(ledger) {
  if (Array.isArray(ledger)) return ledger;
  if (Array.isArray(ledger.exports)) return ledger.exports.map((e) => (typeof e === "string" ? e : e.name));
  if (Array.isArray(ledger.runtimeExports) || Array.isArray(ledger.declarationExports)) {
    return [...(ledger.runtimeExports ?? []), ...(ledger.declarationExports ?? [])];
  }
  // Entry-point keyed shape: { ".": [...], "./legacy": [...] }
  return Object.values(ledger).filter(Array.isArray).flat();
}

for (const pkg of NPM_PACKAGES) {
  const ledger = [...new Set(ledgerNames(JSON.parse(readFileSync(join(referencesDir, pkg.ledger), "utf8"))))];
  const symbols = collectTopLevel(models.get(pkg.slug));
  const prior = new Set(baseline.packages?.[pkg.slug] ?? []);
  const undocumented = [];
  const entries = [];
  for (const name of [...ledger].sort()) {
    const symbol = symbols.get(name);
    if (!symbol) {
      fail(`vanished stable export: ${name} (${pkg.slug}) not in the TypeDoc model`);
      report.policy.vanished.push(`${pkg.slug}:${name}`);
      continue;
    }
    const doc = commentText(symbol.comment) || commentText(symbol.signatures?.[0]?.comment);
    const documented = doc.length > 0;
    if (!documented) {
      undocumented.push(name);
      if (!writeBaseline && !prior.has(name)) {
        fail(`new undocumented stable export: ${name} (${pkg.slug}) — add a doc comment or update the baseline explicitly`);
        report.policy.newUndocumented.push(`${pkg.slug}:${name}`);
      }
    } else if (!writeBaseline && prior.has(name)) {
      fail(`baseline must shrink: ${name} (${pkg.slug}) is now documented — regenerate site/api-docs-baseline.json`);
      report.policy.tightenRequired.push(`${pkg.slug}:${name}`);
    }
    const source = symbol.sources?.[0] ?? symbol.signatures?.[0]?.sources?.[0];
    entries.push({ name, symbol, doc, documented, source });
  }
  nextBaseline.packages[pkg.slug] = undocumented.sort();
  packageData.push({ pkg, ledger: [...ledger].sort(), entries });
  report.packages[pkg.slug] = {
    exports: entries.length,
    documented: entries.filter((e) => e.documented).length,
    undocumented: undocumented.length,
  };
}

if (writeBaseline) {
  writeFileSync(baselinePath, `${JSON.stringify(nextBaseline, null, 2)}\n`);
  process.stdout.write(`baseline written to ${baselinePath}\n`);
}

// ── Step 3: render MDX pages ─────────────────────────────────────────────────
const crossLinks = existsSync(join(siteRoot, "api-cross-links.json"))
  ? JSON.parse(readFileSync(join(siteRoot, "api-cross-links.json"), "utf8"))
  : {};

// Only generated paths are cleaned: docs/api/npm/* and docs/api/index.mdx.
// Curated pages (dart.mdx, rust.mdx) are hand-written and committed.
rmSync(join(generatedDocsRoot, "npm"), { recursive: true, force: true });
rmSync(join(generatedDocsRoot, "index.mdx"), { force: true });
mkdirSync(join(generatedDocsRoot, "npm"), { recursive: true });

function stabilityBadge(version) {
  if (version.includes("-rc")) return "3.0 RC";
  if (version.includes("-alpha") || version.includes("-beta")) return "3.0 Prerelease";
  return "Stable";
}

for (const { pkg, entries } of packageData) {
  const manifest = JSON.parse(
    readFileSync(join(workspaceRoot, "packages", pkg.directory, "package.json"), "utf8"),
  );
  const documented = entries.filter((e) => e.documented).length;
  const sections = entries.map(({ name, symbol, doc, documented, source }) => {
    const lines = [];
    lines.push(`### \`${name}\` {#${anchorFor(name)}}`);
    lines.push("");
    lines.push(`**${KIND_LABELS[symbol.kind] ?? "symbol"}**${documented ? "" : " · _documentation pending_"}`);
    lines.push("");
    lines.push("```ts");
    lines.push(renderSignature(symbol));
    lines.push("```");
    if (doc) {
      lines.push("");
      lines.push(mdxEscape(doc));
    }
    if (crossLinks[name]) {
      lines.push("");
      lines.push(`Guide: [${crossLinks[name].label}](${crossLinks[name].to})`);
    }
    if (source) {
      lines.push("");
      lines.push(`[Source](${repoBlobBase}/${source.fileName}#L${source.line})`);
    }
    lines.push("");
    return lines.join("\n");
  });

  const page = [
    "---",
    `title: ${yamlQuote(manifest.name)}`,
    `description: ${yamlQuote(`API reference for ${manifest.name} — ${manifest.description ?? ""}`)}`,
    "---",
    "",
    `# \`${manifest.name}\``,
    "",
    `<span className="badge badge--primary">${stabilityBadge(manifest.version)}</span> <span className="badge badge--secondary">v${manifest.version}</span> <span className="badge badge--info">${documented}/${entries.length} documented</span>`,
    "",
    "```bash",
    `pnpm add ${manifest.name}`,
    "```",
    "",
    `Package guide: [package chooser](/docs/packages/${pkg.slug}) · Conceptual model: [Architecture](/docs/product/architecture)`,
    "",
    "## Exports",
    "",
    sections.join("\n"),
  ].join("\n");
  writeFileSync(join(generatedDocsRoot, "npm", `${pkg.slug}.mdx`), page);
}

// API index — every declared artifact exactly once.
{
  const npmRows = NPM_PACKAGES.map(
    (pkg) => `| \`${pkg.name}\` | npm | [API](/docs/api/npm/${pkg.slug}) · [Chooser](/docs/packages/${pkg.slug}) |`,
  );
  const page = [
    "---",
    "title: API reference",
    "description: Complete multi-language API and package reference for the 3.0 release — 12 npm packages, 1 Dart package, 2 Rust crates.",
    "---",
    "",
    "# API reference",
    "",
    "Every declared 3.0 artifact appears exactly once below. TypeScript pages are",
    "generated from the export ledgers with TypeDoc; Dart and Rust pages link to",
    "generated dartdoc/rustdoc artifacts without duplicating canonical source docs.",
    "",
    "| Artifact | Kind | Reference |",
    "| -------- | ---- | --------- |",
    ...npmRows,
    "| `entity_graph_flutter` | Dart | [Dart API](/docs/api/dart) |",
    "| `entity-graph-cli` | Rust | [Rust tooling](/docs/api/rust) |",
    "| `entity-graph-mcp` | Rust | [Rust tooling](/docs/api/rust) |",
    "",
    "## Documentation policy",
    "",
    "Stable exports are the export ledgers from the skills ecosystem. The generator",
    "fails on vanished exports, on newly undocumented exports, and when the",
    "undocumented baseline can shrink. See `site/api-docs-baseline.json`.",
    "",
  ].join("\n");
  writeFileSync(join(generatedDocsRoot, "index.mdx"), page);
}

// Package chooser pages.
const chooserSlugs = [];
for (const pkg of NPM_PACKAGES) {
  const manifest = JSON.parse(
    readFileSync(join(workspaceRoot, "packages", pkg.directory, "package.json"), "utf8"),
  );
  let fileCount = 0;
  let byteCount = 0;
  for (const entry of manifest.files ?? ["dist"]) {
    const target = join(workspaceRoot, "packages", pkg.directory, entry);
    if (!existsSync(target)) continue;
    const walk = (p) => {
      for (const item of readdirSync(p)) {
        const full = join(p, item);
        if (statSync(full).isDirectory()) walk(full);
        else {
          fileCount += 1;
          byteCount += statSync(full).size;
        }
      }
    };
    if (statSync(target).isDirectory()) walk(target);
    else {
      fileCount += 1;
      byteCount += statSync(target).size;
    }
  }
  const peers = Object.entries(manifest.peerDependencies ?? {}).map(
    ([name, range]) => `| \`${name}\` | \`${range}\` |`,
  );
  const deps = Object.entries(manifest.dependencies ?? {}).map(
    ([name, range]) => `| \`${name}\` | \`${range}\` |`,
  );
  const page = [
    "---",
    `title: ${yamlQuote(manifest.name)}`,
    `description: ${yamlQuote(`Package chooser for ${manifest.name} — install command, peer/runtime matrix, stability, and bundle metadata.`)}`,
    "---",
    "",
    `# \`${manifest.name}\``,
    "",
    `<span className="badge badge--primary">${stabilityBadge(manifest.version)}</span> <span className="badge badge--secondary">v${manifest.version}</span>`,
    "",
    mdxEscape(manifest.description ?? ""),
    "",
    "## Install",
    "",
    "```bash",
    `pnpm add ${manifest.name}`,
    "```",
    "",
    "## Runtime matrix",
    "",
    "| Field | Value |",
    "| ----- | ----- |",
    `| Node | \`${manifest.engines?.node ?? ">=20"}\` |`,
    `| Package manager | pnpm only (workspace rule) |`,
    `| Published files | ${fileCount} files, ${(byteCount / 1024).toFixed(1)} KiB |`,
    "",
    "## Peer dependencies",
    "",
    peers.length > 0 ? "| Package | Range |\n| ------- | ----- |\n" + peers.join("\n") : "None.",
    "",
    "## Runtime dependencies",
    "",
    deps.length > 0 ? "| Package | Range |\n| ------- | ----- |\n" + deps.join("\n") : "None.",
    "",
    `API reference: [\`${manifest.name}\` exports](/docs/api/npm/${pkg.slug})`,
    "",
  ].join("\n");
  writeFileSync(join(chooserDocsRoot, `${pkg.slug}.mdx`), page);
  chooserSlugs.push(pkg.slug);
}

// Generated sidebar.
{
  const sidebar = {
    apiSidebar: [
      "api/index",
      "api/dart",
      "api/rust",
      {
        type: "category",
        label: "npm packages",
        collapsed: false,
        items: NPM_PACKAGES.map((pkg) => `api/npm/${pkg.slug}`),
      },
    ],
    packageChooserCategory: {
      type: "category",
      label: "Package chooser",
      collapsed: true,
      items: chooserSlugs.map((slug) => `packages/${slug}`),
    },
  };
  writeFileSync(sidebarPath, `${JSON.stringify(sidebar, null, 2)}\n`);
}

// ── Step 4: Dart / Rust artifacts ────────────────────────────────────────────
if (!skipArtifacts) {
  const staticApi = join(siteRoot, "static/api");
  rmSync(staticApi, { recursive: true, force: true });
  mkdirSync(staticApi, { recursive: true });

  const dartOut = join(tmpRoot, "dartdoc");
  execFileSync("dart", ["doc", "--output", dartOut], {
    cwd: join(workspaceRoot, "packages/entity_graph_flutter"),
    stdio: ["ignore", "ignore", "pipe"],
  });
  cpSync(dartOut, join(staticApi, "dart"), { recursive: true });
  report.artifacts.dart = existsSync(join(staticApi, "dart/index.html")) ? "generated" : "failed";
  if (report.artifacts.dart !== "generated") fail("dart doc artifact missing index.html");

  // Dart presence policy: every dart-ledger declaration appears in dartdoc's index.json.
  const dartIndex = JSON.parse(readFileSync(join(staticApi, "dart/index.json"), "utf8"));
  const dartNames = new Set(dartIndex.map((entry) => entry.name));
  const dartLedger = JSON.parse(readFileSync(join(referencesDir, "dart-library-exports.json"), "utf8"));
  for (const decl of dartLedger.exports) {
    if (!dartNames.has(decl.name)) {
      fail(`vanished stable export: ${decl.name} (entity_graph_flutter) not in the dartdoc index`);
      report.policy.vanished.push(`entity_graph_flutter:${decl.name}`);
    }
  }
  report.packages.entity_graph_flutter = {
    exports: dartLedger.exports.length,
    documented: null, // dartdoc index.json carries no comment coverage; see retained limits
    undocumented: null,
  };

  for (const crate of RUST_CRATES) {
    const targetDir = join(tmpRoot, `rustdoc-${crate.slug}`);
    execFileSync("cargo", ["doc", "--no-deps", "--manifest-path", crate.manifest, "--target-dir", targetDir], {
      cwd: workspaceRoot,
      stdio: ["ignore", "ignore", "pipe"],
    });
    const docDir = join(targetDir, "doc");
    const crateDir = readdirSync(docDir).find((entry) =>
      statSync(join(docDir, entry)).isDirectory() && entry !== "src" && entry !== "static.files",
    );
    if (!crateDir || !existsSync(join(docDir, crateDir, "index.html"))) {
      fail(`rustdoc artifact missing for ${crate.slug}`);
      report.artifacts[crate.slug] = "failed";
      continue;
    }
    cpSync(docDir, join(staticApi, "rust", crate.slug), { recursive: true });
    report.artifacts[crate.slug] = "generated";
    report.artifacts.rust = "generated";
  }
}

rmSync(tmpRoot, { recursive: true, force: true });

if (reportPath) {
  mkdirSync(dirname(resolve(reportPath)), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (failures.length > 0) {
  process.stderr.write(`\ngenerate-api-reference FAIL (${failures.length} policy/artifact failures):\n`);
  for (const failure of failures) process.stderr.write(`  - ${failure}\n`);
  process.exit(1);
}
process.stdout.write("\ngenerate-api-reference PASS\n");
