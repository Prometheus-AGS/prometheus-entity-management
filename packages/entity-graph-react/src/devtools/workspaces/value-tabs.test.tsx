import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EntityValueTabs } from "./value-tabs";

/**
 * The value tabs (original / patch / live / diff) are a tablist, so they must follow the ARIA
 * tabs pattern the workspace tabs already implement: one Tab stop (roving tabindex), arrow keys
 * move the active tab, and each tab is wired to its panel with aria-controls / aria-labelledby.
 */
describe("EntityValueTabs", () => {
  afterEach(cleanup);
  const tabs = ["original", "patch", "live", "diff"] as const;

  it("exposes a roving tabindex and wires tabs to the panel", () => {
    render(<><EntityValueTabs tabs={tabs} value="live" onChange={() => {}} diffCount={0} panelId="pem-value-panel" /><div role="tabpanel" id="pem-value-panel" aria-labelledby="pem-value-panel-tab-live" /></>);
    const tabElements = screen.getAllByRole("tab");
    expect(tabElements).toHaveLength(4);
    expect(tabElements.filter((tab) => tab.getAttribute("tabindex") === "0")).toHaveLength(1);
    const live = screen.getByRole("tab", { name: "live" });
    expect(live.getAttribute("aria-selected")).toBe("true");
    expect(live.getAttribute("tabindex")).toBe("0");
    expect(live.getAttribute("aria-controls")).toBe("pem-value-panel");
    expect(live.id).toBeTruthy();
    const panel = screen.getByRole("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(live.id);
  });

  it("moves with ArrowRight, ArrowLeft, Home and End", () => {
    const onChange = vi.fn();
    render(<EntityValueTabs tabs={tabs} value="live" onChange={onChange} diffCount={2} panelId="pem-value-panel" />);
    const live = screen.getByRole("tab", { name: "live" });
    fireEvent.keyDown(live, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("diff");
    fireEvent.keyDown(live, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("patch");
    fireEvent.keyDown(live, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("diff");
    fireEvent.keyDown(live, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("original");
  });

  it("shows the change count on the diff tab without hiding its name", () => {
    render(<EntityValueTabs tabs={tabs} value="diff" onChange={() => {}} diffCount={3} panelId="pem-value-panel" />);
    expect(screen.getByRole("tab", { name: /^diff/ }).textContent).toContain("3");
  });
});
