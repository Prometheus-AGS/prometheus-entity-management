import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const packedRoot = process.env.PROMETHEUS_DEVTOOLS_PACKED_ROOT;
if (!packedRoot) throw new Error("PROMETHEUS_DEVTOOLS_PACKED_ROOT is required");
const evidenceRoot = resolve(
  process.env.PROMETHEUS_DEVTOOLS_EVIDENCE ??
    ".kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-react-inspector",
);
const viteDirectory = resolve(packedRoot, "apps/vite");
const nextDirectory = resolve(packedRoot, "apps/next");

export default defineConfig({
  testDir: ".",
  testMatch: "v3-devtools-react-inspector.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  outputDir: `${evidenceRoot}/task-11-playwright-artifacts`,
  reporter: [
    ["line"],
    ["json", { outputFile: `${evidenceRoot}/task-11-playwright-report.json` }],
  ],
  use: {
    trace: "on",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `pnpm --dir ${JSON.stringify(viteDirectory)} dev --host 127.0.0.1 --port 4191 --strictPort`,
      url: "http://127.0.0.1:4191",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `pnpm --dir ${JSON.stringify(viteDirectory)} preview --host 127.0.0.1 --port 4192 --strictPort`,
      url: "http://127.0.0.1:4192",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `NEXT_TELEMETRY_DISABLED=1 pnpm --dir ${JSON.stringify(nextDirectory)} dev --hostname 127.0.0.1 --port 4193`,
      url: "http://127.0.0.1:4193",
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `NEXT_TELEMETRY_DISABLED=1 pnpm --dir ${JSON.stringify(nextDirectory)} start --hostname 127.0.0.1 --port 4194`,
      url: "http://127.0.0.1:4194",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
