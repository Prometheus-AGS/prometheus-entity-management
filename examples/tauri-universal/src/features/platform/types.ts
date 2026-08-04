import type { TaskStatus } from "@/features/tasks/types";

export type RuntimePlatform = "browser-preview" | "desktop" | "android" | "ios";
export type ConnectionMode = "online" | "offline";
export type LifecycleSignal =
  | "foreground"
  | "background"
  | "focus"
  | "blur"
  | "close-requested";

export interface PlatformSnapshot {
  platform: RuntimePlatform;
  connection: ConnectionMode;
  storage: "browser-local-storage" | "native-sqlite";
  pendingMutations: number;
  lastPersistedAt: string | null;
  lifecycle: LifecycleSignal;
  deepLink: string | null;
}

export interface RelationshipProof {
  taskId: string;
  previousProjectId: string;
  nextProjectId: string;
  previousProjectStale: boolean;
  nextProjectStale: boolean;
  taskListStale: boolean;
}

export interface RealtimeProof {
  taskId: string;
  receivedChanges: number;
  graphWrites: number;
  finalStatus: TaskStatus;
}

export interface PlatformServiceCallbacks {
  onSnapshot: (snapshot: PlatformSnapshot) => void;
  onDeepLinkTask: (taskId: string, sourceUrl: string) => void;
}

export interface PlatformService {
  initialize(): Promise<PlatformSnapshot>;
  setConnection(mode: ConnectionMode): Promise<PlatformSnapshot>;
  updateTaskStatus(taskId: string, status: TaskStatus): Promise<PlatformSnapshot>;
  reassignTaskProject(taskId: string, projectId: string): Promise<RelationshipProof>;
  runRealtimeBurst(taskId: string): Promise<RealtimeProof>;
  persist(): Promise<PlatformSnapshot>;
  restore(): Promise<PlatformSnapshot>;
  proveDestructiveCommandDenied(): Promise<string>;
  dispose(): Promise<void>;
}
