import type { ListResponse } from "prometheus-entity-management";
import { delay, useDemoBackendStore } from "@/features/demo-backend/demo-backend-store";
import type { UserListParams } from "@/features/demo-backend/demo-backend-store";
import type { User } from "@/types";

export const userStore = {
  async list(params?: UserListParams): Promise<ListResponse<User>> {
    await delay(200);
    const items = useDemoBackendStore.getState().listUsers(params);
    return { items, total: items.length };
  },
  async get(id: string): Promise<User> {
    await delay(150);
    const user = useDemoBackendStore.getState().getUser(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    return user;
  },
  async create(data: Partial<User>): Promise<User> {
    await delay();
    return useDemoBackendStore.getState().createUser(data);
  },
  async update(id: string, patch: Partial<User>): Promise<User> {
    await delay();
    return useDemoBackendStore.getState().updateUser(id, patch);
  },
  async delete(id: string): Promise<void> {
    await delay();
    useDemoBackendStore.getState().deleteUser(id);
  },
};
