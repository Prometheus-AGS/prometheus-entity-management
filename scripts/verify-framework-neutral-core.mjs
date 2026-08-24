import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coreDirectory = join(workspaceRoot, "packages", "entity-graph-core");
const corePackageName = "@prometheus-ags/entity-graph-core";

const runtimeReactImport = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']react(?:-dom)?(?:\/[^"']*)?["']/;
const declarationReactType = /(?:from\s*|import\s*\(\s*)["'](?:react|react-dom)(?:\/[^"']*)?["']|<reference\s+types=["']react["']|\bReact\.(?:ReactNode|ComponentType|ElementType|JSXElementConstructor)\b|\bJSX\./;

export function validateFrameworkNeutralArtifact({
  manifest,
  runtimeFiles,
  declarationFiles,
  dependencyNames,
}) {
  const declaredDependencyNames = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ];
  const forbiddenPackages = new Set(["react", "react-dom", "@types/react", "@types/react-dom"]);

  for (const name of declaredDependencyNames) {
    if (forbiddenPackages.has(name)) {
      throw new Error(`packed core manifest declares forbidden React dependency: ${name}`);
    }
  }
  for (const name of dependencyNames) {
    if (forbiddenPackages.has(name)) {
      throw new Error(`packed core dependency graph resolves forbidden React package: ${name}`);
    }
  }
  for (const [path, source] of Object.entries(runtimeFiles)) {
    if (runtimeReactImport.test(source)) {
      throw new Error(`${path} contains a React runtime import`);
    }
  }
  for (const [path, source] of Object.entries(declarationFiles)) {
    if (declarationReactType.test(source)) {
      throw new Error(`${path} contains a React type dependency`);
    }
  }
}

export function collectDependencyNames(listOutput) {
  const names = new Set();
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.name === "string") names.add(node.name);
    for (const key of ["dependencies", "devDependencies", "optionalDependencies"]) {
      for (const [name, child] of Object.entries(node[key] ?? {})) {
        names.add(name);
        visit(child);
      }
    }
  };
  for (const root of Array.isArray(listOutput) ? listOutput : [listOutput]) visit(root);
  return [...names].sort();
}

