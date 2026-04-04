import { useEntity, useEntityCRUD, useEntityList } from "@prometheus-ags/prometheus-entity-management";
import type { ViewDescriptor } from "@prometheus-ags/prometheus-entity-management";
import { userStore } from "./user-store";
import type { UserListParams } from "@/features/demo-backend/demo-backend-store";
import type { User } from "@/types";

const normalizeUser = (user: User) => ({ id: user.id, data: user });

export function useUsersList(
  queryKey: unknown[] = ["users"],
  params?: UserListParams,
) {
  return useEntityList<User, User>({
    type: "User",
    queryKey,
    fetch: () => userStore.list(params),
    normalize: normalizeUser,
  });
}

export function useUser(id: string | null | undefined) {
  return useEntity<User, User>({
    type: "User",
    id: id ?? undefined,
    fetch: userStore.get,
    normalize: (user) => user,
    enabled: !!id,
  });
}

interface UseUsersCrudOptions {
  listQueryKey?: unknown[];
  initialView?: ViewDescriptor;
  createDefaults?: Partial<User>;
}

export function useUsersCrud(options: UseUsersCrudOptions = {}) {
  const {
    listQueryKey = ["users"],
    initialView = { sort: [{ field: "name", direction: "asc" }] },
    createDefaults = {
      role: "developer",
      status: "active",
      department: "Engineering",
    },
  } = options;

  return useEntityCRUD<User>({
    type: "User",
    listQueryKey,
    listFetch: ({ rest }) => userStore.list(rest as UserListParams),
    normalize: normalizeUser,
    detailFetch: userStore.get,
    onCreate: (data) => userStore.create(data),
    onUpdate: (id, patch) => userStore.update(id, patch),
    onDelete: (id) => userStore.delete(id),
    createDefaults,
    initialView,
  });
}
