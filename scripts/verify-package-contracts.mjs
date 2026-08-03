import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  PUBLIC_PACKAGES,
} from "./public-packages.mjs";
import {
  createPackedConsumerManifest,
  validateManifest,
  validatePackedManifestData,
  validateTarballFileList,
} from "./package-contract-validation.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;

if (reportFlag >= 0 && !reportPath) {
  throw new Error("--report requires a file path");
}

const tempRoot = await mkdtemp(join(tmpdir(), "prometheus-package-contracts-"));
const tarballDirectory = join(tempRoot, "tarballs");
const consumerDirectory = join(tempRoot, "consumer");
const report = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  packageCount: PUBLIC_PACKAGES.length,
  packages: [],
  consumers: {},
};

try {
  await mkdir(tarballDirectory, { recursive: true });

  for (const publicPackage of PUBLIC_PACKAGES) {
    const packageDirectory = resolve(workspaceRoot, publicPackage.directory);
    const manifest = JSON.parse(
      await readFile(join(packageDirectory, "package.json"), "utf8"),
    );

    validateManifest(publicPackage, manifest);

    const packed = await run("pnpm", [
      "--dir",
      packageDirectory,
      "pack",
      "--pack-destination",
      tarballDirectory,
      "--json",
    ]);
    const packResult = JSON.parse(packed.stdout);
    const tarballPath = resolve(packResult.filename);
    const filePaths = packResult.files.map((file) => file.path).sort();

    validateTarballFileList(publicPackage, filePaths);
    await validatePackedManifest(tarballPath);

    process.stdout.write(`\n[package-contract] ${publicPackage.name}\n`);
    const publint = await run("pnpm", [
      "exec",
      "publint",
      "run",
      tarballPath,
      "--strict",
    ]);
    process.stdout.write(publint.stdout);

    const attw = await run("pnpm", [
      "exec",
      "attw",
      tarballPath,
      "--profile",
      "strict",
      "--no-color",
    ]);
    process.stdout.write(attw.stdout);

    report.packages.push({
      name: publicPackage.name,
      directory: publicPackage.directory,
      tarball: basename(tarballPath),
      files: filePaths,
      manifest: "pass",
      payload: "pass",
      publint: "pass",
      areTheTypesWrong: "pass",
    });
  }

  const tarballsByName = Object.fromEntries(
    report.packages.map((entry) => [
      entry.name,
      `file:${join(tarballDirectory, entry.tarball)}`,
    ]),
  );
  report.consumers.candidateSet = "tarballs-only";

  await writeConsumerFixture(consumerDirectory, tarballsByName);
  await run("pnpm", [
    "install",
    "--ignore-scripts",
    "--strict-peer-dependencies=false",
  ], { cwd: consumerDirectory });

  const esm = await run("node", ["consumer.mjs"], { cwd: consumerDirectory });
  process.stdout.write(esm.stdout);
  report.consumers.nodeEsm = "pass";

  const cjs = await run("node", ["consumer.cjs"], { cwd: consumerDirectory });
  process.stdout.write(cjs.stdout);
  report.consumers.nodeCommonJs = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.esm.json"], {
    cwd: consumerDirectory,
  });
  report.consumers.typescriptNodeNext = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.cjs.json"], {
    cwd: consumerDirectory,
  });
  report.consumers.typescriptNode16 = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.bundler.json"], {
    cwd: consumerDirectory,
  });
  report.consumers.typescriptBundler = "pass";

  process.stdout.write(
    `\n[package-contract] PASS: ${PUBLIC_PACKAGES.length} tarballs; ESM, CommonJS, NodeNext, Node16, and Bundler consumers.\n`,
  );

  if (reportPath) {
    const absoluteReportPath = resolve(workspaceRoot, reportPath);
    await mkdir(dirname(absoluteReportPath), { recursive: true });
    await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function validatePackedManifest(tarballPath) {
  const extracted = await run("tar", ["-xOf", tarballPath, "package/package.json"]);
  const packedManifest = JSON.parse(extracted.stdout);
  validatePackedManifestData(packedManifest, workspaceRoot);
}

async function writeConsumerFixture(directory, tarballsByName) {
  await mkdir(directory, { recursive: true });

  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify(createPackedConsumerManifest(tarballsByName), null, 2)}\n`,
  );

  const names = PUBLIC_PACKAGES.map(({ name }) => name);
  const esmImports = names
    .map((name, index) => `const package${index} = await import(${JSON.stringify(name)});`)
    .join("\n");
  const esmAssertions = names
    .map(
      (name, index) =>
        `if (Object.keys(package${index}).length === 0) throw new Error(${JSON.stringify(`${name} has no ESM exports`)});`,
    )
    .join("\n");
  await writeFile(
    join(directory, "consumer.mjs"),
    `${domPrelude("esm")}\n${esmImports}\n${esmAssertions}\nconsole.log("[package-contract] Node ESM consumer passed");\n`,
  );

  const cjsImports = names
    .map((name, index) => `const package${index} = require(${JSON.stringify(name)});`)
    .join("\n");
  const cjsAssertions = names
    .map(
      (name, index) =>
        `if (Object.keys(package${index}).length === 0) throw new Error(${JSON.stringify(`${name} has no CommonJS exports`)});`,
    )
    .join("\n");
  await writeFile(
    join(directory, "consumer.cjs"),
    `${domPrelude("cjs")}\n${cjsImports}\n${cjsAssertions}\nconsole.log("[package-contract] Node CommonJS consumer passed");\n`,
  );

  const typeImports = names
    .map((name, index) => `import * as package${index} from ${JSON.stringify(name)};`)
    .join("\n");
  const typeUses = names.map((_, index) => `void package${index};`).join("\n");
  await writeFile(join(directory, "consumer.mts"), `${typeImports}\n${typeUses}\n`);
  await writeFile(join(directory, "consumer.cts"), `${typeImports}\n${typeUses}\n`);
  await writeFile(join(directory, "consumer.ts"), `${typeImports}\n${typeUses}\n`);

  const baseCompilerOptions = {
    target: "ES2023",
    lib: ["ES2023", "DOM", "DOM.Iterable"],
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    jsx: "react-jsx",
    types: ["node", "react", "react-dom"],
  };
  await writeFile(
    join(directory, "tsconfig.esm.json"),
    `${JSON.stringify({ compilerOptions: { ...baseCompilerOptions, module: "NodeNext", moduleResolution: "NodeNext" }, files: ["consumer.mts"] }, null, 2)}\n`,
  );
  await writeFile(
    join(directory, "tsconfig.cjs.json"),
    `${JSON.stringify({ compilerOptions: { ...baseCompilerOptions, module: "Node16", moduleResolution: "Node16" }, files: ["consumer.cts"] }, null, 2)}\n`,
  );
  await writeFile(
    join(directory, "tsconfig.bundler.json"),
    `${JSON.stringify({ compilerOptions: { ...baseCompilerOptions, module: "ESNext", moduleResolution: "Bundler" }, files: ["consumer.ts"] }, null, 2)}\n`,
  );
}

function domPrelude(moduleKind) {
  const load = moduleKind === "esm"
    ? 'const { JSDOM } = await import("jsdom");'
    : 'const { JSDOM } = require("jsdom");';
  return `${load}
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.customElements = dom.window.customElements;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;`;
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
    throw new Error(`${command} ${args.join(" ")} failed${stdout}${stderr}`, {
      cause: error,
    });
  }
}
