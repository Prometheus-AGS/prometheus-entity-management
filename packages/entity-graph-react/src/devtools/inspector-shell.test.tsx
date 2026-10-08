import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createGraphStore, type GraphStore } from "@prometheus-ags/entity-graph-core";

import { EntityGraphDevtoolsProvider } from "./provider";
import { EntityGraphInspectorShell } from "./inspector-shell";
import type { EntityGraphInspectorStateAdapter } from "./state";

/** Let the controller publish and the model store flush its animation-frame projection. */
const settle = () => act(async () => {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
});

function seedStore({ dirty = true, error = false } = {}): GraphStore {
  const store = createGraphStore();
  const state = store.getState();
  state.upsertEntity("Order", "o-1", { id: "o-1", status: "new", total: 1 });
  state.upsertEntity("Order", "o-2", { id: "o-2", status: "new", total: 2 });
  state.upsertEntity("Order", "o-3", { id: "o-3", status: "new", total: 3 });
  if (dirty) state.patchEntity("Order", "o-2", { status: "paid", total: 9 });
  if (error) state.setEntityError("Order", "o-3", "fetch failed");
  return store;
}

async function renderInspector(store: GraphStore, stateAdapter?: EntityGraphInspectorStateAdapter) {
  const view = render(
    <EntityGraphDevtoolsProvider store={store} options={{ storeId: "graph-1" }}>
      <EntityGraphInspectorShell stateAdapter={stateAdapter} />
    </EntityGraphDevtoolsProvider>,
  );
  await settle();
  return view;
}

const shell = () => document.querySelector(".pem-inspector") as HTMLElement;
const workspaceTab = (label: RegExp) =>
  within(document.querySelector(".pem-workspace-tabs") as HTMLElement).getByRole("tab", { name: label });
const entitiesWorkspace = () => document.querySelector(".pem-entity-workspace") as HTMLElement;
const activityWorkspace = () => document.querySelector(".pem-activity-workspace") as HTMLElement;
const pressedFilter = () =>
  (entitiesWorkspace().querySelector('.pem-filter-row button[aria-pressed="true"]') as HTMLElement).textContent;
const selectedEntityRow = () =>
  entitiesWorkspace().querySelector('.pem-entity-row[data-selected="true"]') as HTMLElement | null;
const selectedValueTab = () =>
  (entitiesWorkspace().querySelector('.pem-value-tabs [role="tab"][aria-selected="true"]') as HTMLElement).textContent;

async function rewindThroughActivity(pick: "baseline" | "latest" = "latest") {
  fireEvent.click(workspaceTab(/^Activity/));
  const select = activityWorkspace().querySelector(".pem-time-travel select") as HTMLSelectElement;
  const option = pick === "baseline" ? select.options[0] : select.options[select.options.length - 1];
  fireEvent.change(select, { target: { value: option.value } });
  fireEvent.click(within(activityWorkspace()).getByRole("button", { name: "Rewind graph" }));
  await settle();
}

describe("inspector landing defaults", () => {
  afterEach(cleanup);

  it("opens on Entities with the dirty filter, the first dirty entity and the diff tab when something is dirty", async () => {
    await renderInspector(seedStore({ dirty: true }));
    expect(workspaceTab(/^Entities/).getAttribute("aria-selected")).toBe("true");
    expect(pressedFilter()).toBe("dirty");
    expect(selectedEntityRow()?.getAttribute("title")).toBe("Order / o-2");
    expect(selectedValueTab()).toMatch(/^diff/);
  });

  it("keeps Overview and the original tab for a clean snapshot", async () => {
    await renderInspector(seedStore({ dirty: false }));
    expect(workspaceTab(/^Overview/).getAttribute("aria-selected")).toBe("true");
    expect(pressedFilter()).toBe("all");
    expect(selectedValueTab()).toBe("original");
  });

  it("lets an explicit value-tab choice win over the dirty default", async () => {
    const store = seedStore({ dirty: true });
    await renderInspector(store);
    fireEvent.click(within(entitiesWorkspace()).getByRole("tab", { name: "original" }));
    expect(selectedValueTab()).toBe("original");
    act(() => { store.getState().patchEntity("Order", "o-2", { note: "x" }); });
    await settle();
    expect(selectedValueTab()).toBe("original");
  });

  it("does not re-land once the user has moved on, even when new entities turn dirty", async () => {
    const store = seedStore({ dirty: false });
    await renderInspector(store);
    fireEvent.click(workspaceTab(/^Views/));
    act(() => { store.getState().patchEntity("Order", "o-1", { status: "late" }); });
    await settle();
    expect(workspaceTab(/^Views/).getAttribute("aria-selected")).toBe("true");
    expect(pressedFilter()).toBe("all");
  });

  it("respects a host state adapter that names a workspace", async () => {
    const adapter: EntityGraphInspectorStateAdapter = {
      read: () => ({ version: 1, workspace: "overview" }),
      write: () => undefined,
    };
    await renderInspector(seedStore({ dirty: true }), adapter);
    expect(workspaceTab(/^Overview/).getAttribute("aria-selected")).toBe("true");
    expect(pressedFilter()).toBe("all");
  });
});

