import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeDevtoolsEvent, type DevtoolsEvent } from "./engine";
import { createGraphStore } from "./graph";
import { createGraphTransaction } from "./graph-actions";
import { isGraphDevtoolsEmissionEnabled, resolveDevtoolsEmission, setGraphDevtoolsEmission } from "./devtools-gate";

function collect(run: () => void): DevtoolsEvent[] {
  const events: DevtoolsEvent[] = [];
  const unsubscribe = subscribeDevtoolsEvent((event) => events.push(event));
  run();
  unsubscribe();
  return events;
}

function touch() {
  const tx = createGraphTransaction(createGraphStore());
  tx.upsertEntity("T", "1", { v: 1 }).patchEntity("T", "1", { p: 1 }).clearPatch("T", "1");
}

afterEach(() => {
  setGraphDevtoolsEmission(undefined);
  vi.unstubAllEnvs();
});

describe("devtools emission gate", () => {
  it("emits by default in a non-production test environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(isGraphDevtoolsEmissionEnabled()).toBe(true);
    expect(collect(touch).map((e) => e.kind)).toEqual(["upsert", "patch", "clearPatch"]);
  });

  it("emits nothing when NODE_ENV is production, even under a Vite dev flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isGraphDevtoolsEmissionEnabled()).toBe(false);
    expect(collect(touch)).toEqual([]);
  });

  it("an explicit opt-in enables emission even in production; opt-out disables it in development", () => {
    vi.stubEnv("NODE_ENV", "production");
    setGraphDevtoolsEmission(true);
    expect(collect(touch)).toHaveLength(3);
    vi.stubEnv("NODE_ENV", "development");
    setGraphDevtoolsEmission(false);
    expect(collect(touch)).toEqual([]);
  });

  it("decides by build flag, then override, then process NODE_ENV, then the Vite dev flag", () => {
    const env = { buildFlag: undefined, override: undefined, processEnv: undefined, viteDev: undefined };
    const prod = { NODE_ENV: "production" };
    // A plain browser production bundle: no process, no Vite dev flag (the 4.3.0 bug: this emitted).
    expect(resolveDevtoolsEmission(env)).toBe(false);
    expect(resolveDevtoolsEmission({ ...env, viteDev: true })).toBe(true);
    // Node/SSR keep the previous rule, including an unset NODE_ENV.
    expect(resolveDevtoolsEmission({ ...env, processEnv: {} })).toBe(true);
    expect(resolveDevtoolsEmission({ ...env, processEnv: { NODE_ENV: "development" } })).toBe(true);
    expect(resolveDevtoolsEmission({ ...env, processEnv: prod, viteDev: true })).toBe(false);
    expect(resolveDevtoolsEmission({ ...env, processEnv: prod, override: true })).toBe(true);
    expect(resolveDevtoolsEmission({ ...env, processEnv: {}, override: false })).toBe(false);
    expect(resolveDevtoolsEmission({ ...env, buildFlag: false, override: true })).toBe(false);
    expect(resolveDevtoolsEmission({ ...env, buildFlag: true, processEnv: prod })).toBe(true);
    expect(resolveDevtoolsEmission({ ...env, buildFlag: true, override: false })).toBe(false);
  });
});

describe("devtools emission is removed from production bundles", () => {
  const coreRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const repoRoot = path.resolve(coreRoot, "../..");

  async function bundle(define: Record<string, string>): Promise<string> {
    // esbuild is the bundler tsup (a root dev dependency) already ships with.
    const fromRoot = createRequire(path.join(repoRoot, "package.json"));
    const esbuild = createRequire(fromRoot.resolve("tsup"))("esbuild") as typeof import("esbuild");
    const result = await esbuild.build({
      stdin: {
        contents: `import { createGraphTransaction } from "./src/graph-actions";
          const tx = createGraphTransaction();
          tx.upsertEntity("T", "1", {}).patchEntity("T", "1", {}).clearPatch("T", "1");`,
        resolveDir: coreRoot,
        loader: "ts",
      },
      bundle: true,
      write: false,
      minify: true,
      format: "esm",
      platform: "browser",
      define,
      logLevel: "silent",
    });
    return result.outputFiles[0].text;
  }

  const MARKERS = ['kind:"upsert"', 'kind:"patch"', 'kind:"clearPatch"'];

  it("the build-time flag false removes every emission site", async () => {
    const code = await bundle({ __PROMETHEUS_ENTITY_GRAPH_DEVTOOLS__: "false" });
    for (const marker of MARKERS) expect(code).not.toContain(marker);
  });

  it("without the flag the emission sites are present (the check above is meaningful)", async () => {
    const code = await bundle({ "process.env.NODE_ENV": '"development"' });
    for (const marker of MARKERS) expect(code).toContain(marker);
  });
});
