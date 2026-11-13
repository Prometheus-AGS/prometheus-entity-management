#!/usr/bin/env node
/**
 * UPG-16 negative control for `verify:skills`.
 *
 * Proves the skill-ledger check would catch a public-export change that was
 * not followed by `refresh:exports`: in a scratch copy of the minimum needed
 * (packages/a2ui-react, the ledger references and the scripts verify:skills
 * uses), remove one runtime export from packages/a2ui-react/src/index.ts,
 * rebuild that package there WITHOUT `refresh:exports`, and run its
 * `verify:skills` there. Exits 0 only when that run fails, and fails because
 * of exactly the removed export.
 *
 * The real tree is never written: the copy lives under the OS temp directory,
 * its node_modules are symlinks to the real (read-only for this script)
 * installs, and the real source, ledger and dist are hashed before and after.
 *
 * Usage: node scripts/verify-skills-scratch-control.mjs [--report <file>] [--export <name>]
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { SKILL_LEDGER_PACKAGES } from "./skills-package-registry.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const reportPath = flagValue("--report");
const requestedExport = flagValue("--export");

const selected = SKILL_LEDGER_PACKAGES.find(({ id }) => id === "a2ui");
if (!selected) throw new Error("skills-package-registry.mjs has no a2ui entry");
const packageRelative = join("packages", selected.directory);
const indexRelative = join(packageRelative, "src", "index.ts");
const referencesRelative = join("prometheus-entity-skills", "_shared", "references");
const ledgerRelative = join(referencesRelative, selected.ledger);
const distIndexRelative = join(packageRelative, "dist", "index.mjs");
// What `pnpm run build` and `pnpm run verify:skills` of a2ui-react load from
// outside the package directory.
const SCRIPT_FILES = [
  "verify-skills-exports.mjs",
  "skills-package-registry.mjs",
  "tsup-package-config.ts",
];
const PACKAGE_COPY_EXCLUDES = new Set(["node_modules", "dist", ".cache", ".turbo"]);
const GUARDED_REAL_FILES = [indexRelative, ledgerRelative, distIndexRelative];

const report = {
  schemaVersion: 1,
  scenario: "UPG-16 scratch-copy negative control",
  generatedAt: new Date().toISOString(),
  package: selected.id,
  ledger: ledgerRelative,
  removedExport: null,
  build: null,
  verifySkills: null,
  realTreeUnchanged: null,
  result: "pending",
};

let scratchRoot;
const links = [];
let exitCode = 1;

try {
  const guardBefore = await hashRealFiles();

  scratchRoot = await mkdtemp(join(tmpdir(), "prometheus-skills-scratch-control-"));
  if (isInside(scratchRoot, workspaceRoot) || isInside(workspaceRoot, scratchRoot)) {
    throw new Error(`scratch directory ${scratchRoot} overlaps the workspace`);
  }
  await createScratchCopy(scratchRoot);
  // Pin pnpm for the copy: outside the workspace corepack would fall back to its last-known-good
  // release, which may not be launchable. Corepack walks up past the package's own manifest to this one.
  await writeFile(
    join(scratchRoot, "package.json"),
    `${JSON.stringify({ name: "skills-scratch-control-root", private: true, packageManager: JSON.parse(await readFile(join(workspaceRoot, "package.json"), "utf8")).packageManager }, null, 2)}\n`,
  );

  const scratchPackage = join(scratchRoot, packageRelative);
  const ledger = JSON.parse(await readFile(join(scratchRoot, ledgerRelative), "utf8"));
  const rootLedger = Array.isArray(ledger) ? ledger : ledger["."];
  if (!Array.isArray(rootLedger)) throw new Error(`${selected.ledger} has no "." export list`);

  const indexPath = join(scratchRoot, indexRelative);
  const source = await readFile(indexPath, "utf8");
  const candidates = runtimeExportNames(source).filter((name) => rootLedger.includes(name));
  const removed = requestedExport ?? candidates[0];
  if (!removed) throw new Error("no runtime export of src/index.ts is listed in the ledger");
  if (!candidates.includes(removed)) {
    throw new Error(`${removed} is not a runtime export of src/index.ts listed in the ledger`);
  }
  const mutated = removeRuntimeExport(source, removed);
  if (runtimeExportNames(mutated).includes(removed)) {
    throw new Error(`failed to remove ${removed} from the scratch src/index.ts`);
  }
  await writeFile(indexPath, mutated);
  report.removedExport = removed;

  // Rebuild without refresh:exports. A failed build means the control could
  // not run, which is not the same as verify:skills catching the change.
  const buildArgv = ["run", "build"];
  const build = await runCapture("pnpm", buildArgv, scratchPackage);
  report.build = { argv: ["pnpm", ...buildArgv], cwd: "<scratch>/" + packageRelative, exitCode: build.exitCode };
  if (build.exitCode !== 0) {
    throw new Error(`scratch build failed (exit ${build.exitCode}); the control could not run:\n${tail(build.output)}`);
  }

  const verifyArgv = ["run", "verify:skills"];
  const verify = await runCapture("pnpm", verifyArgv, scratchPackage);
  const removedNames = listedNames(verify.output, "Removed exports:");
  const addedNames = listedNames(verify.output, "Added exports:");
  const outOfSync = verify.output.includes(
    `${selected.ledger} is out of sync with ${selected.directory}/dist/index.mjs`,
  );
  report.verifySkills = {
    argv: ["pnpm", ...verifyArgv],
    cwd: "<scratch>/" + packageRelative,
    exitCode: verify.exitCode,
    outOfSyncReported: outOfSync,
    removedExports: removedNames,
    addedExports: addedNames,
    output: tail(verify.output),
  };

  const guardAfter = await hashRealFiles();
  report.realTreeUnchanged = JSON.stringify(guardBefore) === JSON.stringify(guardAfter);
  if (!report.realTreeUnchanged) {
    throw new Error(`the real tree changed during the control: ${JSON.stringify({ guardBefore, guardAfter })}`);
  }

  if (verify.exitCode === 0) {
    throw new Error(`verify:skills passed on a copy without ${removed}; it does not catch a stale ledger`);
  }
  if (!outOfSync || removedNames.length !== 1 || removedNames[0] !== removed || addedNames.length > 0) {
    throw new Error(
      `verify:skills failed, but not because of exactly the removed export ${removed} (removed: ${JSON.stringify(removedNames)}, added: ${JSON.stringify(addedNames)}):\n${tail(verify.output)}`,
    );
  }

  report.result = "pass";
  exitCode = 0;
  process.stdout.write(
    `[skills-scratch-control] PASS: removing ${removed} from a scratch copy and rebuilding without refresh:exports makes verify:skills fail (exit ${verify.exitCode}).\n`,
  );
} catch (error) {
  report.result = "fail";
  report.reason = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[skills-scratch-control] FAIL: ${report.reason}\n`);
} finally {
  // Unlink the node_modules symlinks first so cleanup can never reach the
  // real installs they point at.
  for (const link of links) await unlink(link).catch(() => undefined);
  if (scratchRoot) await rm(scratchRoot, { recursive: true, force: true });
  if (reportPath) {
    const absolute = resolve(workspaceRoot, reportPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
}

process.exit(exitCode);

async function createScratchCopy(root) {
  const sourcePackage = join(workspaceRoot, packageRelative);
  const scratchPackage = join(root, packageRelative);
  await cp(sourcePackage, scratchPackage, {
    recursive: true,
    filter: (path) => {
      const [first] = relative(sourcePackage, path).split(sep);
      return !PACKAGE_COPY_EXCLUDES.has(first);
    },
  });
  await mkdir(join(root, "scripts"), { recursive: true });
  for (const file of SCRIPT_FILES) {
    await cp(join(workspaceRoot, "scripts", file), join(root, "scripts", file));
  }
  await cp(join(workspaceRoot, referencesRelative), join(root, referencesRelative), {
    recursive: true,
  });
  for (const [link, target] of [
    [join(scratchPackage, "node_modules"), join(sourcePackage, "node_modules")],
    [join(root, "node_modules"), join(workspaceRoot, "node_modules")],
  ]) {
    await symlink(target, link, "dir");
    links.push(link);
  }
}

/** Plain identifiers re-exported by `export { ... } from "..."` (not `export type`). */
function runtimeExportNames(source) {
  const names = [];
  for (const [, list] of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*["'][^"']+["']\s*;/g)) {
    for (const token of list.split(",").map((entry) => entry.trim())) {
      if (/^[A-Za-z_$][\w$]*$/.test(token)) names.push(token);
    }
  }
  return names;
}

