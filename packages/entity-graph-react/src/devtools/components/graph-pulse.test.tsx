import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GraphPulse } from "./graph-pulse";

describe("GraphPulse", () => {
  afterEach(cleanup);

  it("does not reference the segment list while collapsed, and does once expanded", () => {
    const { rerender } = render(
      <GraphPulse events={[]} selected={null} collapsed onToggleCollapsed={() => {}} onSelect={() => {}} />,
    );
    const toggle = screen.getByRole("button", { name: /graph pulse/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.hasAttribute("aria-controls")).toBe(false);

    rerender(<GraphPulse events={[]} selected={null} collapsed={false} onToggleCollapsed={() => {}} onSelect={() => {}} />);
    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).not.toBeNull();
  });
});
