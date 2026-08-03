#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function readAdvisoryPolicy(path = resolve(repositoryRoot, "security", "advisory-policy.json")) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function evaluateAuditPolicy(report, policy, today = new Date().toISOString().slice(0, 10)) {
  const advisories = Object.values(report.advisories ?? {});
  const blockingSeverities = new Set(policy.threshold ?? ["critical", "high"]);
  const blocking = advisories.filter(({ severity }) => blockingSeverities.has(severity));
  const acceptedEntries = policy.acceptedAdvisories ?? [];
  const accepted = new Map(acceptedEntries.map((entry) => [String(entry.id), entry]));
  const undispositioned = blocking.filter(({ id }) => !accepted.has(String(id)));
  const activeIds = new Set(advisories.map(({ id }) => String(id)));
  const staleAcceptances = acceptedEntries.filter(({ id }) => !activeIds.has(String(id)));
  const invalidAcceptances = acceptedEntries.filter(
    (entry) => !entry.rationale?.trim() || !entry.expiresOn || !entry.owner?.trim(),
  );
  const expiredAcceptances = acceptedEntries.filter(
    (entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.expiresOn ?? "") && entry.expiresOn < today,
  );
  const invalidExpirationAcceptances = acceptedEntries.filter(
    (entry) => entry.expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(entry.expiresOn),
  );
  const counts = report.metadata?.vulnerabilities ?? {};
  const errors = [];

  for (const entry of invalidAcceptances) {
    errors.push(`Advisory ${entry.id} is missing rationale, expiration, or owner`);
  }
  for (const entry of invalidExpirationAcceptances) {
    errors.push(`Advisory ${entry.id} has an invalid expiration date: ${entry.expiresOn}`);
  }
  for (const entry of expiredAcceptances) {
    errors.push(`Advisory ${entry.id} acceptance expired on ${entry.expiresOn}`);
  }
  if (staleAcceptances.length > 0) {
    errors.push(`Remove stale advisory acceptances: ${staleAcceptances.map(({ id }) => id).join(", ")}`);
  }
  for (const advisory of undispositioned) {
    const paths = advisory.findings?.flatMap(({ paths = [] }) => paths) ?? [];
    errors.push(
      `[${advisory.severity}] ${advisory.id} ${advisory.module_name}: ${advisory.title}\n` +
        `  paths: ${[...new Set(paths)].join(", ")}`,
    );
  }
  if (undispositioned.length > 0) {
    errors.push(
      "Critical/high production advisories must be remediated or explicitly accepted in security/advisory-policy.json",
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    advisories,
    blocking,
    undispositioned,
    staleAcceptances,
    invalidAcceptances,
    expiredAcceptances,
    summary: {
      dependencies: report.metadata?.dependencies ?? null,
      vulnerabilities: counts,
      blockingAdvisories: blocking.length,
      acceptedBlockingAdvisories: blocking.length - undispositioned.length,
    },
  };
}

export function runPnpmAudit(cwd = repositoryRoot) {
  const audit = spawnSync("pnpm", ["audit", "--prod", "--json"], {
    cwd,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (!audit.stdout.trim()) {
    throw new Error(audit.stderr || "pnpm audit produced no JSON output");
  }

  try {
    return JSON.parse(audit.stdout);
  } catch (error) {
    throw new Error(`Unable to parse pnpm audit JSON: ${error.message}\n${audit.stderr}`, { cause: error });
  }
}

export function runProductionAudit({ cwd = repositoryRoot, policy = readAdvisoryPolicy(), today } = {}) {
  return evaluateAuditPolicy(runPnpmAudit(cwd), policy, today);
}

function main() {
  try {
    const result = runProductionAudit();
    process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
    if (!result.ok) {
      process.stderr.write(`${result.errors.join("\n")}\n`);
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
