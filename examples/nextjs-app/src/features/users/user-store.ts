import type { ListResponse } from "@prometheus-ags/prometheus-entity-management";
import { delay, useDemoBackendStore } from "@/features/demo-backend/demo-backend-store";
import type { UserListParams } from "@/features/demo-backend/demo-backend-store";
import { recordDemoRead } from "@/lib/fetch-metrics";
import type { User } from "@/types";

export const userStore = {
  async list(params?: UserListParams): Promise<ListResponse<User>> {
    recordDemoRead("User.list");
    await delay(200);
    const items = useDemoBackendStore.getState().listUsers(params);
    return { items, total: items.length };
  },
  async get(id: string): Promise<User> {
    recordDemoRead("User.get");
    await delay(150);
    const user = useDemoBackendStore.getState().getUser(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    return user;
  },
  async create(data: Partial<User>): Promise<User> {
    recordDemoRead("User.create");
    await delay();
    return useDemoBackendStore.getState().createUser(data);
  },
  async update(id: string, patch: Partial<User>): Promise<User> {
    recordDemoRead("User.update");
    await delay();
    return useDemoBackendStore.getState().updateUser(id, patch);
  },
  async delete(id: string): Promise<void> {
    recordDemoRead("User.delete");
    await delay();
    useDemoBackendStore.getState().deleteUser(id);
  },
};