describe("actionable status", () => {
  afterEach(cleanup);

  it("hides the errors chip at zero and exposes dirty/error chips as buttons", async () => {
    await renderInspector(seedStore({ dirty: true, error: false }));
    const status = document.querySelector(".pem-shell-status") as HTMLElement;
    expect(status.textContent).not.toMatch(/errors/);
    const dirtyChip = within(status).getByRole("button", { name: /1 dirty/ });
    expect(dirtyChip.getAttribute("data-tone")).toBe("dirty");
  });

  it("switches to Entities filtered by errors with the first erroring entity selected from the header chip", async () => {
    await renderInspector(seedStore({ dirty: false, error: true }));
    const status = document.querySelector(".pem-shell-status") as HTMLElement;
    const errorsChip = within(status).getByRole("button", { name: /1 errors/ });
    expect(errorsChip.getAttribute("data-tone")).toBe("error");
    fireEvent.click(errorsChip);
    expect(workspaceTab(/^Entities/).getAttribute("aria-selected")).toBe("true");
    expect(pressedFilter()).toBe("errors");
    expect(selectedEntityRow()?.getAttribute("title")).toBe("Order / o-3");
  });

  it("makes the Overview Dirty and Errors metrics buttons that focus the matching entities", async () => {
    const store = seedStore({ dirty: true, error: true });
    await renderInspector(store);
    fireEvent.click(workspaceTab(/^Overview/));
    const metrics = document.querySelector(".pem-metric-grid") as HTMLElement;
    const dirtyMetric = within(metrics).getByRole("button", { name: /Dirty/ });
    expect(dirtyMetric.getAttribute("data-tone")).toBe("dirty");
    const errorsMetric = within(metrics).getByRole("button", { name: /Errors/ });
    expect(errorsMetric.getAttribute("data-tone")).toBe("error");
    expect(within(metrics).queryByRole("button", { name: /^Entities/ })).toBeNull();

    fireEvent.click(errorsMetric);
    expect(workspaceTab(/^Entities/).getAttribute("aria-selected")).toBe("true");
    expect(pressedFilter()).toBe("errors");
    expect(selectedEntityRow()?.getAttribute("title")).toBe("Order / o-3");

    fireEvent.click(workspaceTab(/^Overview/));
    fireEvent.click(dirtyMetric);
    expect(pressedFilter()).toBe("dirty");
    expect(selectedEntityRow()?.getAttribute("title")).toBe("Order / o-2");
  });
});

describe("entity detail summary", () => {
  afterEach(cleanup);

  it("summarises locally patched fields in one line", async () => {
    await renderInspector(seedStore({ dirty: true }));
    const summary = entitiesWorkspace().querySelector(".pem-dirty-summary") as HTMLElement;
    expect(summary.textContent).toBe("2 fields locally patched · status, +1 more");
  });

  it("uses the singular form and omits the line for clean entities", async () => {
    const store = seedStore({ dirty: false });
    store.getState().patchEntity("Order", "o-1", { status: "late" });
    await renderInspector(store);
    expect((entitiesWorkspace().querySelector(".pem-dirty-summary") as HTMLElement).textContent)
      .toBe("1 field locally patched · status");
    fireEvent.click(within(entitiesWorkspace()).getByRole("button", { name: "all" }));
    fireEvent.click(within(entitiesWorkspace()).getByTitle("Order / o-3"));
    expect(entitiesWorkspace().querySelector(".pem-dirty-summary")).toBeNull();
  });
});

