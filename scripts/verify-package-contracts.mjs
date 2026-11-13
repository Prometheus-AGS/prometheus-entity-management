import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
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
const controlDirectory = join(tempRoot, "control-upstream-web-core");
// UPG-15: the bundled a2ui-react runtime must reach zod 4.6.7, whose `zod/v3`
// permalink serves the Zod 3 API the bundled official @a2ui code uses.
const A2UI_REACT_PACKAGE = "@prometheus-ags/a2ui-react";
const EXPECTED_ZOD_VERSION = "4.6.7";
const ALLOWED_ZOD_SPECIFIERS = new Set(["zod", "zod/v3"]);
// UPG-15 negative control: the registry @a2ui/web_core declarations fail
// NodeNext + skipLibCheck:false with exactly this diagnostic.
const UPSTREAM_CONTROL_DIAGNOSTIC = "TS2835";
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

    const attwArgs = [
      "exec",
      "attw",
      tarballPath,
      // ESM-only as of 4.0.0. The `strict` profile fails any package a
      // CommonJS `require` cannot resolve, which is the defining property of
      // an ESM-only package rather than a defect in one. `esm-only` keeps
      // every other check — export map correctness, declaration resolution,
      // node10 and bundler resolution — and drops only CJSResolvesToESM.
      "--profile",
      "esm-only",
      "--no-color",
    ];
    if (publicPackage.attwExcludeEntrypoints?.length) {
      attwArgs.push(
        "--exclude-entrypoints",
        ...publicPackage.attwExcludeEntrypoints,
      );
    }
    const attw = await run("pnpm", attwArgs);
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
  report.consumers.nodeCommonJsDynamicImport = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.esm.json"], {
    cwd: consumerDirectory,
  });
  report.consumers.typescriptNodeNext = "pass";

  await run("pnpm", ["exec", "tsc", "-p", "tsconfig.bundler.json"], {
    cwd: consumerDirectory,
  });
  report.consumers.typescriptBundler = "pass";

  report.zod = await verifyBundledZodResolution();
  process.stdout.write(
    `[package-contract] ${A2UI_REACT_PACKAGE} zod imports (${report.zod.specifiers.join(", ")}) resolve to zod ${report.zod.resolvedVersion}\n`,
  );

  report.consumers.upstreamWebCoreControl = await runUpstreamWebCoreControl(controlDirectory);
  process.stdout.write(
    `[package-contract] control: registry ${report.consumers.upstreamWebCoreControl.package} fails NodeNext/skipLibCheck:false with ${report.consumers.upstreamWebCoreControl.diagnostics.length} ${UPSTREAM_CONTROL_DIAGNOSTIC} diagnostic(s), as required\n`,
  );

  process.stdout.write(
    `\n[package-contract] PASS: ${PUBLIC_PACKAGES.length} tarballs; ESM-only — ESM, CommonJS-via-dynamic-import, NodeNext, and Bundler consumers; zod ${EXPECTED_ZOD_VERSION} via zod/v3; upstream @a2ui/web_core control fails with ${UPSTREAM_CONTROL_DIAGNOSTIC}.\n`,
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
    // Pinned to the repository's pnpm (corepack's out-of-project fallback may not be launchable).
    `${JSON.stringify({ ...createPackedConsumerManifest(tarballsByName), packageManager: JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).packageManager }, null, 2)}\n`,
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

  // ESM-only as of 4.0.0: a CommonJS file cannot `require` these packages.
  // The supported CJS path is `await import(...)`, so that is what is proven —
  // dropping the check entirely would leave CJS consumers unverified.
  const cjsImports = names
    .map((name, index) => `  const package${index} = await import(${JSON.stringify(name)});`)
    .join("\n");
  const cjsAssertions = names
    .map(
      (name, index) =>
        `  if (Object.keys(package${index}).length === 0) throw new Error(${JSON.stringify(`${name} has no exports via dynamic import`)});`,
    )
    .join("\n");
  await writeFile(
    join(directory, "consumer.cjs"),
    `${domPrelude("cjs")}\n(async () => {\n${cjsImports}\n${cjsAssertions}\n  console.log("[package-contract] Node CommonJS dynamic-import consumer passed");\n})().catch((error) => { console.error(error); process.exit(1); });\n`,
  );

  const typeImports = names
    .map((name, index) => `import * as package${index} from ${JSON.stringify(name)};`)
    .join("\n");
  const typeUses = names.map((_, index) => `void package${index};`).join("\n");
  await writeFile(join(directory, "consumer.mts"), `${typeImports}\n${typeUses}\n`);
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
    join(directory, "tsconfig.bundler.json"),
    `${JSON.stringify({ compilerOptions: { ...baseCompilerOptions, module: "ESNext", moduleResolution: "Bundler" }, files: ["consumer.ts"] }, null, 2)}\n`,
  );
}

