import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const evidenceDirectory = resolve(
  root,
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example",
);
const reportFlag = process.argv.indexOf("--report");
const reportArgument =
  reportFlag >= 0
    ? process.argv[reportFlag + 1]
    : relative(root, resolve(evidenceDirectory, "task-5-verification.json"));
if (!reportArgument) throw new Error("--report requires a path");
const reportPath = resolve(
  root,
  reportArgument,
);

const temporaryRoot = await mkdtemp(join(tmpdir(), "prometheus-next-packed-"));
const tarballDirectory = join(temporaryRoot, "tarballs");
const packedAppDirectory = join(temporaryRoot, "nextjs-consumer");
const commands = [];

try {
  await mkdir(tarballDirectory, { recursive: true });
  await mkdir(evidenceDirectory, { recursive: true });

  run("next-contract-tests", "node", [
    "--test",
    "tests/release/v3-nextjs-app-router-example.test.mjs",
  ]);
  run("next-focused-units", "pnpm", [
    "run",
    "test:nextjs-app-router:unit",
  ]);
  run("core-package-build", "pnpm", [
    "--filter",
    "@prometheus-ags/entity-graph-core",
    "build",
  ]);
  run("react-package-build", "pnpm", [
    "--filter",
    "@prometheus-ags/prometheus-entity-management",
    "build",
  ]);

  const coreTarball = pack(
    "core-package-pack",
    "packages/entity-graph-core",
  );
  const reactTarball = pack(
    "react-package-pack",
    "packages/entity-graph-react",
  );

  await cp(resolve(root, "examples/nextjs-app"), packedAppDirectory, {
    recursive: true,
    filter: (source) => {
      const name = basename(source);
      return name !== "node_modules" && name !== ".next";
    },
  });

  const sourceNextConfig = readFileSync(
    resolve(root, "examples/nextjs-app/next.config.ts"),
    "utf8",
  );
  const packedNextConfig = readFileSync(
    join(packedAppDirectory, "next.config.ts"),
    "utf8",
  );
  if (packedNextConfig !== sourceNextConfig) {
    throw new Error("packed consumer must preserve the checked-in Next.js config");
  }
  const workspaceSourceAliases = [
    /packages\/entity-graph-(?:core|react)\/src\//,
    /@prometheus-ags\/(?:entity-graph-core|prometheus-entity-management)["']\s*:\s*["'][^"']*\/src\//,
  ];
  if (workspaceSourceAliases.some((pattern) => pattern.test(packedNextConfig))) {
    throw new Error("packed Next.js config contains a workspace source alias");
  }

  const sourceManifest = readJson("examples/nextjs-app/package.json");
  const rootManifest = readJson("package.json");
  const consumerManifest = {
    ...sourceManifest,
    name: "prometheus-nextjs-packed-consumer",
    dependencies: {
      ...sourceManifest.dependencies,
      "@prometheus-ags/entity-graph-core": `file:${coreTarball}`,
      "@prometheus-ags/prometheus-entity-management": `file:${reactTarball}`,
    },
    packageManager: rootManifest.packageManager,
    pnpm: {
      overrides: rootManifest.pnpm?.overrides ?? {},
      onlyBuiltDependencies: ["sharp"],
    },
  };
  await writeFile(
    join(packedAppDirectory, "package.json"),
    `${JSON.stringify(consumerManifest, null, 2)}\n`,
  );
  run(
    "packed-consumer-install",
    "pnpm",
    ["install", "--ignore-scripts", "--strict-peer-dependencies"],
    packedAppDirectory,
  );
  run("packed-consumer-typecheck", "pnpm", ["run", "typecheck"], packedAppDirectory);
  run("packed-consumer-production-build", "pnpm", ["run", "build"], packedAppDirectory);
  run(
    "packed-consumer-browser",
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "--config",
      "tests/browser/v3-nextjs-app-router-example.playwright.config.ts",
    ],
    root,
    {
      PROMETHEUS_NEXT_PACKED_APP: packedAppDirectory,
      PROMETHEUS_NEXT_PORT: "4182",
    },
  );

  const browserEvidence = readJson(
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/browser-evidence.json",
  );
  const playwrightReport = readJson(
    ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/playwright-report.json",
  );
  if (browserEvidence.status !== "pass") {
    throw new Error(`browser evidence status is ${browserEvidence.status}`);
  }
  if (browserEvidence.countsAsPackedPackageEvidence !== true) {
    throw new Error("Next.js browser evidence must originate from candidate tarballs");
  }
  if ((playwrightReport.stats?.unexpected ?? 0) !== 0) {
    throw new Error("Playwright reported unexpected failures");
  }

  const artifactPaths = [
    ...browserEvidence.artifacts.screenshots.map((name) =>
      resolve(evidenceDirectory, name),
    ),
    ...(await walk(resolve(evidenceDirectory, "playwright-artifacts"))).filter(
      (path) => path.endsWith(".zip"),
    ),
  ];
  if (!artifactPaths.some((path) => path.endsWith(".zip"))) {
    throw new Error("Playwright trace metadata is missing");
  }

  const report = {
    schemaVersion: 1,
    change: "v3-nextjs-app-router-example",
    task: 5,
    recordedAt: new Date().toISOString(),
    status: "pass",
    evidenceBoundary: {
      kind: browserEvidence.evidenceKind,
      countsAsPackedPackageEvidence: true,
      installSource: "candidate-tarballs-only",
    },
    versions: {
      node: process.version,
      pnpm: rootManifest.packageManager.replace(/^pnpm@/, "").split("+")[0],
      next: sourceManifest.dependencies.next,
      react: sourceManifest.dependencies.react,
      typescript: sourceManifest.devDependencies.typescript,
      playwright: rootManifest.devDependencies["@playwright/test"],
      coreCandidate: readJson("packages/entity-graph-core/package.json").version,
      reactCandidate: readJson("packages/entity-graph-react/package.json").version,
    },
    packages: [coreTarball, reactTarball].map((path) => ({
      name: basename(path),
      sha256: sha256(path),
    })),
    commands,
    production: {
      typecheck: "pass",
      build: "pass",
      server: "next-start",
      workspaceLinksPresent: false,
      nextConfig: {
        preserved: true,
        workspaceSourceAliasesPresent: false,
        sha256: sha256Text(packedNextConfig),
      },
    },
    browser: {
      status: "pass",
      expectedTests: playwrightReport.stats?.expected ?? null,
      unexpectedTests: playwrightReport.stats?.unexpected ?? null,
      scenarios: browserEvidence.scenarios,
      accessibility: browserEvidence.accessibility,
    },
    artifacts: artifactPaths.map((path) => ({
      path: relative(root, path),
      sha256: sha256(path),
    })),
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `Next.js App Router packed verification passed: ${relative(root, reportPath)}\n`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}

function run(label, command, args, cwd = root, extraEnvironment = {}) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...extraEnvironment, FORCE_COLOR: "0" },
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  commands.push({
    label,
    command: [command, ...args].join(" "),
    cwd: relative(root, cwd) || ".",
    startedAt,
    completedAt: new Date().toISOString(),
    exitCode: result.status,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
  return result.stdout;
}

function pack(label, directory) {
  const stdout = run(label, "pnpm", [
    "--dir",
    resolve(root, directory),
    "pack",
    "--pack-destination",
    tarballDirectory,
    "--json",
  ]);
  const result = JSON.parse(stdout);
  return resolve(result.filename);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((entry) => {
    const candidate = resolve(path, entry);
    return statSync(candidate).isDirectory() ? walk(candidate) : [candidate];
  });
}