describe("activity copy", () => {
  afterEach(cleanup);

  it("shows the correlation suffix instead of the store prefix and drops the duplicate Observed row", async () => {
    const store = seedStore({ dirty: false });
    await renderInspector(store);
    act(() => { store.getState().upsertEntity("Order", "o-1", { id: "o-1", status: "shipped", total: 1 }); });
    await settle();
    fireEvent.click(workspaceTab(/^Activity/));
    const rows = activityWorkspace().querySelectorAll(".pem-event-row");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const correlation = (row.querySelector(".pem-correlation") as HTMLElement).textContent ?? "";
      expect(correlation).not.toContain("graph-1");
      expect(correlation).toMatch(/^\d+$/);
    }
    expect((rows[0] as HTMLElement).textContent).toContain("Order/o-1 · upsert");
    const terms = [...activityWorkspace().querySelectorAll(".pem-event-readouts dt")].map((dt) => dt.textContent);
    expect(terms).not.toContain("Observed");
  });
});

describe("rewound state", () => {
  afterEach(cleanup);

  it("frames the inspector, shows a sticky bar in every workspace and returns to live from it", async () => {
    const store = seedStore({ dirty: false });
    await renderInspector(store);
    act(() => { store.getState().upsertEntity("Order", "o-1", { id: "o-1", status: "shipped", total: 1 }); });
    await settle();
    expect(shell().getAttribute("data-rewound")).toBe("false");
    expect(document.querySelector(".pem-rewound-bar")).toBeNull();

    await rewindThroughActivity();
    expect(shell().getAttribute("data-rewound")).toBe("true");
    const bar = shell().querySelector(":scope > .pem-rewound-bar") as HTMLElement;
    expect(bar.textContent).toMatch(/^Viewing snapshot \d+ \(event \d+\) · /);

    fireEvent.click(workspaceTab(/^Overview/));
    expect(shell().querySelector(":scope > .pem-rewound-bar")).not.toBeNull();

    fireEvent.click(within(bar).getByRole("button", { name: "Return to live" }));
    await settle();
    expect(shell().getAttribute("data-rewound")).toBe("false");
    expect(document.querySelector(".pem-rewound-bar")).toBeNull();
  });

  it("omits the event reference for the baseline snapshot", async () => {
    const store = seedStore({ dirty: false });
    await renderInspector(store);
    act(() => { store.getState().upsertEntity("Order", "o-1", { id: "o-1", status: "shipped", total: 1 }); });
    await settle();
    await rewindThroughActivity("baseline");
    const bar = shell().querySelector(":scope > .pem-rewound-bar") as HTMLElement;
    expect(bar.textContent).toMatch(/^Viewing snapshot \d+ · Return to live$/);
  });
});

describe("pause copy", () => {
  afterEach(cleanup);

  it("counts events received since pausing on the Resume control", async () => {
    const store = seedStore({ dirty: false });
    await renderInspector(store);
    fireEvent.click(workspaceTab(/^Activity/));
    const pause = within(activityWorkspace()).getByRole("button", { name: /Pause/ });
    fireEvent.click(pause);
    expect(pause.textContent).toMatch(/Resume$/);
    act(() => {
      store.getState().upsertEntity("Order", "o-1", { id: "o-1", status: "a", total: 1 });
      store.getState().upsertEntity("Order", "o-1", { id: "o-1", status: "b", total: 1 });
    });
    await settle();
    expect(pause.textContent).toMatch(/Resume · 2 new$/);
    fireEvent.click(pause);
    expect(pause.textContent).toMatch(/Pause$/);
  });
});
