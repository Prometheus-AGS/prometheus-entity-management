// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { EntityExplorerProvider, EntityExplorerFAB, EntityExplorerPanel, useEntityExplorer } from "./index";
import { __resetStoreRegistry } from "../../devtools-event-bus";

// ── jsdom polyfills ────────────────────────────────────────────────────────────

beforeAll(() => {
  // TanStack Virtual requires ResizeObserver
  (globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  // Portals render into document.body outside the React root; ensure body is clean.
  document.body.innerHTML = "";
});

beforeEach(() => {
  __resetStoreRegistry();
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <EntityExplorerProvider busOptions={{ bufferSize: 10, coalesceBurstThreshold: 0 }}>
      {children}
    </EntityExplorerProvider>
  );
}

// ── FAB tests ──────────────────────────────────────────────────────────────────

describe("EntityExplorerFAB", () => {
  it("renders into document.body (portal)", () => {
    render(<Wrapper><EntityExplorerFAB /></Wrapper>);
    const fab = document.body.querySelector(".ee-fab");
    expect(fab).toBeTruthy();
  });

  it("has aria-label and aria-expanded=false when closed", () => {
    render(<Wrapper><EntityExplorerFAB /></Wrapper>);
    const fab = document.body.querySelector(".ee-fab") as HTMLButtonElement;
    expect(fab.getAttribute("aria-expanded")).toBe("false");
    expect(fab.getAttribute("aria-label")).toMatch(/open entity explorer/i);
  });

  it("clicking FAB opens the panel (aria-expanded becomes true)", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    const fab = document.body.querySelector(".ee-fab") as HTMLButtonElement;
    fireEvent.click(fab);
    expect(fab.getAttribute("aria-expanded")).toBe("true");
  });

  it("clicking FAB again closes the panel", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    const fab = document.body.querySelector(".ee-fab") as HTMLButtonElement;
    fireEvent.click(fab); // open
    fireEvent.click(fab); // close
    expect(fab.getAttribute("aria-expanded")).toBe("false");
  });

  it("Alt+Shift+E keyboard shortcut toggles panel", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    const fab = document.body.querySelector(".ee-fab") as HTMLButtonElement;
    expect(fab.getAttribute("aria-expanded")).toBe("false");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { altKey: true, shiftKey: true, key: "E" }));
    });
    expect(fab.getAttribute("aria-expanded")).toBe("true");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { altKey: true, shiftKey: true, key: "E" }));
    });
    expect(fab.getAttribute("aria-expanded")).toBe("false");
  });
});

// ── Panel tests ────────────────────────────────────────────────────────────────

describe("EntityExplorerPanel", () => {
  it("panel mounts into document.body via portal", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    fireEvent.click(document.body.querySelector(".ee-fab") as HTMLButtonElement);
    const panel = document.body.querySelector(".ee-panel");
    expect(panel).toBeTruthy();
  });

  it("panel contains exactly 4 tabs", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    fireEvent.click(document.body.querySelector(".ee-fab") as HTMLButtonElement);
    const tabs = document.body.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(4);
    const labels = Array.from(tabs).map((t) => t.textContent);
    expect(labels).toContain("Entities");
    expect(labels).toContain("Patches");
    expect(labels).toContain("Events");
    expect(labels).toContain("Performance");
  });

  it("inactive tabs are hidden via data-hidden, not removed from DOM", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    fireEvent.click(document.body.querySelector(".ee-fab") as HTMLButtonElement);
    // Entities tab is active by default; other panels should have data-hidden="true"
    const panels = document.body.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(4); // all mounted
    const hidden = Array.from(panels).filter((p) => p.getAttribute("data-hidden") === "true");
    expect(hidden).toHaveLength(3); // 3 inactive
  });

  it("clicking a tab activates it and deactivates others", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    fireEvent.click(document.body.querySelector(".ee-fab") as HTMLButtonElement);
    const tabs = document.body.querySelectorAll('[role="tab"]');
    const eventsTab = Array.from(tabs).find((t) => t.textContent === "Events")!;
    fireEvent.click(eventsTab);
    expect(eventsTab.getAttribute("aria-selected")).toBe("true");
    const panels = document.body.querySelectorAll('[role="tabpanel"]');
    const visiblePanels = Array.from(panels).filter((p) => !p.getAttribute("data-hidden"));
    expect(visiblePanels).toHaveLength(1);
    expect(visiblePanels[0]!.id).toBe("ee-panel-events");
  });

  it("ArrowRight on tab moves focus to next tab", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    fireEvent.click(document.body.querySelector(".ee-fab") as HTMLButtonElement);
    const tabs = document.body.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    tabs[0]!.focus();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
    // Tab 1 (Patches) should now be active
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
  });
});

// ── Context tests ──────────────────────────────────────────────────────────────

describe("useEntityExplorer", () => {
  it("throws a descriptive error when called outside provider", () => {
    function BadComponent() {
      useEntityExplorer();
      return null;
    }
    expect(() => {
      // Suppress React error boundary noise
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        render(<BadComponent />);
      } finally {
        spy.mockRestore();
      }
    }).toThrow(/EntityExplorerProvider/);
  });
});

// ── DetailPane tests ───────────────────────────────────────────────────────────

describe("DetailPane", () => {
  it("DetailPane is absent when no entity selected", () => {
    render(<Wrapper><EntityExplorerFAB /><EntityExplorerPanel /></Wrapper>);
    fireEvent.click(document.body.querySelector(".ee-fab") as HTMLButtonElement);
    expect(document.body.querySelector(".ee-detail-pane")).toBeNull();
  });
});
