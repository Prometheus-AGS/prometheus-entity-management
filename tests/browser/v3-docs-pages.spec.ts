import {expect, test, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({page}).analyze();
  const blocking = results.violations.filter(({impact}) => impact === 'serious' || impact === 'critical');
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}

test('desktop navigation reaches the primary product tracks', async ({page}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', {name: 'One entity graph. Every framework. Realtime everywhere.'})).toBeVisible();
  await expect(page.getByText(/3\.0 RC/).first()).toBeVisible();
  await expectNoSeriousAccessibilityViolations(page);
  for (const label of ['Start Here', 'Concepts', 'Frameworks', 'Integrations', 'Examples', 'Packages & API', 'Evidence']) {
    await expect(page.getByRole('link', {name: label, exact: true}).first()).toBeVisible();
  }

  for (const route of [
    'docs/3.x/frameworks/react-vite/',
    'docs/3.x/frameworks/flutter-riverpod/',
    'docs/3.x/integrations/flint-realtime-fabric/',
    'docs/3.x/evidence/gallery/',
  ]) {
    const response = await page.goto(route);
    expect(response?.ok(), route).toBeTruthy();
    await expect(page.locator('main h1')).toBeVisible();
  }

  await page.goto('./');
  await expect(page).toHaveScreenshot('homepage-desktop.png', {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.08,
  });
});

test('mobile navigation is operable and content does not overflow', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('./');
  await expectNoSeriousAccessibilityViolations(page);
  await page.getByRole('button', {name: /toggle navigation/i}).click();
  await expect(page.getByRole('link', {name: 'Start Here', exact: true}).first()).toBeVisible();
  await expect(page.getByRole('link', {name: 'Frameworks', exact: true}).first()).toBeVisible();
  const dimensions = await page.evaluate(() => ({width: document.documentElement.scrollWidth, viewport: innerWidth}));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
  const mobileSnapshots: Partial<Record<NodeJS.Platform, string>> = {
    darwin: 'homepage-mobile.png',
    linux: 'homepage-mobile-linux.png',
  };
  const mobileSnapshot = mobileSnapshots[process.platform];
  if (!mobileSnapshot) throw new Error(`mobile visual baseline is unsupported on ${process.platform}`);
  await expect(page).toHaveScreenshot(mobileSnapshot, {
    animations: 'disabled',
    fullPage: true,
    maxDiffPixelRatio: 0.08,
  });
});

test('keyboard focus and local search remain operable', async ({page}) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus-visible')).toBeVisible();
  await page.getByRole('link', {name: 'Search', exact: true}).click();
  const searchInput = page.getByRole('searchbox', {name: 'Search terms'});
  await searchInput.fill('normalized');
  await expect(page.getByRole('link', {name: /Why normalized identity/})).toBeVisible({timeout: 10_000});
});

test('generated API references and error routes are published under the repository base path', async ({page, request}) => {
  for (const route of ['api/', 'native-api/dart/', 'native-api/rust/']) {
    const response = await page.goto(route);
    expect(response?.ok(), route).toBeTruthy();
    await expect(page.locator('body')).not.toBeEmpty();
  }
  const response = await page.goto('route-that-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.getByText(/page not found/i).first()).toBeVisible();

  const directoryWithoutIndex = await page.goto('assets/');
  expect(directoryWithoutIndex?.status()).toBe(404);
  const malformed = await request.get('%ZZ');
  expect(malformed.status()).toBe(400);
  const homepage = await page.goto('./');
  expect(homepage?.ok()).toBeTruthy();
});
