import { create } from "zustand";
import { registerEntityTransport } from "@prometheus-ags/prometheus-entity-management";
import type { CompletenessMode } from "@prometheus-ags/prometheus-entity-management";
import type { Task } from "@/types";
import {
  createShowcaseTaskTransport,
  hydrateShowcaseGraph,
  persistShowcaseGraph,
  reassignTaskWithCascade,
  runLoroConvergence,
  runRealtimeBurst,
  updateTaskStatus,
} from "./release-showcase-service";
import type {
  ConvergenceProof,
  PersistenceProof,
  RealtimeProof,
  ShowcaseTransportMode,
  TransportProof,
} from "./release-showcase-service";

interface MutationProof {
  outcome: "confirmed" | "rolled-back";
  message: string;
}

interface ReleaseShowcaseState {
  transportMode: ShowcaseTransportMode;
  viewMode: CompletenessMode;
  search: string;
  selectedTaskId: string;
  transportProof: TransportProof | null;
  persistenceProof: PersistenceProof | null;
  convergenceProof: ConvergenceProof | null;
  realtimeProof: RealtimeProof | null;
  mutationProof: MutationProof | null;
  relationProof: string | null;
  busy: string | null;
  error: string | null;
  setTransportMode: (mode: ShowcaseTransportMode) => void;
  setViewMode: (mode: CompletenessMode) => void;
  setSearch: (search: string) => void;
  selectTask: (id: string) => void;
  setMutationProof: (proof: MutationProof) => void;
  persist: () => Promise<void>;
  hydrate: () => Promise<void>;
  converge: () => Promise<void>;
  burst: () => void;
  reassign: (id: string, projectId: string) => Promise<void>;
  updateStatus: (id: string, status: Task["status"], reject: boolean) => Promise<void>;
}

function installTransport(mode: ShowcaseTransportMode) {
  registerEntityTransport(
    "Task",
    createShowcaseTaskTransport(mode, (transportProof) => {
      useReleaseShowcaseStore.setState({ transportProof });
    }),
  );
}

async function runProof(
  label: string,
  work: () => Promise<Partial<ReleaseShowcaseState>>,
) {
  useReleaseShowcaseStore.setState({ busy: label, error: null });
  try {
    useReleaseShowcaseStore.setState({ ...(await work()), busy: null });
  } catch (error) {
    useReleaseShowcaseStore.setState({
      busy: null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export const useReleaseShowcaseStore = create<ReleaseShowcaseState>((set) => ({
  transportMode: "demo-rest",
  viewMode: "local",
  search: "",
  selectedTaskId: "t1",
  transportProof: null,
  persistenceProof: null,
  convergenceProof: null,
  realtimeProof: null,
  mutationProof: null,
  relationProof: null,
  busy: null,
  error: null,
  setTransportMode: (transportMode) => {
    installTransport(transportMode);
    set({ transportMode, transportProof: null, error: null });
  },
  setViewMode: (viewMode) => set({ viewMode }),
  setSearch: (search) => set({ search }),
  selectTask: (selectedTaskId) => set({ selectedTaskId }),
  setMutationProof: (mutationProof) => set({ mutationProof }),
  persist: () =>
    runProof("persist", async () => ({ persistenceProof: await persistShowcaseGraph() })),
  hydrate: () =>
    runProof("hydrate", async () => ({ persistenceProof: await hydrateShowcaseGraph() })),
  converge: () =>
    runProof("converge", async () => ({ convergenceProof: await runLoroConvergence() })),
  burst: () => set({ realtimeProof: runRealtimeBurst(), error: null }),
  reassign: async (id, projectId) => {
    await runProof("relation", async () => {
      const task = await reassignTaskWithCascade(id, projectId);
      return {
        relationProof: `${task.id} moved to ${task.projectId}; old and new relations invalidated`,
      };
    });
  },
  updateStatus: async (id, status, reject) => {
    await updateTaskStatus(id, status, reject);
  },
}));

installTransport("demo-rest");