/**
 * UPG-15 oracle: the packed a2ui-react dist imports zod only as `zod` (its own
 * Zod 4 schemas) and `zod/v3` (the bundled official @a2ui code), and in the
 * packed consumer both resolve inside one zod package at EXPECTED_ZOD_VERSION.
 */
async function verifyBundledZodResolution() {
  const entry = report.packages.find(({ name }) => name === A2UI_REACT_PACKAGE);
  if (!entry) throw new Error(`${A2UI_REACT_PACKAGE} was not packed in this run`);

  const extractDirectory = join(tempRoot, "inspect-a2ui-react");
  await mkdir(extractDirectory, { recursive: true });
  await run("tar", ["-xzf", join(tarballDirectory, entry.tarball), "-C", extractDirectory]);
  const packedRoot = join(extractDirectory, "package");
  const packedManifest = JSON.parse(await readFile(join(packedRoot, "package.json"), "utf8"));
  if (packedManifest.dependencies?.zod !== EXPECTED_ZOD_VERSION) {
    throw new Error(
      `packed ${A2UI_REACT_PACKAGE} must pin zod ${EXPECTED_ZOD_VERSION}; found ${packedManifest.dependencies?.zod ?? "none"}`,
    );
  }

  const zodSpecifierPattern = /\b(?:from|import)\s*\(?\s*["'](zod(?:\/[\w.-]+)*)["']/g;
  const specifiersByFile = {};
  const distFiles = (await readdir(join(packedRoot, "dist")))
    .filter((name) => name.endsWith(".mjs"))
    .sort();
  for (const file of distFiles) {
    const source = await readFile(join(packedRoot, "dist", file), "utf8");
    const found = [...new Set([...source.matchAll(zodSpecifierPattern)].map((match) => match[1]))];
    if (found.length > 0) specifiersByFile[`dist/${file}`] = found.sort();
  }
  const specifiers = [...new Set(Object.values(specifiersByFile).flat())].sort();
  const unexpected = specifiers.filter((specifier) => !ALLOWED_ZOD_SPECIFIERS.has(specifier));
  if (unexpected.length > 0) {
    throw new Error(
      `packed ${A2UI_REACT_PACKAGE} dist imports unexpected zod specifiers: ${unexpected.join(", ")}`,
    );
  }
  if (!specifiers.includes("zod/v3")) {
    throw new Error(
      `packed ${A2UI_REACT_PACKAGE} dist has no zod/v3 import; the bundled @a2ui runtime is not retargeted to zod 4's v3 permalink`,
    );
  }

  const installedRoot = await realpath(
    join(consumerDirectory, "node_modules", ...A2UI_REACT_PACKAGE.split("/")),
  );
  const requireFromPackage = createRequire(join(installedRoot, "package.json"));
  const resolved = {};
  for (const specifier of specifiers) {
    const file = requireFromPackage.resolve(specifier);
    const zodRoot = await findPackageRoot(file, "zod");
    const zodManifest = JSON.parse(await readFile(join(zodRoot, "package.json"), "utf8"));
    resolved[specifier] = { file, packageRoot: zodRoot, version: zodManifest.version };
  }
  const versions = [...new Set(Object.values(resolved).map(({ version }) => version))];
  const roots = [...new Set(Object.values(resolved).map(({ packageRoot }) => packageRoot))];
  if (versions.length !== 1 || versions[0] !== EXPECTED_ZOD_VERSION || roots.length !== 1) {
    throw new Error(
      `${A2UI_REACT_PACKAGE} zod imports must resolve to one zod ${EXPECTED_ZOD_VERSION}; resolved ${JSON.stringify(resolved)}`,
    );
  }
  // The bundled official code imports ZodFirstPartyTypeKind from zod/v3.
  const zodV3 = requireFromPackage("zod/v3");
  if (typeof zodV3.ZodFirstPartyTypeKind !== "object" || zodV3.ZodFirstPartyTypeKind === null) {
    throw new Error(`zod/v3 resolved from ${A2UI_REACT_PACKAGE} does not provide the Zod 3 API`);
  }

  return {
    package: A2UI_REACT_PACKAGE,
    packedDependency: packedManifest.dependencies.zod,
    specifiers,
    specifiersByFile,
    resolved,
    resolvedVersion: versions[0],
    v3Api: "ZodFirstPartyTypeKind present",
    result: "pass",
  };
}

async function findPackageRoot(file, packageName) {
  let directory = dirname(file);
  while (directory !== dirname(directory)) {
    try {
      const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
      if (manifest.name === packageName) return directory;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    directory = dirname(directory);
  }
  throw new Error(`no ${packageName} package.json above ${file}`);
}

/**
 * UPG-15 negative control: a consumer that imports the registry (unpatched)
 * @a2ui/web_core/v0_9 under NodeNext with skipLibCheck:false must fail with
 * TS2835 and nothing else. A clean type-check, or any other diagnostic, means
 * the strict packed consumers above would not have caught the upstream
 * declaration defect, so the run fails.
 */
async function runUpstreamWebCoreControl(directory) {
  const a2uiManifest = JSON.parse(
    await readFile(join(workspaceRoot, "packages", "a2ui-react", "package.json"), "utf8"),
  );
  const webCoreVersion = a2uiManifest.devDependencies?.["@a2ui/web_core"];
  if (!webCoreVersion) {
    throw new Error("packages/a2ui-react/package.json does not declare @a2ui/web_core");
  }

  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify({
      name: "upstream-web-core-control-consumer",
      private: true,
      type: "module",
      // Pinned to the repository's pnpm (corepack's out-of-project fallback may not be launchable).
      packageManager: JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).packageManager,
      dependencies: {
        "@a2ui/web_core": webCoreVersion,
        "@types/node": "22.20.1",
        typescript: "6.0.2",
      },
    }, null, 2)}\n`,
  );
  await writeFile(
    join(directory, "consumer.mts"),
    `import type { A2uiMessage } from "@a2ui/web_core/v0_9";\nimport * as webCore from "@a2ui/web_core/v0_9";\nexport type ControlMessage = A2uiMessage;\nvoid webCore;\n`,
  );
  const compilerOptions = {
    target: "ES2023",
    lib: ["ES2023", "DOM", "DOM.Iterable"],
    module: "NodeNext",
    moduleResolution: "NodeNext",
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    types: ["node"],
  };
  await writeFile(
    join(directory, "tsconfig.json"),
    `${JSON.stringify({ compilerOptions, files: ["consumer.mts"] }, null, 2)}\n`,
  );

  await run("pnpm", [
    "install",
    "--ignore-scripts",
    "--strict-peer-dependencies=false",
  ], { cwd: directory });

  const installedRoot = await realpath(join(directory, "node_modules", "@a2ui", "web_core"));
  const installed = JSON.parse(await readFile(join(installedRoot, "package.json"), "utf8"));
  if (installed.version !== webCoreVersion) {
    throw new Error(`control installed @a2ui/web_core ${installed.version}, expected ${webCoreVersion}`);
  }
  // The workspace patch widens this range to accept zod 4; the registry
  // package keeps zod 3 only. A widened range means a patched copy leaked in.
  const zodRange = installed.dependencies?.zod ?? "";
  if (/\^4/.test(zodRange)) {
    throw new Error(`control @a2ui/web_core is patched (zod range "${zodRange}"); it must be the registry package`);
  }

  const argv = ["exec", "tsc", "-p", "tsconfig.json", "--pretty", "false"];
  const tsc = await runCapture("pnpm", argv, { cwd: directory });
  const output = `${tsc.stdout}\n${tsc.stderr}`;
  const diagnostics = output
    .split(/\r?\n/)
    .map((line) => /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/.exec(line.trim()))
    .filter(Boolean)
    .map(([, file, lineNumber, column, code, message]) => ({
      file,
      line: Number(lineNumber),
      column: Number(column),
      code,
      message,
    }));

  if (tsc.exitCode === 0) {
    throw new Error(
      `control consumer type-checked cleanly; registry @a2ui/web_core@${webCoreVersion} was expected to fail with ${UPSTREAM_CONTROL_DIAGNOSTIC}`,
    );
  }
  if (diagnostics.length === 0) {
    throw new Error(`control tsc exited ${tsc.exitCode} without TypeScript diagnostics:\n${output}`);
  }
  const otherDiagnostics = diagnostics.filter(
    ({ code, file }) => code !== UPSTREAM_CONTROL_DIAGNOSTIC || !/@a2ui[\\/]web_core[\\/]/.test(file),
  );
  if (otherDiagnostics.length > 0) {
    throw new Error(
      `control failed for another reason than ${UPSTREAM_CONTROL_DIAGNOSTIC} in @a2ui/web_core:\n${otherDiagnostics.map(({ file, line, column, code, message }) => `${file}(${line},${column}): ${code}: ${message}`).join("\n")}`,
    );
  }

  return {
    package: `@a2ui/web_core@${webCoreVersion}`,
    source: "registry",
    zodDependency: zodRange,
    import: "@a2ui/web_core/v0_9",
    compilerOptions,
    argv: ["pnpm", ...argv],
    exitCode: tsc.exitCode,
    expectedDiagnostic: UPSTREAM_CONTROL_DIAGNOSTIC,
    diagnostics,
    result: "fails-as-required",
  };
}

async function runCapture(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: "0" },
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (typeof error.code !== "number") throw error;
    return { exitCode: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
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
