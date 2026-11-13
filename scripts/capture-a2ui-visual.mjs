#!/usr/bin/env node
/**
 * Capture the A2UI protocol-bridge visual evidence into a fresh folder.
 *
 *   pnpm run capture:a2ui-visual -- --out <dir>
 *   A2UI_VISUAL_EVIDENCE=<dir> pnpm run verify:a2ui-bridge
 *
 * Produces the evidence set `scripts/verify-a2ui-visual-evidence.mjs` checks,
 * from the built packages in Chromium:
 *
 * 1. builds `@prometheus-ags/a2ui-react` and its workspace dependencies (the
 *    certification page imports their `dist/index.mjs`);
 * 2. bundles and serves the certification page `tests/fixtures/a2ui-browser`
 *    with Vite (production build + preview on a scratch port);
 * 3. records, in Chromium: desktop and 390px screenshots, a keyboard-only
 *    policy run (Playwright trace + WebM video), focus order and final focus
 *    ring, policy outcomes, axe results, console errors, contrast ratios, target
 *    sizes, and the A2UI envelope versions the page fed its runtime;
 * 4. writes `<out>/manifest.json` with every file's sha256.
 *
 * The manifest is written only when the whole capture succeeds; a failed run
 * leaves no manifest, so the verifier fails on it. Exit codes: 0 success,
 * 1 capture failure, 2 usage error. Flutter goldens are out of scope.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { A2UI_MESSAGE_KEYS, collectEnvelopes } from "../tests/a2ui-examples/envelope-assertion.mjs";
import { installA2uiTap, readA2uiTap } from "../tests/a2ui-examples/page-tap.mjs";

const workspaceRoot = resolve(import.meta.dirname, "..");
const fixtureRoot = join(workspaceRoot, "tests/fixtures/a2ui-browser");
/** Vite, its React plugin and React are resolved from an example that depends on them; the root does not. */
const toolchainPackage = join(workspaceRoot, "examples/agentic-a2ui-app");
const PREVIEW_PORT = Number(process.env.A2UI_VISUAL_PORT ?? 4211);
const ROUTE = `http://127.0.0.1:${PREVIEW_PORT}/`;
const ARTIFACT_ENTRY = "packages/a2ui-react/dist/index.mjs";
const SUPPORTING_ARTIFACTS = ["packages/entity-graph-core/dist/index.mjs"];
const KEYS = ["Tab", "Tab", "Enter", "Tab", "Enter", "Tab", "Enter"];
const ACTION_NAMES = ["Save allowlisted order", "Attempt restricted field", "Request destructive delete"];
const MANIFEST_NAME = "manifest.json";

function usage(message) {
  process.stderr.write(`[a2ui-visual-capture] ${message}\n`);
  process.stderr.write("usage: pnpm run capture:a2ui-visual -- --out <dir>\n");
  process.exit(2);
}

function parseArgs(argv) {
  let out;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--out") {
      out = argv[index + 1];
      index += 1;
    } else if (argument.startsWith("--out=")) {
      out = argument.slice("--out=".length);
    } else {
      usage(`unknown argument: ${argument}`);
    }
  }
  if (!out) usage("--out <dir> is required");
  return { out: resolve(out) };
}

const { out: outDirectory } = parseArgs(process.argv.slice(2));
if (existsSync(outDirectory) && readdirSync(outDirectory).length > 0) {
  usage(`--out ${outDirectory} must be absent or empty; evidence is never mixed with an older capture`);
}

const commands = [];

