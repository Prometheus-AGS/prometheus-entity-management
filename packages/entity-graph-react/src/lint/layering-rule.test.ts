import { describe, it, expect } from "vitest";
import { prometheusEntityLayeringRule } from "./layering-rule";

describe("prometheusEntityLayeringRule", () => {
  it("bans useGraphStore import in component files by default", () => {
    const cfg = prometheusEntityLayeringRule();
    const rule = cfg.rules["no-restricted-imports"] as [string, { paths: Array<{ name: string; importNames: string[] }> }];
    expect(rule[0]).toBe("error");
    const ban = rule[1].paths.find((p) => p.name === "@prometheus-ags/prometheus-entity-management");
    expect(ban?.importNames).toContain("useGraphStore");
  });

  it("applies to component globs and exempts hook globs", () => {
    const cfg = prometheusEntityLayeringRule();
    expect(cfg.files).toContain("src/**/*.tsx");
    expect(cfg.ignores).toContain("**/hooks/**");
    expect(cfg.ignores.some((g) => g.includes("use-"))).toBe(true);
  });

  it("bans the local graph store module via patterns", () => {
    const cfg = prometheusEntityLayeringRule();
    const rule = cfg.rules["no-restricted-imports"] as [string, { patterns: Array<{ group: string[] }> }];
    expect(rule[1].patterns[0]?.group).toContain("**/graph");
  });

  it("respects custom package name and hook globs", () => {
    const cfg = prometheusEntityLayeringRule({
      packageName: "@my-org/entities",
      hookGlobs: ["**/my-hooks/**"],
    });
    const rule = cfg.rules["no-restricted-imports"] as [string, { paths: Array<{ name: string }> }];
    expect(rule[1].paths[0]?.name).toBe("@my-org/entities");
    expect(cfg.ignores).toEqual(["**/my-hooks/**"]);
  });
});