function removeRuntimeExport(source, name) {
  return source.replace(
    /export\s*\{([^}]*)\}\s*from\s*(["'][^"']+["'])\s*;/g,
    (block, list, from) => {
      const tokens = list.split(",").map((entry) => entry.trim()).filter(Boolean);
      if (!tokens.includes(name)) return block;
      const kept = tokens.filter((token) => token !== name);
      return kept.length > 0 ? `export {\n  ${kept.join(",\n  ")},\n} from ${from};` : "";
    },
  );
}

/** Names console.error printed after `label` (Node prints arrays as `[ 'a', 'b' ]`). */
function listedNames(output, label) {
  const index = output.indexOf(label);
  if (index < 0) return [];
  const match = /\[([^\]]*)\]/.exec(output.slice(index + label.length));
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map(([, name]) => name) : [];
}

async function hashRealFiles() {
  const hashes = {};
  for (const file of GUARDED_REAL_FILES) {
    try {
      hashes[file] = createHash("sha256").update(await readFile(join(workspaceRoot, file))).digest("hex");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      hashes[file] = "absent";
    }
  }
  return hashes;
}

function isInside(child, parent) {
  const path = relative(parent, child);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

async function runCapture(command, args, cwd) {
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      timeout: 600_000,
    });
    return { exitCode: 0, output: `${result.stdout}\n${result.stderr}` };
  } catch (error) {
    if (typeof error.code !== "number") throw error;
    return { exitCode: error.code, output: `${error.stdout ?? ""}\n${error.stderr ?? ""}` };
  }
}

function tail(text, lines = 40) {
  return text.trim().split(/\r?\n/).slice(-lines).join("\n");
}

function flagValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}
