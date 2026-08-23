import { create } from "zustand";
import { createPlatformService } from "../services/platform-service";
import type {
  ConnectionMode,
  PlatformService,
  PlatformSnapshot,
  RealtimeProof,
  RelationshipProof,
} from "../types";
import type { TaskStatus } from "@/features/tasks/types";

type BootPhase = "idle" | "booting" | "ready" | "error";

interface PlatformState extends PlatformSnapshot {
  phase: BootPhase;
  error: string | null;
  selectedTaskId: string | null;
  capabilityProof: string | null;
  relationshipProof: RelationshipProof | null;
  realtimeProof: RealtimeProof | null;
  service: PlatformService | null;
  initialize(): Promise<void>;
  selectTask(taskId: string): void;
  setConnection(mode: ConnectionMode): Promise<void>;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
  reassignTaskProject(taskId: string, projectId: string): Promise<void>;
  runRealtimeBurst(taskId: string): Promise<void>;
  persist(): Promise<void>;
  restore(): Promise<void>;
  proveDestructiveCommandDenied(): Promise<void>;
}

const initialSnapshot: PlatformSnapshot = {
  platform: "browser-preview",
  connection: "online",
  storage: "browser-local-storage",
  pendingMutations: 0,
  lastPersistedAt: null,
  lifecycle: "foreground",
  deepLink: null,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  ...initialSnapshot,
  phase: "idle",
  error: null,
  selectedTaskId: null,
  capabilityProof: null,
  relationshipProof: null,
  realtimeProof: null,
  service: null,

  async initialize() {
    if (get().service || get().phase === "booting") return;
    const service = createPlatformService({
      onSnapshot: (snapshot) => set(snapshot),
      onDeepLinkTask: (taskId) => set({ selectedTaskId: taskId }),
    });
    set({ phase: "booting", error: null, service });
    try {
      const snapshot = await service.initialize();
      set({ ...snapshot, phase: "ready" });
    } catch (error) {
      set({ phase: "error", error: errorMessage(error) });
    }
  },

  selectTask(taskId) {
    set({ selectedTaskId: taskId });
  },

  async setConnection(mode) {
    const service = get().service;
    if (!service) return;
    set({ error: null });
    try {
      set(await service.setConnection(mode));
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  async updateTaskStatus(taskId, status) {
    const service = get().service;
    if (!service) return;
    set({ error: null });
    try {
      set(await service.updateTaskStatus(taskId, status));
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  async reassignTaskProject(taskId, projectId) {
    const service = get().service;
    if (!service) return;
    set({ error: null, relationshipProof: null });
    try {
      set({ relationshipProof: await service.reassignTaskProject(taskId, projectId) });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  async runRealtimeBurst(taskId) {
    const service = get().service;
    if (!service) return;
    set({ error: null, realtimeProof: null });
    try {
      set({ realtimeProof: await service.runRealtimeBurst(taskId) });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  async persist() {
    const service = get().service;
    if (!service) return;
    set({ error: null });
    try {
      set(await service.persist());
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  async restore() {
    const service = get().service;
    if (!service) return;
    set({ error: null });
    try {
      set(await service.restore());
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },

  async proveDestructiveCommandDenied() {
    const service = get().service;
    if (!service) return;
    set({ error: null, capabilityProof: null });
    try {
      set({ capabilityProof: await service.proveDestructiveCommandDenied() });
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  },
}));
