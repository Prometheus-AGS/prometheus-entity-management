import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import test from "node:test";

const root = process.cwd();

const REQUIRED_FILES = [
  "packages/entity-graph-core/src/adapters/flint.ts",
  "packages/entity-graph-core/src/adapters/flint.test.ts",
  "packages/entity-graph-core/src/adapters/flint-live.fixture.ts",
  "packages/entity-graph-core/src/adapters/flint-live.test.ts",
  "packages/entity-graph-core/src/adapters/flint-security.test.ts",
  "tests/fixtures/flint-auth/claims-contract.json",
  "docs/flint-integration.md",
  "scripts/verify-flint-portable-contracts.mjs",
];

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs", ".json",
  ".md", ".rs", ".toml", ".yml", ".yaml", ".html", ".css",
]);

const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", "target", ".git", ".gradle",
  "gen/schemas", "playwright-artifacts", "coverage",
]);

// Machine-specific absolute path patterns that must never appear in the
// default test lane. v3-package-module-contracts.test.mjs carries deliberate
// negative fixtures (a file: URL under a fake developer home that the manifest
// validator must REJECT), so it is allowlisted with justification.
const MACHINE_PATH_ALLOWLIST = new Set([
  "tests/release/v3-package-module-contracts.test.mjs",
]);
const MACHINE_PATH_RE = /(?<![\w.])\/(Users|home)\/[A-Za-z0-9._-]+\//;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    // Dot-directories are framework build caches (.next, .svelte-kit, …) that
    // legitimately embed the build machine's absolute paths.
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const rel = full.slice(root.length + 1);
    if (SKIP_DIRS.has(entry) || [...SKIP_DIRS].some((s) => rel.includes(`${s}/`))) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (TEXT_EXTENSIONS.has(extname(entry))) {
      yield rel;
    }
  }
}

test("the Flint portable-contracts file surface exists", () => {
  for (const file of REQUIRED_FILES) {
    assert.equal(existsSync(join(root, file)), true, `missing ${file}`);
  }
});

test("default CI lane contains no machine-specific absolute paths", () => {
  const offenders = [];
  for (const lane of ["packages", "tests", "scripts", "examples"]) {
    for (const rel of walk(join(root, lane))) {
      if (MACHINE_PATH_ALLOWLIST.has(rel)) continue;
      const text = readFileSync(join(root, rel), "utf8");
      if (MACHINE_PATH_RE.test(text)) offenders.push(rel);
    }
  }
  for (const rel of ["package.json", "pnpm-workspace.yaml", "cucumber.mjs", "vitest.config.ts"]) {
    if (!existsSync(join(root, rel))) continue;
    if (MACHINE_PATH_RE.test(readFileSync(join(root, rel), "utf8"))) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `machine-specific paths found: ${offenders.join(", ")}`);
});

test("the Flint live lane is env-gated and fail-closed, never a silent skip", () => {
  const live = readFileSync(
    join(root, "packages/entity-graph-core/src/adapters/flint-live.test.ts"),
    "utf8",
  );
  assert.match(live, /FLINT_EM_MODULE/);
  assert.match(live, /FLINT_SDK_MODULE/);
  assert.match(live, /throw new Error\(/, "opted-in live lane must fail closed");
  assert.equal(live.includes("ctx.skip"), false, "silent skip is forbidden");
  assert.equal(MACHINE_PATH_RE.test(live), false, "no absolute sibling paths");
});

test("the claims fixture pins issuer, tenant, kid/JWKS, role, and key separation", () => {
  const fixture = JSON.parse(
    readFileSync(join(root, "tests/fixtures/flint-auth/claims-contract.json"), "utf8"),
  );
  const jwks = fixture.tokenVerification.jwks;
  assert.equal(jwks.kidRequiredAgainstMultiKeySet, true);
  assert.match(jwks.noKidMultiKeyBehavior, /rejected/);
  assert.match(jwks.unknownKidBehavior, /rate-limited/);
  assert.match(jwks.keySelection, /asymmetric/);
  assert.match(jwks.compatibilityCaveat, /strict-JWK/);
  assert.equal(fixture.roles.anon.keyPrefix, "flint_pk_");
  assert.equal(fixture.roles.service_role.keyPrefix, "flint_sk_");
  assert.equal(fixture.roles.service_role.bypassRls, true);
  assert.match(fixture.roles.service_role.exposure, /never ship in client/);
  assert.equal(fixture.provisioning.serviceRoleOnly, true);
  assert.match(fixture.rls.default, /FORCE ROW LEVEL SECURITY/);
});

test("docs/flint-integration.md covers every fixture contract section", () => {
  const doc = readFileSync(join(root, "docs/flint-integration.md"), "utf8");
  const required = [
    "watchEntities", "mutateEntity", "fromOffset = lastSeen + 1",
    "fixture", "FLINT_EM_MODULE", "FLINT_SDK_MODULE",
    "iss", "aud", "kid", "JWKS", "strict-JWK",
    "anon", "authenticated", "service_role", "flint_pk_", "flint_sk_",
    "BYPASSRLS", "FORCE ROW LEVEL SECURITY",
    "forge migrate", "token mint", "AuthzAuditRecord", "restart",
    "Not provided by this repository",
  ];
  for (const marker of required) {
    assert.ok(doc.includes(marker), `docs/flint-integration.md missing "${marker}"`);
  }
});

test("client examples never expose service-role credentials", () => {
  const SECRET_RES = [
    /flint_sk_[A-Za-z0-9_-]+/, // secret key material with the fabric prefix
    /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, // JWT literal
    /SERVICE_ROLE_KEY\s*[:=]\s*["'][A-Za-z0-9]/, // assigned service-role key value
  ];
  const offenders = [];
  for (const rel of walk(join(root, "examples"))) {
    const text = readFileSync(join(root, rel), "utf8");
    for (const re of SECRET_RES) {
      if (re.test(text)) offenders.push(`${rel} (${re.source})`);
    }
  }
  assert.deepEqual(offenders, [], `service-role material in examples: ${offenders.join(", ")}`);
});
