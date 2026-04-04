/**
 * Compatibility wrapper for the older `@/mock/api` import path.
 * New example code should prefer feature hooks and feature store modules.
 */
export { userStore as userApi } from "@/features/users/user-store";
export { projectStore as projectApi } from "@/features/projects/project-store";
export { taskStore as taskApi } from "@/features/tasks/task-store";
