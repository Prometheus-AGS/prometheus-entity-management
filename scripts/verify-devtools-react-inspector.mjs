import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  validatePackedManifestData,
  validateTarballFileList,
} from "./package-contract-validation.mjs";
import { PUBLIC_PACKAGES } from "./public-packages.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");
const prepareStudyFlag = process.argv.indexOf("--prepare-study");
const prepareStudyPath = prepareStudyFlag >= 0 ? process.argv[prepareStudyFlag + 1] : null;
if (prepareStudyFlag >= 0 && !prepareStudyPath) throw new Error("--prepare-study requires an empty output directory path");
if (prepareStudyPath && reportPath) throw new Error("--prepare-study and --report cannot be combined");

const corePackage = requirePackage("@prometheus-ags/entity-graph-core");
const reactPackage = requirePackage("@prometheus-ags/prometheus-entity-management");
const retainedStudyRoot = prepareStudyPath ? resolve(workspaceRoot, prepareStudyPath) : null;
const temporaryRoot = retainedStudyRoot ?? await mkdtemp(join(tmpdir(), "prometheus-react-devtools-"));
const tarballDirectory = join(temporaryRoot, "tarballs");
const consumerRoot = join(temporaryRoot, "consumer");
const evidenceDirectory = resolve(
  workspaceRoot,
  ".kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-react-inspector",
);

const report = {
  schemaVersion: 1,
  gateVersion: "v3-devtools-react-inspector/2",
  gateStartedAt: new Date().toISOString(),
  generatedAt: null,
  boundary: "packed-vite-next-browser-acceptance",
  source: { commit: await gitHead(), dirtyTaskFiles: await gitTaskFilesDirty() },
  thresholdSnapshot: null,
  packages: {
    core: { build: "pending", pack: "pending", sha256: null },
    react: { build: "pending", pack: "pending", sha256: null },
  },
  consumers: {
    install: "pending",
    viteTypecheck: "pending",
    nextTypecheck: "pending",
    viteProductionBuild: "pending",
    nextProductionBuild: "pending",
    productionExclusion: "pending",
  },
  browser: { status: "pending", receipt: null },
};

