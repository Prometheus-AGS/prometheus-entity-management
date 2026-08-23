import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const evidenceRoot = resolve(
  process.cwd(),
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example",
);

export default defineConfig({
  testDir: ".",
  testMatch: "v3-agentic-a2ui-example.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: `${evidenceRoot}/playwright-artifacts`,
  reporter: [
    ["line"],
    ["json", { outputFile: `${evidenceRoot}/playwright-report.json` }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4179",
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "pnpm --filter prometheus-agentic-a2ui-example preview --host 127.0.0.1 --port 4179 --strictPort",
    url: "http://127.0.0.1:4179",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
