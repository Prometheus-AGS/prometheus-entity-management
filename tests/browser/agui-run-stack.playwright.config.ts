import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

/*
 * UPG-10, UPG-11 and UPG-12 (phase-a2ui-1-0-agui-upgrade): AG-UI 1.0 run
 * streams from a scripted agent (encoded by @ag-ui/encoder 1.0.x, consumed by
 * @ag-ui/client 1.0.x) drive the BUILT @prometheus-ags/a2ui-react `./ag-ui`
 * components in Chromium. Run through
 * `node scripts/verify-agui-run-stack.mjs --report <file>`, which sets the
 * output locations below.
 */

const workspaceRoot = process.cwd();
const outDir = resolve(process.env.AGUI_RUN_STACK_OUT_DIR ?? resolve(tmpdir(), "agui-run-stack-playwright"));
const port = Number(process.env.AGUI_RUN_STACK_PORT ?? 4211);
const agentPort = Number(process.env.AGUI_RUN_STACK_AGENT_PORT ?? 4212);
const viteConfig = "tests/agui-run-stack/vite.config.mjs";

export default defineConfig({
  testDir: ".",
  testMatch: "agui-run-stack.spec.ts",
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
  webServer: [
    {
      command: "node tests/agui-run-stack/agent-server.mjs",
      cwd: workspaceRoot,
      env: { AGUI_RUN_STACK_AGENT_PORT: String(agentPort) },
      url: `http://127.0.0.1:${agentPort}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm exec vite build --config ${viteConfig} && pnpm exec vite preview --config ${viteConfig}`,
      cwd: workspaceRoot,
      env: {
        AGUI_RUN_STACK_PORT: String(port),
        ...(process.env.AGUI_RUN_STACK_RESOLUTION ? { AGUI_RUN_STACK_RESOLUTION: process.env.AGUI_RUN_STACK_RESOLUTION } : {}),
      },
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
