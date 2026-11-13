import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

/*
 * A2UI 1.0 acceptance browser lane (UPG-1, 2, 4, 5, 6, 7, 8, 17) against the
 * built @prometheus-ags/a2ui-react in Chromium. Run through
 * `pnpm run verify:a2ui-v1 -- --report <file>`, which builds the packages,
 * writes the scratch fixtures and sets A2UI_V1_RESULTS, A2UI_V1_FIXTURES,
 * A2UI_V1_OUT_DIR and a free A2UI_V1_PORT; artifacts never go to a fixed folder.
 */

const workspaceRoot = process.cwd();
const outDir = resolve(process.env.A2UI_V1_OUT_DIR ?? resolve(tmpdir(), "a2ui-v1-verify"));
const port = Number(process.env.A2UI_V1_PORT ?? 4191);
const viteConfig = "tests/a2ui-v1/page/vite.config.mjs";

export default defineConfig({
  testDir: ".",
  testMatch: "a2ui-v1.spec.ts",
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
    env: { A2UI_V1_PORT: String(port), A2UI_V1_OUT_DIR: outDir },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
