#!/usr/bin/env node
/**
 * verify-skills-snippets.mjs — compile every public TypeScript snippet in the
 * skills pack against PACKED packages.
 *
 * Extracts ```ts / ```tsx fences from prometheus-entity-skills/**\/*.md, writes
 * each block as a module into a temporary consumer, installs packed tarballs
 * of the referenced packages plus their public peers, and type-checks the lot
 * with tsc --noEmit. A snippet that drifts from the real API fails this gate.
 *
 * Usage: node scripts/verify-skills-snippets.mjs [--report <path>]
 */
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = join(workspaceRoot, "prometheus-entity-skills");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;

const PACKAGES_TO_PACK = [
  "entity-graph-core",
  "entity-graph-react",
  "entity-graph-sync",
  "entity-graph-a2a",
  "a2ui-react",
];

const CONSUMER_DEPS = {
  react: "19.2.8",
  "react-dom": "19.2.8",
  "@types/react": "19.2.18",
  "@tanstack/react-table": "^8.21.3",
  "loro-crdt": "1.13.9",
  typescript: "6.0.2",
};

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    execFile(
      command,
      args,
      { cwd: options.cwd ?? workspaceRoot, env: { ...process.env, FORCE_COLOR: "0" }, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error && !options.allowFailure) {
          reject(new Error(`${command} ${args.join(" ")} failed:\n${stdout}\n${stderr}`));
        } else {
          resolveRun({ exitCode: error && typeof error.code === "number" ? error.code : 0, stdout, stderr });
        }
      },
    );
  });
}

async function* walkMarkdown(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkMarkdown(full);
    else if (entry.name.endsWith(".md")) yield full;
  }
}

const FENCE_RE = /```(tsx?)\n(.*?)```/gs;

async function extractSnippets() {
  const snippets = [];
  for await (const file of walkMarkdown(skillsRoot)) {
    const text = await readFile(file, "utf8");
    for (const match of text.matchAll(FENCE_RE)) {
      snippets.push({
        source: file.slice(workspaceRoot.length + 1),
        lang: match[1],
        code: match[2],
      });
    }
  }
  return snippets;
}

const snippets = await extractSnippets();
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidenceBoundary: { kind: "packed-consumer", countsAsPackedPackageEvidence: true },
  snippets: { total: snippets.length, sources: [...new Set(snippets.map((s) => s.source))].length },
  packages: {},
  lanes: { pack: "pending", consumerInstall: "pending", snippetCompile: "pending" },
};

const tempRoot = await mkdtemp(join(tmpdir(), "prometheus-skills-snippets-"));
const tarballDir = join(tempRoot, "tarballs");
const consumerDir = join(tempRoot, "consumer");

try {
  await mkdir(tarballDir, { recursive: true });
  const tarballs = {};
  for (const dir of PACKAGES_TO_PACK) {
    const pkgDir = join(workspaceRoot, "packages", dir);
    const manifest = JSON.parse(await readFile(join(pkgDir, "package.json"), "utf8"));
    const packed = await run("pnpm", [
      "--dir", pkgDir, "pack", "--pack-destination", tarballDir, "--json",
    ]);
    tarballs[manifest.name] = `file:${resolve(JSON.parse(packed.stdout).filename)}`;
  }
  report.lanes.pack = "pass";
  report.packages = Object.keys(tarballs).sort();

  await mkdir(join(consumerDir, "src"), { recursive: true });
  await writeFile(
    join(consumerDir, "package.json"),
    JSON.stringify({
      name: "skills-snippet-consumer",
      private: true,
      version: "0.0.0",
      dependencies: { ...tarballs, ...CONSUMER_DEPS },
    }, null, 2),
  );
  await writeFile(
    join(consumerDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "es2022",
        module: "esnext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: false,
        noUnusedParameters: false,
        skipLibCheck: true,
        noEmit: true,
        types: [],
      },
      include: ["src"],
    }, null, 2),
  );

  for (const [index, snippet] of snippets.entries()) {
    const header = `// Source: ${snippet.source}\n`;
    await writeFile(join(consumerDir, "src", `snippet-${index}.${snippet.lang}`), header + snippet.code);
  }

  const install = await run(
    "pnpm",
    ["install", "--ignore-scripts", "--strict-peer-dependencies=false", "--reporter=silent"],
    { cwd: consumerDir },
  );
  if (install.exitCode !== 0) {
    throw new Error(`consumer install failed:\n${install.stdout}\n${install.stderr}`);
  }
  report.lanes.consumerInstall = "pass";

  const tsc = await run(
    "pnpm",
    ["exec", "tsc", "--noEmit", "-p", "tsconfig.json"],
    { cwd: consumerDir, allowFailure: true },
  );
  report.lanes.snippetCompile = tsc.exitCode === 0 ? "pass" : "fail";

  if (reportPath) {
    await mkdir(dirname(resolve(reportPath)), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (tsc.exitCode !== 0) {
    // tsc output lines look like: src/snippet-3.ts(5,7): error TS...
    process.stderr.write("\nSnippet compile failures (snippet file → source doc):\n");
    const failures = new Set(
      [...tsc.stdout.matchAll(/src\/(snippet-\d+)\.tsx?\(/g)].map((m) => m[1]),
    );
    for (const failure of failures) {
      const index = Number(failure.split("-")[1]);
      process.stderr.write(`  ${failure} → ${snippets[index]?.source}\n`);
    }
    process.stderr.write(`\n${tsc.stdout}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `OK: ${snippets.length} public snippets from ${report.snippets.sources} docs compile against packed packages.\n`,
  );
} finally {
  // Temp consumer is left in tmpdir for the OS to reap; nothing in the repo is touched.
}
