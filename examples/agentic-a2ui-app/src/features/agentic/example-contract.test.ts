import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { graphStore } from "@prometheus-ags/entity-graph-core";
import { taskCommandStore } from "../tasks/task-command-store";
import { DEMO_LIST_KEY } from "./types";

const exampleRoot = resolve(import.meta.dirname, "../../..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("agentic example release contract", () => {
  it("needs no model credential or model SDK in the deterministic CI path", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(exampleRoot, "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const source = sourceFiles(resolve(exampleRoot, "src"))
      .filter((path) => !/\.test\.(ts|tsx)$/.test(path))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(Object.keys(packageJson.dependencies)).not.toEqual(
      expect.arrayContaining(["openai", "@anthropic-ai/sdk", "@google/generative-ai"]),
    );
    expect(source).not.toMatch(/OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY/);
    expect(source).not.toMatch(/VITE_[A-Z0-9_]*(KEY|TOKEN|SECRET)/);
    expect(source).toContain("VITE_EXTERNAL_A2A_URL");
  });

  it("keeps components on hooks and lists on entity IDs", () => {
    const componentSource = sourceFiles(
      resolve(exampleRoot, "src/features/agentic/components"),
    )
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(componentSource).not.toMatch(/graphStore|useGraphStore/);
    expect(componentSource).not.toMatch(
      /agentSessionStore|approvalStore|actionAuditStore|taskCommandStore/,
    );

    taskCommandStore.getState().seedSharedScenario();
    const list = graphStore.getState().lists[DEMO_LIST_KEY];
    expect(list.ids).toEqual(["task-schema", "task-sync"]);
    expect(list.ids.every((id) => typeof id === "string")).toBe(true);
  });
});
