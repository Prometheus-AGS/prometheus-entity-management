#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const gateDefinitions = {
  validate: { command: ["pnpm", "run", "validate"], timeoutMs: 5 * 60_000 },
  lint: { command: ["pnpm", "run", "lint"], timeoutMs: 5 * 60_000 },
  typecheck: { command: ["pnpm", "run", "typecheck"], timeoutMs: 10 * 60_000 },
  build: { command: ["pnpm", "run", "build"], timeoutMs: 15 * 60_000 },
  integration: { command: ["pnpm", "run", "integration:devtools"], timeoutMs: 45 * 60_000 },
  skills: { command: ["pnpm", "run", "verify:skills"], timeoutMs: 5 * 60_000 },
  security: { command: ["pnpm", "run", "security:audit"], timeoutMs: 5 * 60_000 },
};

export function configuredTimeout(defaultTimeout) {
  if (process.env.CI_GATE_TIMEOUT_MS === undefined) return defaultTimeout;
  const timeout = Number(process.env.CI_GATE_TIMEOUT_MS);
  if (!Number.isSafeInteger(timeout) || timeout <= 0) {
    throw new Error("CI_GATE_TIMEOUT_MS must be a positive integer");
  }
  return timeout;
}

function terminate(child, signal) {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    child.kill(signal);
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}

export function runGate(name, definition = gateDefinitions[name]) {
  if (definition === undefined) {
    throw new Error(
      `Unknown CI gate ${JSON.stringify(name)}. Expected one of: ${Object.keys(gateDefinitions).join(", ")}`,
    );
  }
  const [executable, ...args] = definition.command;
  const timeoutMs = configuredTimeout(definition.timeoutMs);
  const started = Date.now();
  process.stdout.write(`Starting CI gate ${name}: ${definition.command.join(" ")} (timeout ${timeoutMs}ms)\n`);

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      detached: process.platform !== "win32",
      env: process.env,
      stdio: "inherit",
    });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      terminate(child, "SIGTERM");
      setTimeout(() => terminate(child, "SIGKILL"), 2_000).unref();
    }, timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - started;
      if (timedOut) {
        reject(
          new Error(
            `CI gate ${name} timed out after ${timeoutMs}ms (command: ${definition.command.join(" ")})`,
          ),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new Error(
            `CI gate ${name} failed after ${durationMs}ms with code ${code ?? "null"} and signal ${signal ?? "none"}`,
          ),
        );
        return;
      }
      process.stdout.write(`Completed CI gate ${name} in ${durationMs}ms\n`);
      resolve({ name, durationMs });
    });
  });
}

async function main() {
  const name = process.argv[2];
  try {
    await runGate(name);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