function run(label, command, args) {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[a2ui-visual-capture] ${label}: ${[command, ...args].join(" ")}\n`);
  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    env: { ...process.env, FORCE_COLOR: "0" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const exitCode = result.error ? null : result.status;
  commands.push({
    label,
    command: [command, ...args].join(" "),
    startedAt,
    completedAt: new Date().toISOString(),
    exitCode,
  });
  if (exitCode !== 0) throw new Error(`${label} failed with exit code ${exitCode}`);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function pngSize(path) {
  const png = readFileSync(path);
  if (png.subarray(1, 4).toString("ascii") !== "PNG") throw new Error(`${path} is not a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function pickImport(exportsField) {
  if (typeof exportsField === "string") return exportsField;
  if (Array.isArray(exportsField)) {
    for (const candidate of exportsField) {
      const picked = pickImport(candidate);
      if (picked) return picked;
    }
    return null;
  }
  if (exportsField && typeof exportsField === "object") {
    for (const key of ["import", "node", "default"]) {
      if (key in exportsField) {
        const picked = pickImport(exportsField[key]);
        if (picked) return picked;
      }
    }
  }
  return null;
}

function packageDirectory(name) {
  const linked = join(toolchainPackage, "node_modules", ...name.split("/"));
  if (!existsSync(linked)) {
    throw new Error(`${name} is not installed for ${relative(workspaceRoot, toolchainPackage)}; run pnpm install`);
  }
  return realpathSync(linked);
}

async function importFromToolchain(name) {
  const directory = packageDirectory(name);
  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  const exportsField = manifest.exports?.["."] ?? manifest.exports;
  const entry = pickImport(exportsField) ?? manifest.module ?? manifest.main;
  if (!entry) throw new Error(`cannot find the ESM entry of ${name}`);
  return import(pathToFileURL(join(directory, entry)).href);
}

/** Contrast ratios, computed in the page from the rendered colors. */
function measureContrast(actionNames) {
  const parse = (value) => {
    const match = /rgba?\(([^)]+)\)/.exec(value);
    if (!match) return null;
    const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const background = (element) => {
    for (let node = element; node; node = node.parentElement) {
      const color = parse(getComputedStyle(node).backgroundColor);
      if (color && color.a > 0) return color;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ratio = (element) => {
    const foreground = parse(getComputedStyle(element).color);
    const back = background(element);
    if (!foreground) return null;
    const [light, dark] = [luminance(foreground), luminance(back)].sort((a, b) => b - a);
    return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
  };
  const button = (name) =>
    [...document.querySelectorAll(".official-surface button")].find(
      (candidate) => (candidate.getAttribute("aria-label") ?? candidate.textContent ?? "").includes(name),
    ) ?? null;
  const pairs = [
    ["body", document.body],
    ["lede", document.querySelector(".lede")],
    ["protocol-chip", document.querySelector(".protocol-chip")],
    ["primary-button", button(actionNames[0])],
    ["destructive-button", button(actionNames[2])],
    ["graph-status", document.querySelector(".graph-status")],
    ["assurance-note", document.querySelector(".assurance-note")],
  ];
  return pairs.map(([pair, element]) => ({ pair, ratio: element ? ratio(element) : null }));
}

async function openPage(browser, contextOptions, consoleErrors) {
  const context = await browser.newContext({ deviceScaleFactor: 1, ...contextOptions });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));
  await page.addInitScript(installA2uiTap, [...A2UI_MESSAGE_KEYS]);
  await page.addInitScript(() => {
    window.__A2UI_POINTER_DOWNS__ = 0;
    window.addEventListener(
      "pointerdown",
      () => {
        window.__A2UI_POINTER_DOWNS__ += 1;
      },
      true,
    );
  });
  await page.goto(ROUTE);
  await page.waitForFunction(() => window.__A2UI_TEST_STATE__?.ready === true);
  for (const name of ACTION_NAMES) {
    await page.getByRole("button", { name }).waitFor({ state: "visible" });
  }
  return { context, page };
}

async function activeElementSummary(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return { name: null, outline: null };
    const name = (element.getAttribute("aria-label") ?? element.textContent ?? "").trim();
    return { name, outline: getComputedStyle(element).outline };
  });
}

/** Keyboard-only policy run: Tab to each official action and activate it with Enter. */
async function keyboardRun(page) {
  const focusOrder = [];
  let activations = 0;
  for (const key of KEYS) {
    await page.keyboard.press(key);
    if (key === "Tab") {
      focusOrder.push((await activeElementSummary(page)).name);
    } else {
      activations += 1;
      await page.waitForFunction(
        (expected) => window.__A2UI_TEST_STATE__.outcomes.length >= expected,
        activations,
      );
    }
  }
  return {
    focusOrder,
    outcomes: await page.evaluate(() => window.__A2UI_TEST_STATE__.outcomes.slice()),
    finalFocus: await activeElementSummary(page),
    pointerClicks: await page.evaluate(() => window.__A2UI_POINTER_DOWNS__),
  };
}

async function envelopeVersions(page) {
  const tap = await readA2uiTap(page);
  const versions = new Set();
  for (const record of tap.records) {
    for (const envelope of collectEnvelopes(JSON.parse(record.text))) {
      versions.add(Object.hasOwn(envelope, "version") ? String(envelope.version) : "(missing)");
    }
  }
  return [...versions].sort();
}

