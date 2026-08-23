#!/usr/bin/env node

import {execFileSync, spawnSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import process from "node:process";

import {PUBLIC_PACKAGES} from "./public-packages.mjs";

export const STAGE_PERMISSION = "createStagedPackage";
export const DIRECT_PERMISSION = "createPackage";
const defaultManifestUrl = new URL("../release/npm-trusted-publishing.json", import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function loadAuthorityManifest(url = defaultManifestUrl) {
  return JSON.parse(await readFile(url, "utf8"));
}

export function validateAuthorityManifest(manifest, publicPackages = PUBLIC_PACKAGES) {
  assert(manifest.schemaVersion === "1.0.0", "unsupported npm trust manifest schema");
  assert(manifest.registry === "https://registry.npmjs.org/", "npm trust registry must be public npm");
  assert(manifest.provider === "github", "npm trust provider must be github");
  assert(
    manifest.repository === "Prometheus-AGS/prometheus-entity-management",
    "npm trust repository does not match the release authority",
  );
  assert(manifest.workflowFile === "publish.yml", "npm trust workflow must be publish.yml only");
  assert(manifest.environment === null, "npm trust binding must not claim one channel-specific environment");
  assert(manifest.permissions?.stagePublish === true, "stage publish authority is required");
  assert(manifest.permissions?.directPublish === true, "stable direct publish authority is required");

  const expected = new Set(publicPackages.map(({name}) => name));
  const declared = new Set(manifest.packages);
  assert(declared.size === manifest.packages.length, "npm trust manifest contains duplicate packages");
  const missing = [...expected].filter((name) => !declared.has(name));
  const extra = [...declared].filter((name) => !expected.has(name));
  assert(missing.length === 0, `npm trust manifest is missing: ${missing.join(", ")}`);
  assert(extra.length === 0, `npm trust manifest contains unknown packages: ${extra.join(", ")}`);
  return manifest;
}

export function parseTrustOutput(output, packageName) {
  const trimmed = output.trim();
  assert(trimmed.length > 0, `npm trust list returned no JSON for ${packageName}`);
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`npm trust list returned invalid JSON for ${packageName}: ${error.message}`, { cause: error });
  }
}

export function assertExactTrust(packageName, response, manifest) {
  const records = Array.isArray(response) ? response : [response];
  assert(records.length === 1, `${packageName} must have exactly one trusted publisher`);
  const record = records[0];
  assert(record.type === "github", `${packageName} trusted publisher must be github`);
  assert(record.repository === manifest.repository, `${packageName} repository claim is incorrect`);
  assert(record.file === manifest.workflowFile, `${packageName} workflow claim is incorrect`);
  assert((record.environment ?? null) === manifest.environment, `${packageName} environment claim is incorrect`);
  const permissions = new Set(record.permissions ?? []);
  assert(permissions.has(STAGE_PERMISSION), `${packageName} is missing stage publish authority`);
  assert(permissions.has(DIRECT_PERMISSION), `${packageName} is missing stable publish authority`);
  assert(permissions.size === 2, `${packageName} has unexpected trusted-publisher permissions`);
  return {packageName, trustId: record.id ?? null, verified: true};
}

export function assertReplaceableTrust(packageName, response, manifest) {
  const records = Array.isArray(response) ? response : [response];
  assert(records.length === 1, `${packageName} must have exactly one trusted publisher to replace`);
  const record = records[0];
  assert(record.type === "github", `${packageName} existing trusted publisher is not github`);
  assert(record.repository === manifest.repository, `${packageName} existing repository claim is not replaceable`);
  assert(record.file === manifest.workflowFile, `${packageName} existing workflow claim is not replaceable`);
  assert(record.id, `${packageName} existing trusted publisher has no revocation id`);
  return {packageName, trustId: record.id, replaceable: true};
}

function rejectWriteTokenEnvironment(env = process.env) {
  assert(!env.NODE_AUTH_TOKEN && !env.NPM_TOKEN, "long-lived npm write token environment variables are forbidden");
}

function npmVersion() {
  return execFileSync("npm", ["--version"], {encoding: "utf8"}).trim();
}

function assertSupportedNpm(version) {
  const [major, minor] = version.split(".").map(Number);
  assert(
    major > 11 || (major === 11 && minor >= 15),
    `npm trust requires npm >=11.15.0; found ${version}`,
  );
}