async function main() {
try {
  if (retainedStudyRoot) await createEmptyStudyRoot(retainedStudyRoot);
  await mkdir(tarballDirectory, { recursive: true });
  await mkdir(evidenceDirectory, { recursive: true });

  await run("pnpm", ["--filter", corePackage.name, "build"]);
  report.packages.core.build = "pass";
  await run("pnpm", ["--filter", reactPackage.name, "build"]);
  report.packages.react.build = "pass";

  const coreTarball = await packAndValidate(corePackage);
  report.packages.core.pack = "pass";
  report.packages.core.sha256 = await sha256File(coreTarball);
  const reactTarball = await packAndValidate(reactPackage);
  report.packages.react.pack = "pass";
  report.packages.react.sha256 = await sha256File(reactTarball);

  await writeConsumerWorkspace(consumerRoot, coreTarball, reactTarball);
  await run("pnpm", ["install", "--ignore-scripts", "--config.strict-peer-dependencies=true"], {
    cwd: consumerRoot,
  });
  report.consumers.install = "pass";

  if (retainedStudyRoot) {
    await writeStudyLaunchInstructions(retainedStudyRoot);
    process.stdout.write(`[devtools-react-inspector] STUDY FIXTURE READY: ${retainedStudyRoot}\n`);
    process.stdout.write(`Run: pnpm --dir ${join(consumerRoot, "apps/vite")} dev --host 127.0.0.1 --port 4191\n`);
    process.stdout.write("Open: http://127.0.0.1:4191/?study=1\n");
    return;
  }

  await run("pnpm", ["--dir", join(consumerRoot, "apps/vite"), "typecheck"]);
  report.consumers.viteTypecheck = "pass";
  await run("pnpm", ["--dir", join(consumerRoot, "apps/next"), "typecheck"]);
  report.consumers.nextTypecheck = "pass";

  await run("pnpm", ["--dir", join(consumerRoot, "apps/vite"), "build"], {
    env: productionEnvironment(),
  });
  report.consumers.viteProductionBuild = "pass";
  await run("pnpm", ["--dir", join(consumerRoot, "apps/next"), "build"], {
    env: productionEnvironment(),
  });
  report.consumers.nextProductionBuild = "pass";

  await assertProductionExclusion(join(consumerRoot, "apps/vite/dist"));
  await assertProductionExclusion(join(consumerRoot, "apps/next/.next/static"));
  report.consumers.productionExclusion = "pass";

  const playwright = await run("pnpm", [
    "exec",
    "playwright",
    "test",
    "--config",
    "tests/browser/v3-devtools-react-inspector.playwright.config.ts",
  ], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      PROMETHEUS_DEVTOOLS_PACKED_ROOT: consumerRoot,
      PROMETHEUS_DEVTOOLS_EVIDENCE: evidenceDirectory,
    },
    maxBuffer: 40 * 1024 * 1024,
  });
  process.stdout.write(playwright.stdout);
  const browserReceipt = JSON.parse(await readFile(join(evidenceDirectory, "task-11-browser-evidence.json"), "utf8"));
  if (browserReceipt.status !== "pass") throw new Error("browser acceptance receipt did not pass");
  if (browserReceipt.gateVersion !== report.gateVersion) {
    throw new Error(`browser receipt gate version ${browserReceipt.gateVersion ?? "missing"} does not match ${report.gateVersion}`);
  }
  if (!browserReceipt.thresholds) throw new Error("browser acceptance receipt is missing its threshold snapshot");
  report.thresholdSnapshot = browserReceipt.thresholds;
  report.browser = { status: "pass", receipt: browserReceipt };

  if (reportPath) {
    report.generatedAt = new Date().toISOString();
    const absolute = resolve(workspaceRoot, reportPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write("[devtools-react-inspector] PASS: packed Vite/Next/browser acceptance gate.\n");
} catch (error) {
  if (reportPath) {
    report.generatedAt = new Date().toISOString();
    const absolute = resolve(workspaceRoot, reportPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify({ ...report, failure: error.message }, null, 2)}\n`);
  }
  throw error;
} finally {
  if (!retainedStudyRoot) await rm(temporaryRoot, { recursive: true, force: true });
}
}

async function createEmptyStudyRoot(path) {
  try {
    await stat(path);
    throw new Error(`study output already exists: ${path}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(path), { recursive: true });
  await mkdir(path);
}

async function writeStudyLaunchInstructions(path) {
  const sourceCommit = await gitHead();
  await writeFile(join(path, "STUDY-FIXTURE.md"), `# Generated React DevTools study fixture

Source commit: \`${sourceCommit}\`

Launch the Vite development consumer:

\`\`\`bash
pnpm --dir ${join(consumerRoot, "apps/vite")} dev --host 127.0.0.1 --port 4191
\`\`\`

Open <http://127.0.0.1:4191/?study=1>. The query parameter seeds the fixed
dirty entity and all three registered views without exposing their identifiers
in the host UI. Record the source commit in every participant result.
`);
}

function requirePackage(name) {
  const selected = PUBLIC_PACKAGES.find((entry) => entry.name === name);
  if (!selected) throw new Error(`public package inventory is missing ${name}`);
  return selected;
}

async function gitHead() {
  return (await run("git", ["rev-parse", "HEAD"])).stdout.trim();
}

async function gitTaskFilesDirty() {
  const status = await run("git", [
    "status",
    "--porcelain",
    "--",
    "packages/entity-graph-core",
    "packages/entity-graph-react",
    "examples/vite-app/src/main.tsx",
    "examples/nextjs-app/src/components/entity-graph-devtools.tsx",
    "examples/nextjs-app/src/components/graph-hydration-provider.tsx",
    "scripts/verify-devtools-react-inspector.mjs",
    "tests/browser/v3-devtools-react-inspector.playwright.config.ts",
    "tests/browser/v3-devtools-react-inspector.spec.ts",
  ]);
  return status.stdout.trim().length > 0;
}

async function packAndValidate(selectedPackage) {
  const packageDirectory = join(workspaceRoot, selectedPackage.directory);
  const packed = await run("pnpm", [
    "--dir",
    packageDirectory,
    "pack",
    "--pack-destination",
    tarballDirectory,
    "--json",
  ]);
  const result = JSON.parse(packed.stdout);
  const tarballPath = resolve(result.filename);
  validateTarballFileList(selectedPackage, result.files.map(({ path }) => path).sort());
  const manifest = await run("tar", ["-xOf", tarballPath, "package/package.json"]);
  validatePackedManifestData(JSON.parse(manifest.stdout), workspaceRoot);
  return tarballPath;
}

async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function productionEnvironment() {
  return {
    ...process.env,
    FORCE_COLOR: "0",
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

async function assertProductionExclusion(directory) {
  const files = await recursiveFiles(directory);
  const javascript = files.filter((path) => /\.(?:js|mjs|cjs)$/.test(path));
  if (javascript.length === 0) throw new Error(`no JavaScript bundles found under ${directory}`);
  const forbidden = ["Graph Pulse", "pem-inspector", "pem-graph-pulse", "Prometheus Graph DevTools"];
  for (const path of javascript) {
    const source = await readFile(path, "utf8");
    for (const marker of forbidden) {
      if (source.includes(marker)) {
        throw new Error(`production bundle ${path} retained DevTools marker ${JSON.stringify(marker)}`);
      }
    }
  }
}

async function recursiveFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory)) {
    const path = join(directory, entry);
    const metadata = await stat(path);
    if (metadata.isDirectory()) result.push(...await recursiveFiles(path));
    else result.push(path);
  }
  return result;
}

