import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const evidenceRoot = resolve(
  process.cwd(),
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example",
);

export default defineConfig({
  testDir: ".",
  testMatch: "v3-nextjs-app-router-example.spec.ts",
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
    baseURL: "http://127.0.0.1:4180",
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
      "pnpm --filter prometheus-entity-management-nextjs exec next start --port 4180 --hostname 127.0.0.1",
    url: "http://127.0.0.1:4180/release-showcase",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