function npmJson(args) {
  return execFileSync("npm", args, {
    encoding: "utf8",
    cwd: tmpdir(),
    env: {...process.env, NPM_CONFIG_REGISTRY: "https://registry.npmjs.org/"},
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function sanitizeNpmError(value) {
  return String(value)
    .split("\n")
    .filter((line) =>
      !/complete log(?: of this run)? can be found/i.test(line) &&
      !/^npm warn Unknown (?:env|global) config/i.test(line) &&
      !/^npm notice\b/i.test(line),
    )
    .map((line) => line.replace(/\/(?:Users|home)\/[^\s]+/g, "<local-path>"))
    .join("\n")
    .trim();
}

export async function verifyAll() {
  rejectWriteTokenEnvironment();
  assertSupportedNpm(npmVersion());
  const manifest = validateAuthorityManifest(await loadAuthorityManifest());
  const results = [];
  for (const packageName of manifest.packages) {
    let output;
    try {
      output = npmJson(["trust", "list", packageName, "--json", "--registry", manifest.registry]);
    } catch (error) {
      const detail = sanitizeNpmError(error.stderr ?? error.message);
      throw new Error(
        `cannot read npm trust for ${packageName}. Run npm login --auth-type=web with a 2FA-enabled maintainer account, then retry. ${detail}`,
        { cause: error },
      );
    }
    results.push(assertExactTrust(packageName, parseTrustOutput(output, packageName), manifest));
  }
  console.log(JSON.stringify({schemaVersion: "1.0.0", authority: "dual-channel-oidc", results}, null, 2));
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function registerAll() {
  rejectWriteTokenEnvironment();
  assert(process.stdin.isTTY && process.stdout.isTTY, "npm trust registration requires an interactive terminal");
  assertSupportedNpm(npmVersion());
  const manifest = validateAuthorityManifest(await loadAuthorityManifest());

  let username;
  try {
    username = npmJson(["whoami", "--registry", manifest.registry]).trim();
  } catch {
    throw new Error("authenticate first with npm login --auth-type=web using a 2FA-enabled maintainer account");
  }
  console.log(`Registering dual-channel trusted publishing as npm user ${username}.`);
  console.log("The first package opens npm 2FA; choose the five-minute authorization window for the remaining packages.");

  for (const [index, packageName] of manifest.packages.entries()) {
    const current = parseTrustOutput(
      npmJson(["trust", "list", packageName, "--json", "--registry", manifest.registry]),
      packageName,
    );
    try {
      assertExactTrust(packageName, current, manifest);
      console.log(`[${index + 1}/${manifest.packages.length}] ${packageName} already has exact authority`);
      continue;
    } catch {
      const replacement = assertReplaceableTrust(packageName, current, manifest);
      const revoke = spawnSync("npm", [
        "trust", "revoke", packageName,
        "--id", replacement.trustId,
        "--registry", manifest.registry,
      ], {
        cwd: tmpdir(),
        stdio: "inherit",
        env: {...process.env, NPM_CONFIG_REGISTRY: manifest.registry},
      });
      if (revoke.status !== 0) {
        throw new Error(`npm trust revocation failed for ${packageName}; no replacement was attempted`);
      }
    }
    const args = [
      "trust", "github", packageName,
      "--file", manifest.workflowFile,
      "--repo", manifest.repository,
      "--allow-stage-publish",
      "--allow-publish",
      "--yes",
      "--registry", manifest.registry,
    ];
    console.log(`[${index + 1}/${manifest.packages.length}] npm ${args.slice(0, -2).join(" ")}`);
    const result = spawnSync("npm", args, {
      cwd: tmpdir(),
      stdio: "inherit",
      env: {...process.env, NPM_CONFIG_REGISTRY: manifest.registry},
    });
    if (result.status !== 0) {
      throw new Error(`npm trust registration failed for ${packageName}; no later package was changed`);
    }
    if (index < manifest.packages.length - 1) await delay(2000);
  }
  await verifyAll();
}

async function main() {
  const command = process.argv[2];
  if (command === "verify") await verifyAll();
  else if (command === "register") await registerAll();
  else throw new Error("usage: node scripts/npm-trust.mjs <verify|register>");
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
