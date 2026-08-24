import { spawn } from "node:child_process";
import { join } from "node:path";

import { rewriteLitCjsDeclarations } from "./rewrite-lit-cjs-declarations.mjs";

await run("pnpm", ["exec", "tsup"]);
await rewriteLitCjsDeclarations(join(process.cwd(), "dist/index.d.cts"));

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`,
        ),
      );
    });
  });
}