async function writeConsumerWorkspace(root, coreTarball, reactTarball) {
  await mkdir(join(root, "apps/vite/src"), { recursive: true });
  await mkdir(join(root, "apps/next/app"), { recursive: true });
  await writeJson(join(root, "package.json"), {
    name: "prometheus-devtools-packed-consumers",
    private: true,
    packageManager: "pnpm@10.32.1",
  });
  await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - 'apps/*'\n");

  const sharedDependencies = {
    "@prometheus-ags/entity-graph-core": `file:${coreTarball}`,
    "@prometheus-ags/prometheus-entity-management": `file:${reactTarball}`,
    react: "19.2.8",
    "react-dom": "19.2.8",
  };

  await writeJson(join(root, "apps/vite/package.json"), {
    name: "prometheus-devtools-packed-vite",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc --noEmit && vite build",
      preview: "vite preview",
      typecheck: "tsc --noEmit",
    },
    dependencies: sharedDependencies,
    devDependencies: {
      "@types/react": "19.2.18",
      "@types/react-dom": "19.2.4",
      typescript: "6.0.2",
      vite: "8.2.0",
    },
  });
  await writeJson(join(root, "apps/vite/tsconfig.json"), browserTsconfig());
  await writeFile(
    join(root, "apps/vite/index.html"),
    "<!doctype html><html lang=\"en\"><head><title>Packed Prometheus DevTools acceptance</title></head><body><div id=\"root\"></div><script type=\"module\" src=\"/src/main.tsx\"></script></body></html>\n",
  );
  await writeFile(join(root, "apps/vite/src/main.tsx"), viteSource);

  await writeJson(join(root, "apps/next/package.json"), {
    name: "prometheus-devtools-packed-next",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      ...sharedDependencies,
      next: "16.2.12",
    },
    devDependencies: {
      "@types/node": "22.20.1",
      "@types/react": "19.2.18",
      "@types/react-dom": "19.2.4",
      typescript: "6.0.2",
    },
  });
  await writeJson(join(root, "apps/next/tsconfig.json"), {
    compilerOptions: {
      target: "ES2022",
      lib: ["DOM", "DOM.Iterable", "ES2022"],
      allowJs: false,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "react-jsx",
      incremental: true,
      plugins: [{ name: "next" }],
    },
    include: ["next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  });
  await writeFile(join(root, "apps/next/next-env.d.ts"), "/// <reference types=\"next\" />\n/// <reference types=\"next/image-types/global\" />\n");
  await writeFile(join(root, "apps/next/app/layout.tsx"), nextLayoutSource);
  await writeFile(join(root, "apps/next/app/page.tsx"), nextPageSource);
  await writeFile(join(root, "apps/next/app/graph-demo.tsx"), nextClientSource);
}

function browserTsconfig() {
  return {
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: ["vite/client"],
    },
    include: ["src"],
  };
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
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

const viteSource = String.raw`
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  graphStore,
  serializeKey,
  useEntityList,
} from "@prometheus-ags/prometheus-entity-management";

if (import.meta.env.DEV) {
  void import("@prometheus-ags/prometheus-entity-management/devtools/auto");
}

type Order = { id: string; status: string; total: number; customerId: string };
const studyMode = new URLSearchParams(window.location.search).has("study");
const keys = ["active", "all", "attention"].map((name) => serializeKey(["orders", name]));
const initialOrder: Order = { id: "o-1042", status: "pending", total: 42, customerId: "c-22" };
const graph = graphStore.getState();
graph.ingestFetchedList("Order", [{ id: initialOrder.id, data: initialOrder }], {
  lists: keys.map((key) => ({ key, ids: [] })),
});

declare global {
  interface Window {
    __pemAcceptance: {
      batch(): void;
      includeOrder(): void;
      dirty(): void;
      startStress(): Promise<{ emitted: number; durationMs: number; longTasks: number[] }>;
    };
  }
}

function OrderView({ name, queryKey, studyIndex }: { name: string; queryKey: string; studyIndex: number }) {
  const result = useEntityList<Order, Order>({
    type: "Order",
    queryKey: ["orders", name],
    enabled: true,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return <section aria-label={(studyMode ? "Rendered surface " + studyIndex : name + " orders")} data-query-key={queryKey}>
    <h2>{studyMode ? "Rendered application surface " + studyIndex : name}</h2>
    <ol>{result.items.map((order, index) => <li key={order.id}>{studyMode ? "Record " + (index + 1) : order.id + " · " + order.status}</li>)}</ol>
  </section>;
}

function App() {
  useEffect(() => {
    const acceptance = {
      batch() {
        const entries = Array.from({ length: 12 }, (_, index) => ({
          id: "batch-" + String(index + 1).padStart(2, "0"),
          data: { id: "batch-" + String(index + 1).padStart(2, "0"), status: "queued", total: index + 1, customerId: "c-batch" },
        }));
        graphStore.getState().ingestFetchedList("Order", entries, {
          lists: keys.map((key) => ({ key, ids: entries.map(({ id }) => id) })),
        });
      },
      includeOrder() {
        const state = graphStore.getState();
        for (const key of keys) state.insertIdInList(key, "o-1042", "start");
      },
      dirty() {
        graphStore.getState().patchEntity("Order", "o-1042", { status: "approved" });
      },
      async startStress() {
        const longTasks: number[] = [];
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) longTasks.push(entry.duration);
        });
        try { observer.observe({ type: "longtask", buffered: true }); } catch { /* unsupported browser */ }
        const startedAt = performance.now();
        let emitted = 0;
        await new Promise<void>((resolve) => {
          const timer = window.setInterval(() => {
            const elapsed = performance.now() - startedAt;
            const expected = Math.min(5_000, Math.floor(elapsed * 0.5));
            while (emitted < expected) {
              emitted += 1;
              graphStore.getState().upsertEntity("Perf", "pulse", { id: "pulse", sequence: emitted });
            }
            if (elapsed >= 10_000) {
              while (emitted < 5_000) {
                emitted += 1;
                graphStore.getState().upsertEntity("Perf", "pulse", { id: "pulse", sequence: emitted });
              }
              window.clearInterval(timer);
              resolve();
            }
          }, 10);
        });
        observer.disconnect();
        return { emitted, durationMs: performance.now() - startedAt, longTasks };
      },
    };
    window.__pemAcceptance = acceptance;
    if (studyMode) {
      acceptance.batch();
      acceptance.includeOrder();
      acceptance.dirty();
    }
  }, []);

  return <main>
    <h1>{studyMode ? "Prometheus DevTools study fixture" : "Packed Vite entity graph"}</h1>
    <p>{studyMode ? "Use Graph DevTools to diagnose the seeded graph state." : "Three public list hooks feed one normalized graph."}</p>
    {keys.map((key, index) => <OrderView key={key} name={["active", "all", "attention"][index]} queryKey={key} studyIndex={index + 1} />)}
  </main>;
}

createRoot(document.getElementById("root")!).render(<App />);
`;

const nextLayoutSource = String.raw`
import type { ReactNode } from "react";
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
`;

const nextPageSource = String.raw`
import { GraphDemo } from "./graph-demo";
export default function Page() {
  return <main><h1>Packed Next entity graph</h1><GraphDemo /></main>;
}
`;

const nextClientSource = String.raw`
"use client";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  createGraphStore,
  GraphStoreProvider,
  serializeKey,
  useEntityList,
} from "@prometheus-ags/prometheus-entity-management";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";

type DevtoolsHost = ComponentType<{ mode: "auto"; store: GraphStore }>;
const store = createGraphStore();
const queryKey = serializeKey(["orders", "next"]);
store.getState().ingestFetchedList("Order", [{ id: "next-1", data: { id: "next-1", status: "server" } }], {
  lists: [{ key: queryKey }],
});

function Runtime() {
  const orders = useEntityList<Record<string, unknown>, Record<string, unknown>>({
    type: "Order",
    queryKey: ["orders", "next"],
    enabled: true,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [Host, setHost] = useState<DevtoolsHost | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let active = true;
    void import("@prometheus-ags/prometheus-entity-management/devtools").then((module) => {
      if (active) setHost(() => module.EntityGraphDevtools as DevtoolsHost);
    });
    return () => { active = false; };
  }, []);
  return <>
    <p data-testid="hydrated">Hydrated rows: {orders.items.length}</p>
    {Host ? <Host mode="auto" store={store} /> : null}
  </>;
}

export function GraphDemo() {
  return <GraphStoreProvider store={store}><Runtime /></GraphStoreProvider>;
}
`;

await main();
