import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const evidenceRoot = resolve(
  process.cwd(),
  ".kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/evidence/hardening-acceptance",
);

export default defineConfig({
  testDir: ".",
  testMatch: "v4-a2ui-runtime-hardening.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: `${evidenceRoot}/playwright-artifacts`,
  reporter: [["line"], ["json", { outputFile: `${evidenceRoot}/playwright-report.json` }]],
  use: {
    baseURL: "http://127.0.0.1:4180",
    trace: "on",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command:
      "pnpm --filter prometheus-agui-activity-lab-example preview --host 127.0.0.1 --port 4180 --strictPort",
    url: "http://127.0.0.1:4180",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
