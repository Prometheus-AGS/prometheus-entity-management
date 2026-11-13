/**
 * UPG-13 Node lane. scripts/verify-a2ui-v1.mjs copies this file into a scratch
 * consumer that installed the PACKED @prometheus-ags/a2ui-react (and
 * entity-graph-core) tarballs, so the import below resolves to the packed
 * ./headless entry, never to the workspace.
 *
 *   node headless-lane.mjs --fixtures <dir> --out <file>
 *
 * Oracle: a 1.0 surface exports without theme, rebuilds in a fresh runtime and
 * re-exports byte-identically. Negative control: a v0.9.1 surface with a theme
 * keeps the theme through the same round trip (theme removal must not be
 * unconditional). Writes one JSON result; exit code is always 0 unless the lane
 * itself crashes, the verifier judges the checks.
 */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const HEADLESS = "@prometheus-ags/a2ui-react/headless";

function argument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`missing ${name}`);
  return value;
}

const fixturesDir = argument("--fixtures");
const outPath = argument("--out");
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function containsKey(value, key) {
  if (Array.isArray(value)) return value.some((item) => containsKey(item, key));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([name, item]) => name === key || containsKey(item, key));
  }
  return false;
}

function check(name, pass, detail) {
  return { name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) };
}

function roundTrip(headless, messages, surfaceId) {
  const first = headless.createPrometheusA2uiHeadlessRuntime();
  first.processMessages(messages);
  const exported = first.exportSurfaceMessages(surfaceId);
  const exportedBytes = JSON.stringify(exported);
  first.dispose();
  const second = headless.createPrometheusA2uiHeadlessRuntime();
  second.processMessages(structuredClone(exported.messages));
  const reExported = second.exportSurfaceMessages(surfaceId);
  const reExportedBytes = JSON.stringify(reExported);
  second.dispose();
  return {
    exported,
    exportDigest: sha256(exportedBytes),
    reExportDigest: sha256(reExportedBytes),
    byteIdentical: exportedBytes === reExportedBytes,
  };
}

const result = { node: process.version, headlessEntry: HEADLESS };
try {
  const resolved = import.meta.resolve(HEADLESS);
  result.resolvedEntry = resolved.startsWith("file:") ? fileURLToPath(resolved) : resolved;
  result.resolvedEntryDigest = sha256(readFileSync(result.resolvedEntry));
  const headless = await import(HEADLESS);
  const constants = JSON.parse(readFileSync(join(fixturesDir, "constants.json"), "utf8"));
  const fixture = JSON.parse(readFileSync(join(fixturesDir, "upg13.json"), "utf8"));
  result.packageConstants = {
    PROMETHEUS_A2UI_V1_CATALOG_ID: headless.PROMETHEUS_A2UI_V1_CATALOG_ID,
    PROMETHEUS_A2UI_CATALOG_ID: headless.PROMETHEUS_A2UI_CATALOG_ID,
  };

  const v1 = roundTrip(headless, fixture.v1Surface, fixture.v1SurfaceId);
  result.oracle = {
    observed: { exportDigest: v1.exportDigest, reExportDigest: v1.reExportDigest, exported: v1.exported },
    checks: [
      check("packed headless entry resolves inside the scratch consumer", result.resolvedEntry.startsWith(realpathSync(process.cwd())) && result.resolvedEntry.includes("node_modules"), result.resolvedEntry),
      check("package catalog ids match the fixtures", headless.PROMETHEUS_A2UI_V1_CATALOG_ID === constants.V1_CATALOG && headless.PROMETHEUS_A2UI_CATALOG_ID === constants.V091_CATALOG),
      check("export is one or more 1.0 messages", v1.exported.messages.length > 0 && v1.exported.messages.every((message) => message.version === "1.0")),
      check("export carries no theme", !containsKey(v1.exported.messages, "theme")),
      // Guard against an exporter that keeps only a stable createSurface: the fixture's
      // component ids and data values must survive the export.
      check("export keeps every fixture component id", ["root", "title", "status"].every((id) => JSON.stringify(v1.exported.messages).includes(`"id":"${id}"`))),
      check("export keeps the fixture data values", ["in transit", "A-1", "Shipment"].every((value) => JSON.stringify(v1.exported.messages).includes(JSON.stringify(value)))),
      check("rebuilt surface re-exports byte-identically", v1.byteIdentical, { exportDigest: v1.exportDigest, reExportDigest: v1.reExportDigest }),
    ],
  };

  const legacy = roundTrip(headless, fixture.legacySurface, fixture.legacySurfaceId);
  const themes = (exported) =>
    exported.messages.filter((message) => message.createSurface).map((message) => message.createSurface.theme);
  const exportedThemes = themes(legacy.exported);
  result.negativeControl = {
    exercised: true,
    observed: { exportDigest: legacy.exportDigest, reExportDigest: legacy.reExportDigest, themes: exportedThemes, exported: legacy.exported },
    checks: [
      check("v0.9.1 export keeps the theme", exportedThemes.length === 1 && JSON.stringify(exportedThemes[0]) === JSON.stringify(fixture.legacyTheme), exportedThemes),
      check("v0.9.1 round trip is byte-identical (theme survives the rebuild)", legacy.byteIdentical, { exportDigest: legacy.exportDigest, reExportDigest: legacy.reExportDigest }),
    ],
  };
  result.status = "completed";
} catch (cause) {
  result.status = "error";
  result.error = cause instanceof Error ? { name: cause.name, code: cause.code, message: cause.message, stack: cause.stack } : String(cause);
}
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