export async function verifyFrameworkNeutralCore({ reportPath } = {}) {
  const tempRoot = await mkdtemp(join(tmpdir(), "prometheus-framework-neutral-core-"));
  const tarballDirectory = join(tempRoot, "tarballs");
  const consumerDirectory = join(tempRoot, "consumer");

  try {
    await mkdir(tarballDirectory, { recursive: true });
    const packed = await run("pnpm", [
      "--dir",
      coreDirectory,
      "pack",
      "--pack-destination",
      tarballDirectory,
      "--json",
    ]);
    const packResult = JSON.parse(packed.stdout);
    const tarballPath = isAbsolute(packResult.filename)
      ? packResult.filename
      : resolve(workspaceRoot, packResult.filename);

    const manifest = JSON.parse(await extract(tarballPath, "package/package.json"));
    const runtimeFiles = {
      "dist/index.mjs": await extract(tarballPath, "package/dist/index.mjs"),
      "dist/index.cjs": await extract(tarballPath, "package/dist/index.cjs"),
    };
    const declarationFiles = {
      "dist/index.d.ts": await extract(tarballPath, "package/dist/index.d.ts"),
      "dist/index.d.cts": await extract(tarballPath, "package/dist/index.d.cts"),
    };

    await writeConsumerFixture(consumerDirectory, tarballPath);
    await run("pnpm", ["install", "--ignore-scripts", "--strict-peer-dependencies=false"], {
      cwd: consumerDirectory,
    });
    const list = await run("pnpm", ["list", "--depth", "Infinity", "--json"], {
      cwd: consumerDirectory,
    });
    const dependencyNames = collectDependencyNames(JSON.parse(list.stdout));

    validateFrameworkNeutralArtifact({
      manifest,
      runtimeFiles,
      declarationFiles,
      dependencyNames,
    });

    await assertMissing(join(consumerDirectory, "node_modules", "react"));
    await assertMissing(join(consumerDirectory, "node_modules", "@types", "react"));

    const esm = await run("node", ["consumer.mjs"], { cwd: consumerDirectory });
    const cjs = await run("node", ["consumer.cjs"], { cwd: consumerDirectory });
    await run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], { cwd: consumerDirectory });

    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      artifact: {
        packageName: manifest.name,
        version: manifest.version,
        tarballFiles: packResult.files.map(({ path }) => path).sort(),
        runtimeReactDependencies: "none",
        declarationReactDependencies: "none",
        resolvedReactPackages: "none",
      },
      consumers: {
        installSource: "packed-tarball-only",
        nodeEsmSharedGraph: esm.stdout.includes("ESM shared graph passed") ? "pass" : "fail",
        nodeCommonJsSharedGraph: cjs.stdout.includes("CommonJS shared graph passed") ? "pass" : "fail",
        isolatedGraphFactories: "pass",
        typescriptWithoutReactTypes: "pass",
      },
    };

    if (Object.values(report.consumers).includes("fail")) {
      throw new Error("a packed non-React consumer did not report success");
    }
    if (reportPath) {
      const absoluteReportPath = resolve(workspaceRoot, reportPath);
      await mkdir(dirname(absoluteReportPath), { recursive: true });
      await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
    }

    process.stdout.write(
      "[framework-neutral-core] PASS: packed core has no React dependency and ESM/CJS/TypeScript non-React consumers share the vanilla graph.\n",
    );
    return report;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeConsumerFixture(directory, tarballPath) {
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify({
      name: "framework-neutral-core-consumer",
      private: true,
      type: "module",
      packageManager: "pnpm@10.33.0",
      dependencies: {
        [corePackageName]: `file:${tarballPath}`,
      },
      devDependencies: {
        typescript: "6.0.2",
      },
    }, null, 2)}\n`,
  );

  await writeFile(
    join(directory, "writer.mjs"),
    `import { graphStore } from ${JSON.stringify(corePackageName)};\nexport function writeSharedEntity() { graphStore.getState().upsertEntity("Project", "shared", { name: "Prometheus" }); }\n`,
  );
  await writeFile(
    join(directory, "reader.mjs"),
    `import { graphStore } from ${JSON.stringify(corePackageName)};\nexport function readSharedEntity() { return graphStore.getState().readEntity("Project", "shared"); }\n`,
  );
  await writeFile(
    join(directory, "consumer.mjs"),
    `import assert from "node:assert/strict";\nimport { createGraphStore, graphStore, useGraphStore } from ${JSON.stringify(corePackageName)};\nimport { writeSharedEntity } from "./writer.mjs";\nimport { readSharedEntity } from "./reader.mjs";\nassert.equal(useGraphStore, graphStore);\nwriteSharedEntity();\nassert.equal(readSharedEntity().name, "Prometheus");\nconst first = createGraphStore();\nconst second = createGraphStore();\nfirst.getState().upsertEntity("Project", "isolated", { name: "First" });\nassert.equal(first.getState().readEntity("Project", "isolated").name, "First");\nassert.equal(second.getState().readEntity("Project", "isolated"), null);\nlet observed = null;\nconst unsubscribe = graphStore.subscribe((state) => state.entities.Project?.shared?.name, (name) => { observed = name; });\ngraphStore.getState().upsertEntity("Project", "shared", { name: "Prometheus 3" });\nunsubscribe();\nassert.equal(observed, "Prometheus 3");\nconsole.log("ESM shared graph passed");\n`,
  );

  await writeFile(
    join(directory, "writer.cjs"),
    `const { graphStore } = require(${JSON.stringify(corePackageName)});\nexports.writeSharedEntity = function () { graphStore.getState().upsertEntity("Project", "shared-cjs", { name: "Prometheus CJS" }); };\n`,
  );
  await writeFile(
    join(directory, "reader.cjs"),
    `const { graphStore } = require(${JSON.stringify(corePackageName)});\nexports.readSharedEntity = function () { return graphStore.getState().readEntity("Project", "shared-cjs"); };\n`,
  );
  await writeFile(
    join(directory, "consumer.cjs"),
    `const assert = require("node:assert/strict");\nconst { createGraphStore, graphStore, useGraphStore } = require(${JSON.stringify(corePackageName)});\nconst { writeSharedEntity } = require("./writer.cjs");\nconst { readSharedEntity } = require("./reader.cjs");\nassert.equal(useGraphStore, graphStore);\nwriteSharedEntity();\nassert.equal(readSharedEntity().name, "Prometheus CJS");\nconst first = createGraphStore();\nconst second = createGraphStore();\nfirst.getState().upsertEntity("Project", "isolated-cjs", { name: "First CJS" });\nassert.equal(second.getState().readEntity("Project", "isolated-cjs"), null);\nconsole.log("CommonJS shared graph passed");\n`,
  );

  await writeFile(
    join(directory, "consumer.ts"),
    `import { createGraphStore, graphStore, useGraphStore, type GraphStore } from ${JSON.stringify(corePackageName)};\nconst isolated: GraphStore = createGraphStore();\nisolated.getState().upsertEntity("Project", "typed", { name: "Typed" });\nconst entity = isolated.getState().readEntity<{ name: string }>("Project", "typed");\nconst sameStore: GraphStore = graphStore;\nconst migrationAlias: GraphStore = useGraphStore;\nvoid entity; void sameStore; void migrationAlias;\n`,
  );
  await writeFile(
    join(directory, "tsconfig.json"),
    `${JSON.stringify({
      compilerOptions: {
        target: "ES2023",
        lib: ["ES2023", "DOM", "DOM.Iterable"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        types: [],
      },
      files: ["consumer.ts"],
    }, null, 2)}\n`,
  );
}

async function extract(tarballPath, path) {
  return (await run("tar", ["-xOf", tarballPath, path])).stdout;
}

async function assertMissing(path) {
  try {
    await access(path);
  } catch {
    return;
  }
  throw new Error(`non-React consumer unexpectedly installed ${path}`);
}

async function run(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: "0" },
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    });
  } catch (error) {
    const stdout = error.stdout ? `\nstdout:\n${error.stdout}` : "";
    const stderr = error.stderr ? `\nstderr:\n${error.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stdout}${stderr}`, { cause: error });
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const reportFlag = process.argv.indexOf("--report");
  const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : undefined;
  if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");
  await verifyFrameworkNeutralCore({ reportPath });
}