async function capture(browser) {
  const consoleErrors = [];
  const workDirectory = mkdtempSync(join(tmpdir(), "a2ui-visual-video-"));
  try {
    // Desktop, untouched: the initial render, axe, contrast and target sizes.
    const desktop = await openPage(browser, { viewport: { width: 1440, height: 900 } }, consoleErrors);
    await desktop.page.waitForFunction(() => window.__A2UI_TEST_STATE__.axe !== null);
    const axe = await desktop.page.evaluate(() => window.__A2UI_TEST_STATE__.axe);
    const contrast = await desktop.page.evaluate(measureContrast, ACTION_NAMES);
    const targets = [];
    for (const name of ACTION_NAMES) {
      const box = await desktop.page.getByRole("button", { name }).boundingBox();
      targets.push({ name, width: box ? Math.round(box.width) : 0, height: box ? Math.round(box.height) : 0 });
    }
    const protocolChip = (await desktop.page.locator(".protocol-chip").innerText()).trim();
    const pageVersions = await envelopeVersions(desktop.page);
    const userAgent = await desktop.page.evaluate(() => navigator.userAgent);
    const reducedMotionRule = await desktop.page.evaluate(() =>
      [...document.styleSheets].some((sheet) => {
        try {
          return [...sheet.cssRules].some(
            (rule) => rule instanceof CSSMediaRule && rule.conditionText.includes("prefers-reduced-motion"),
          );
        } catch {
          return false;
        }
      }),
    );
    const liveRegion = await desktop.page.evaluate(
      () => document.querySelector(".graph-status")?.getAttribute("aria-live") ?? null,
    );
    await desktop.page.screenshot({ path: join(outDirectory, "desktop-initial.png"), fullPage: true });
    await desktop.context.close();

    // Desktop keyboard run, traced and recorded.
    const recorded = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: 1280, height: 800 },
      recordVideo: { dir: workDirectory, size: { width: 1280, height: 800 } },
    });
    await recorded.tracing.start({ screenshots: true, snapshots: true });
    const recordedPage = await recorded.newPage();
    recordedPage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    recordedPage.on("pageerror", (error) => consoleErrors.push(String(error)));
    await recordedPage.addInitScript(() => {
      window.__A2UI_POINTER_DOWNS__ = 0;
      window.addEventListener(
        "pointerdown",
        () => {
          window.__A2UI_POINTER_DOWNS__ += 1;
        },
        true,
      );
    });
    await recordedPage.goto(ROUTE);
    await recordedPage.waitForFunction(() => window.__A2UI_TEST_STATE__?.ready === true);
    for (const name of ACTION_NAMES) {
      await recordedPage.getByRole("button", { name }).waitFor({ state: "visible" });
    }
    const keyboard = await keyboardRun(recordedPage);
    const auditText = await recordedPage.locator(".audit-list").innerText();
    await recordedPage.screenshot({ path: join(outDirectory, "desktop-policy-outcomes.png"), fullPage: true });
    await recorded.tracing.stop({ path: join(outDirectory, "keyboard-policy-trace.zip") });
    const video = recordedPage.video();
    await recorded.close();
    if (!video) throw new Error("the keyboard run recorded no video");
    await video.saveAs(join(outDirectory, "keyboard-policy.webm"));

    // 390px: the same keyboard run, then overflow and the outcome screenshot.
    const mobile = await openPage(browser, { viewport: { width: 390, height: 844 } }, consoleErrors);
    const mobileKeyboard = await keyboardRun(mobile.page);
    const horizontalOverflowAt390px = await mobile.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    await mobile.page.screenshot({ path: join(outDirectory, "mobile-policy-outcomes.png"), fullPage: true });
    await mobile.context.close();

    return {
      axe,
      contrast,
      targets,
      protocolChip,
      pageVersions,
      userAgent,
      keyboard,
      mobileKeyboard,
      horizontalOverflowAt390px,
      consoleErrors,
      checks: {
        reducedMotionRule,
        liveRegion,
        statusText: auditText.split("\n").map((line) => line.trim()).filter(Boolean),
      },
    };
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

function screenshotEntry(id) {
  const path = join(outDirectory, `${id}.png`);
  return { id, path: `${id}.png`, ...pngSize(path), sha256: sha256(path) };
}

