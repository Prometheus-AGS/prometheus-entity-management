import type { A2uiApprovalRequest } from "@prometheus-ags/a2ui-react";
import { createStore } from "zustand/vanilla";

export interface PendingApproval {
  id: number;
  actionName: string;
  entityId: string;
  summary: string;
}

interface ApprovalResolution {
  id: number;
  approved: boolean;
}

interface ApprovalState {
  pending: PendingApproval | null;
  lastResolution: ApprovalResolution | null;
  request(request: A2uiApprovalRequest): Promise<boolean>;
  resolve(approved: boolean): void;
}

let nextApprovalId = 0;

export const approvalStore = createStore<ApprovalState>((set, get) => ({
  pending: null,
  lastResolution: null,

  request(request) {
    if (get().pending) return Promise.resolve(false);

    const id = ++nextApprovalId;
    const entityId =
      typeof request.context.taskId === "string"
        ? request.context.taskId
        : "unknown-task";
    set({
      pending: {
        id,
        actionName: request.action.name,
        entityId,
        summary: `Allow the agent to archive ${entityId}?`,
      },
      lastResolution: null,
    });

    return new Promise<boolean>((resolve) => {
      const unsubscribe = approvalStore.subscribe((state) => {
        if (state.lastResolution?.id !== id) return;
        unsubscribe();
        resolve(state.lastResolution.approved);
      });
    });
  },

  resolve(approved) {
    const pending = get().pending;
    if (!pending) return;
    set({
      pending: null,
      lastResolution: { id: pending.id, approved },
    });
  },
}));
