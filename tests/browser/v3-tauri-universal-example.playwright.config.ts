import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const evidenceRoot = resolve(
  process.cwd(),
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example",
);

export default defineConfig({
  testDir: ".",
  testMatch: "v3-tauri-universal-example.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: `${evidenceRoot}/playwright-artifacts`,
  reporter: [
    ["line"],
    ["json", { outputFile: `${evidenceRoot}/playwright-report.json` }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4182",
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command:
      "pnpm --filter prometheus-entity-management-tauri exec vite preview --port 4182 --host 127.0.0.1 --strictPort",
    url: "http://127.0.0.1:4182/",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
