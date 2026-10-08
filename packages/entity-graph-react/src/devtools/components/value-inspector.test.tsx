import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ENTITY_GRAPH_DEVTOOLS_STYLES } from "../styles";
import { InspectorDiff } from "./value-inspector";

/**
 * The devtools stylesheet is a string injected into a Shadow DOM, so jsdom never applies it.
 * This test instead proves the contract between markup and stylesheet: every rule that styles a
 * diff-row cell must actually match the cells InspectorDiff renders. Before the fix the rules
 * targeted `.pem-diff-row > span` while body cells were `<code>`, so body rows rendered with no
 * padding, no mono font, no wrapping and no change colour.
 */
function cellSelectors(): string[] {
  const selectors = new Set<string>();
  for (const match of ENTITY_GRAPH_DEVTOOLS_STYLES.matchAll(/^([^{}]*\.pem-diff-row[^{}]*)\{/gm)) {
    for (const selector of match[1].split(",")) {
      const trimmed = selector.trim();
      if (trimmed.includes(">")) selectors.add(trimmed);
    }
  }
  return [...selectors];
}

describe("InspectorDiff markup matches the stylesheet", () => {
  const rows = [
    { path: "status", kind: "changed", original: "pending", live: "approved" },
    { path: "owner", kind: "added", original: undefined, live: "ada" },
  ] as const;

  it("styles every body cell, not only the header cells", () => {
    const { container } = render(<InspectorDiff rows={rows} />);
    const bodyRows = [...container.querySelectorAll('.pem-diff-row:not(.pem-diff-head)')];
    expect(bodyRows).toHaveLength(2);
    const cellRules = cellSelectors().filter((selector) => !selector.includes("[data-kind"));
    expect(cellRules.length).toBeGreaterThan(0);
    for (const row of bodyRows) {
      for (const cell of row.children) {
        expect(cellRules.some((selector) => cell.matches(selector)), `${cell.tagName} matches ${cellRules.join(" | ")}`).toBe(true);
      }
    }
  });

  it("applies the change colour rule to the field cell of changed rows", () => {
    const { container } = render(<InspectorDiff rows={rows} />);
    const changedField = container.querySelector('.pem-diff-row[data-kind="changed"] > :first-child');
    const changeRules = cellSelectors().filter((selector) => selector.includes('[data-kind="changed"]'));
    expect(changeRules.length).toBeGreaterThan(0);
    expect(changeRules.some((selector) => changedField?.matches(selector))).toBe(true);
  });
});
