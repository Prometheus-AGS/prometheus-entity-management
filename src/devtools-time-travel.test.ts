import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "./graph";
import { __resetMergeStrategies } from "./merge/registry";
import {
  recordGraphSnapshot,
  restoreGraphSnapshot,
  restoreGraphSnapshotBySeq,
  stepTimeTravel,
  getTimeTravelState,
  configureTimeTravel,
  __resetTimeTravel,
} from "./devtools-time-travel";

describe("G4: true time-travel (rewind + replay the live graph)", () => {
  beforeEach(() => {
    __resetTimeTravel();
    __resetMergeStrategies();
    const s = useGraphStore.getState();
    for (const id of Object.keys(s.entities.TT ?? {})) s.removeEntity("TT", id);
  });

  it("restores the LIVE graph to a prior recorded state", () => {
    const s = useGraphStore.getState();
    s.upsertEntity("TT", "x", { id: "x", v: 1 });
    const seq0 = recordGraphSnapshot("v1");          // state A: v=1

    s.upsertEntity("TT", "x", { v: 2 });
    recordGraphSnapshot("v2");                         // state B: v=2
    expect(useGraphStore.getState().readEntity<Record<string, unknown>>("TT", "x")?.v).toBe(2);

    // Rewind to state A — the LIVE graph must revert.
    expect(restoreGraphSnapshotBySeq(seq0)).toBe(true);
    expect(useGraphStore.getState().readEntity<Record<string, unknown>>("TT", "x")?.v).toBe(1);
  });

  it("round-trips: record N → restore K → replay to N", () => {
    const s = useGraphStore.getState();
    s.upsertEntity("TT", "y", { id: "y", step: 0 });
    recordGraphSnapshot();                             // idx 0: step 0
    s.upsertEntity("TT", "y", { step: 1 });
    recordGraphSnapshot();                             // idx 1: step 1
    s.upsertEntity("TT", "y", { step: 2 });
    const headSeq = recordGraphSnapshot();             // idx 2: step 2

    restoreGraphSnapshot(0);
    expect(useGraphStore.getState().readEntity<Record<string, unknown>>("TT", "y")?.step).toBe(0);

    // Replay forward to head.
    restoreGraphSnapshotBySeq(headSeq);
    expect(useGraphStore.getState().readEntity<Record<string, unknown>>("TT", "y")?.step).toBe(2);
  });

  it("restoring does not alias ring contents (later mutation cannot corrupt history)", () => {
    const s = useGraphStore.getState();
    s.upsertEntity("TT", "z", { id: "z", v: "a" });
    recordGraphSnapshot();                             // snapshot of v:a
    restoreGraphSnapshot(0);
    // Mutate AFTER restore — the recorded snapshot must remain v:a.
    useGraphStore.getState().upsertEntity("TT", "z", { v: "b" });
    restoreGraphSnapshot(0);
    expect(useGraphStore.getState().readEntity<Record<string, unknown>>("TT", "z")?.v).toBe("a");
  });

  it("stepTimeTravel moves backward and forward through history", () => {
    const s = useGraphStore.getState();
    for (let i = 0; i < 3; i++) {
      s.upsertEntity("TT", "s", { id: "s", i });
      recordGraphSnapshot();
    }
    stepTimeTravel(-2); // back to i=0
    expect(useGraphStore.getState().readEntity<Record<string, unknown>>("TT", "s")?.i).toBe(0);
    stepTimeTravel(+1); // forward to i=1
    expect(useGraphStore.getState().readEntity<Record<string, unknown>>("TT", "s")?.i).toBe(1);
  });

  it("ring is bounded by capacity", () => {
    configureTimeTravel({ capacity: 3 });
    for (let i = 0; i < 6; i++) {
      useGraphStore.getState().upsertEntity("TT", "c", { id: "c", i });
      recordGraphSnapshot();
    }
    expect(getTimeTravelState().snapshots.length).toBe(3);
  });
});
