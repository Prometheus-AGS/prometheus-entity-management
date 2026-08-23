import { create } from "zustand";
import { registerEntityTransport } from "@prometheus-ags/prometheus-entity-management";
import type { CompletenessMode } from "@prometheus-ags/prometheus-entity-management";
import type { Task } from "@/types";
import {
  createShowcaseTaskTransport,
  reassignTaskWithCascade,
  runRealtimeBurst,
  updateTaskStatus,
} from "./release-showcase-service";
import type {
  RealtimeProof,
  TransportProof,
} from "./release-showcase-service";

interface MutationProof {
  outcome: "confirmed" | "rolled-back";
  message: string;
}

interface ReleaseShowcaseState {
  viewMode: CompletenessMode;
  search: string;
  selectedTaskId: string;
  transportProof: TransportProof | null;
  realtimeProof: RealtimeProof | null;
  mutationProof: MutationProof | null;
  relationProof: string | null;
  busy: string | null;
  error: string | null;
  setViewMode: (mode: CompletenessMode) => void;
  setSearch: (search: string) => void;
  selectTask: (id: string) => void;
  setMutationProof: (proof: MutationProof) => void;
  burst: () => void;
  reassign: (id: string, projectId: string) => Promise<void>;
  updateStatus: (id: string, status: Task["status"], reject: boolean) => Promise<void>;
}

function installTransport() {
  registerEntityTransport(
    "Task",
    createShowcaseTaskTransport((transportProof) => {
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
  viewMode: "local",
  search: "",
  selectedTaskId: "t1",
  transportProof: null,
  realtimeProof: null,
  mutationProof: null,
  relationProof: null,
  busy: null,
  error: null,
  setViewMode: (viewMode) => set({ viewMode }),
  setSearch: (search) => set({ search }),
  selectTask: (selectedTaskId) => set({ selectedTaskId }),
  setMutationProof: (mutationProof) => set({ mutationProof }),
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

installTransport();