let siteDirectory = null;
let previewServer = null;
let browser = null;
try {
  mkdirSync(outDirectory, { recursive: true });
  run("build-a2ui-react-and-dependencies", "pnpm", ["--filter", "@prometheus-ags/a2ui-react...", "build"]);
  for (const entry of [ARTIFACT_ENTRY, ...SUPPORTING_ARTIFACTS]) {
    if (!existsSync(join(workspaceRoot, entry))) throw new Error(`${entry} was not built`);
  }

  const vite = await importFromToolchain("vite");
  const reactPlugin = (await importFromToolchain("@vitejs/plugin-react")).default;
  const alias = [
    { find: /^react$/, replacement: packageDirectory("react") },
    { find: /^react\/(.*)$/, replacement: `${packageDirectory("react")}${sep}$1` },
    { find: /^react-dom$/, replacement: packageDirectory("react-dom") },
    { find: /^react-dom\/(.*)$/, replacement: `${packageDirectory("react-dom")}${sep}$1` },
  ];
  siteDirectory = mkdtempSync(join(tmpdir(), "a2ui-visual-site-"));
  const startedAt = new Date().toISOString();
  await vite.build({
    configFile: false,
    root: fixtureRoot,
    logLevel: "warn",
    plugins: [reactPlugin()],
    resolve: { alias },
    build: { outDir: siteDirectory, emptyOutDir: true },
  });
  commands.push({
    label: "bundle-certification-page",
    command: `vite.build (root ${relative(workspaceRoot, fixtureRoot)})`,
    startedAt,
    completedAt: new Date().toISOString(),
    exitCode: 0,
  });
  previewServer = await vite.preview({
    configFile: false,
    root: fixtureRoot,
    logLevel: "warn",
    build: { outDir: siteDirectory },
    preview: { host: "127.0.0.1", port: PREVIEW_PORT, strictPort: true },
  });

  browser = await chromium.launch();
  const result = await capture(browser);
  const browserVersion = browser.version();

  const protocol = result.protocolChip.replace(/^A2UI\s+/, "");
  const manifest = {
    schemaVersion: 2,
    capturedAt: new Date().toISOString(),
    capturedBy: "scripts/capture-a2ui-visual.mjs",
    argv: process.argv,
    protocol,
    page: {
      fixture: relative(workspaceRoot, fixtureRoot),
      protocolChip: result.protocolChip,
      observedEnvelopeVersions: result.pageVersions,
    },
    route: ROUTE,
    browser: { name: `Chromium ${browserVersion}`, version: browserVersion, userAgent: result.userAgent },
    artifact: { entry: ARTIFACT_ENTRY, sha256: sha256(join(workspaceRoot, ARTIFACT_ENTRY)) },
    supportingArtifacts: SUPPORTING_ARTIFACTS.map((entry) => ({
      entry,
      sha256: sha256(join(workspaceRoot, entry)),
    })),
    screenshots: ["desktop-initial", "desktop-policy-outcomes", "mobile-policy-outcomes"].map(screenshotEntry),
    keyboard: {
      keys: KEYS,
      pointerClicks: result.keyboard.pointerClicks,
      focusOrder: result.keyboard.focusOrder,
      outcomes: result.keyboard.outcomes,
      finalFocus: result.keyboard.finalFocus,
      mobile: {
        pointerClicks: result.mobileKeyboard.pointerClicks,
        focusOrder: result.mobileKeyboard.focusOrder,
        outcomes: result.mobileKeyboard.outcomes,
      },
      trace: { path: "keyboard-policy-trace.zip", sha256: sha256(join(outDirectory, "keyboard-policy-trace.zip")) },
      video: { path: "keyboard-policy.webm", sha256: sha256(join(outDirectory, "keyboard-policy.webm")) },
    },
    accessibility: {
      axe: result.axe,
      consoleErrors: result.consoleErrors.length,
      consoleErrorMessages: result.consoleErrors,
      horizontalOverflowAt390px: result.horizontalOverflowAt390px,
      contrast: result.contrast,
      targets: result.targets,
      checks: result.checks,
    },
    commands,
    files: walk(outDirectory)
      .filter((path) => relative(outDirectory, path) !== MANIFEST_NAME)
      .map((path) => ({
        path: relative(outDirectory, path).split(sep).join("/"),
        bytes: statSync(path).size,
        sha256: sha256(path),
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
  };
  writeFileSync(join(outDirectory, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `[a2ui-visual-capture] captured ${manifest.files.length} files into ${outDirectory} (manifest ${MANIFEST_NAME})\n`,
  );
  process.exitCode = 0;
} catch (error) {
  process.stderr.write(
    `[a2ui-visual-capture] FAIL: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (previewServer) await previewServer.close().catch(() => undefined);
  if (siteDirectory) rmSync(siteDirectory, { recursive: true, force: true });
}
