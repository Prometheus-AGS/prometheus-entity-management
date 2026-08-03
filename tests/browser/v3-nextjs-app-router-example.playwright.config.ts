import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const packedApp = process.env.PROMETHEUS_NEXT_PACKED_APP;
if (!packedApp) {
  throw new Error("PROMETHEUS_NEXT_PACKED_APP is required");
}

const port = Number(process.env.PROMETHEUS_NEXT_PORT ?? "4182");
const baseURL = `http://127.0.0.1:${port}`;
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
  timeout: 120_000,
  expect: { timeout: 20_000 },
  outputDir: `${evidenceRoot}/playwright-artifacts`,
  reporter: [
    ["line"],
    ["json", { outputFile: `${evidenceRoot}/playwright-report.json` }],
  ],
  use: {
    baseURL,
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
    command: `pnpm --dir ${JSON.stringify(packedApp)} start --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/next-runtime`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
