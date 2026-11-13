import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { A2UI_EXAMPLES } from "../a2ui-examples/examples.mjs";

/**
 * UPG-14 browser run: each built example served by its own `vite preview` on a
 * scratch port, driven in Chromium. Run it through
 * `pnpm run verify:a2ui-examples -- --report <file>`, which builds the examples
 * first and sets:
 *
 * - `A2UI_EXAMPLES_ARTIFACTS`: where captures, screenshots and the JSON report go;
 * - `A2UI_EXAMPLES_ONLY`: comma-separated example ids whose build succeeded.
 */
const artifactsDirectory = resolve(
  process.env.A2UI_EXAMPLES_ARTIFACTS ?? resolve(tmpdir(), "a2ui-examples-artifacts"),
);
const only = (process.env.A2UI_EXAMPLES_ONLY ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0);
const selected = A2UI_EXAMPLES.filter(
  (example: { id: string }) => only.length === 0 || only.includes(example.id),
);

export default defineConfig({
  testDir: ".",
  testMatch: "a2ui-examples.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  outputDir: resolve(artifactsDirectory, "playwright-output"),
  reporter: [
    ["line"],
    ["json", { outputFile: resolve(artifactsDirectory, "playwright-report.json") }],
  ],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: selected.map((example: { packageName: string; port: number }) => ({
    command: `pnpm --filter ${example.packageName} preview --host 127.0.0.1 --port ${example.port} --strictPort`,
    url: `http://127.0.0.1:${example.port}`,
    reuseExistingServer: false,
    timeout: 90_000,
  })),
});
