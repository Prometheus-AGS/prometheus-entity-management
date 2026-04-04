import type { ListResponse } from "@prometheus-ags/prometheus-entity-management";
import { delay, useDemoBackendStore } from "@/features/demo-backend/demo-backend-store";
import type { ProjectListParams } from "@/features/demo-backend/demo-backend-store";
import type { Project } from "@/types";

export const projectStore = {
  async list(params?: ProjectListParams): Promise<ListResponse<Project>> {
    await delay(250);
    const items = useDemoBackendStore.getState().listProjects(params);
    return { items, total: items.length };
  },
  async get(id: string): Promise<Project> {
    await delay(150);
    const project = useDemoBackendStore.getState().getProject(id);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }
    return project;
  },
  async create(data: Partial<Project>): Promise<Project> {
    await delay();
    return useDemoBackendStore.getState().createProject(data);
  },
  async update(id: string, patch: Partial<Project>): Promise<Project> {
    await delay();
    return useDemoBackendStore.getState().updateProject(id, patch);
  },
  async delete(id: string): Promise<void> {
    await delay();
    useDemoBackendStore.getState().deleteProject(id);
  },
};
