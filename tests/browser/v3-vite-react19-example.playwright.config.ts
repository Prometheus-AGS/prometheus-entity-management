import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const evidenceRoot = resolve(
  process.cwd(),
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-vite-react19-example",
);

export default defineConfig({
  testDir: ".",
  testMatch: "v3-vite-react19-example.spec.ts",
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
    baseURL: "http://127.0.0.1:4178",
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
      "pnpm --filter prometheus-entity-management-vite preview --host 127.0.0.1 --port 4178 --strictPort",
    url: "http://127.0.0.1:4178/release-showcase",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
