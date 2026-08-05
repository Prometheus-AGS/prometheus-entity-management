import {defineConfig} from '@playwright/test';

const deployedBaseUrl = process.env.DOCS_BASE_URL;
const localBaseUrl = 'http://127.0.0.1:4177/prometheus-entity-management/';

export default defineConfig({
  testDir: '.',
  testMatch: 'v3-docs-pages.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  use: {
    baseURL: deployedBaseUrl ?? localBaseUrl,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: deployedBaseUrl ? undefined : {
    command: 'node ../../website/scripts/serve-built-site.mjs',
    url: localBaseUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
