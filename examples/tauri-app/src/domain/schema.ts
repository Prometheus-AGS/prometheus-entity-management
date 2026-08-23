/**
 * domain/schema.ts
 *
 * Relation schemas mirroring examples/vite-app/src/schema/index.ts so cascade
 * invalidation behaves identically in every 3.0 showcase (design D-1).
 */
import { registerSchema } from "@prometheus-ags/prometheus-entity-management";

export function registerDomainSchemas(): void {
  registerSchema({
    type: "Project",
    globalListKeys: ["projects"],
    relations: {
      owner: {
        cardinality: "belongsTo",
        foreignKey: "ownerId",
        targetType: "User",
        invalidateTargetLists: ["user-projects"],
      },
      tasks: {
        cardinality: "hasMany",
        targetType: "Task",
        foreignKey: "projectId",
        listKeyPrefix: (id) => ["tasks", { projectId: id }],
      },
    },
  });

  registerSchema({
    type: "Task",
    globalListKeys: ["tasks"],
    relations: {
      project: {
        cardinality: "belongsTo",
        foreignKey: "projectId",
        targetType: "Project",
        invalidateTargetLists: ["tasks"],
      },
      assignee: {
        cardinality: "belongsTo",
        foreignKey: "assigneeId",
        targetType: "User",
      },
      reporter: {
        cardinality: "belongsTo",
        foreignKey: "reporterId",
        targetType: "User",
      },
    },
  });

  registerSchema({
    type: "User",
    globalListKeys: ["users"],
    relations: {
      ownedProjects: {
        cardinality: "hasMany",
        targetType: "Project",
        foreignKey: "ownerId",
        listKeyPrefix: (id) => ["projects", { ownerId: id }],
      },
      assignedTasks: {
        cardinality: "hasMany",
        targetType: "Task",
        foreignKey: "assigneeId",
        listKeyPrefix: (id) => ["tasks", { assigneeId: id }],
      },
    },
  });
}
