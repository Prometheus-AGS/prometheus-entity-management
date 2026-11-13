import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

/*
 * Upstream A2UI framework-adapter conformance (core/adapter_conformance.yaml,
 * core/accessibility.yaml) against the built @prometheus-ags/a2ui-react in
 * Chromium. Run through `pnpm run verify:a2ui-conformance -- --report <file>`,
 * which sets the output locations below; artifacts never go to a fixed
 * evidence folder.
 */

const workspaceRoot = process.cwd();
const outDir = resolve(process.env.A2UI_CONFORMANCE_OUT_DIR ?? resolve(tmpdir(), "a2ui-conformance-playwright"));
const port = Number(process.env.A2UI_CONFORMANCE_PORT ?? 4185);
const viteConfig = "tests/conformance/a2ui/harness/vite.config.mjs";

export default defineConfig({
  testDir: ".",
  testMatch: "a2ui-conformance.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: resolve(outDir, "playwright-artifacts"),
  reporter: [["line"], ["json", { outputFile: resolve(outDir, "playwright-report.json") }]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec vite build --config ${viteConfig} && pnpm exec vite preview --config ${viteConfig}`,
    cwd: workspaceRoot,
    env: { A2UI_CONFORMANCE_PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
