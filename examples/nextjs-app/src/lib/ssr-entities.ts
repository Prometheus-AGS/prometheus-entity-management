import type { InitialEntity } from "@/components/graph-hydration-provider";
import { demoProjects, demoTasks, demoUsers } from "@/features/demo-backend/demo-seed";

/**
 * Serialises the same demo seed as the client Zustand backend into graph entities
 * for SSR hydration (GraphHydrationProvider).
 */
export function buildInitialEntitiesFromSeed(): InitialEntity[] {
  const out: InitialEntity[] = [];
  for (const u of demoUsers) {
    out.push({ type: "User", id: u.id, data: { ...u } as Record<string, unknown> });
  }
  for (const p of demoProjects) {
    out.push({
      type: "Project",
      id: p.id,
      data: { ...p } as Record<string, unknown>,
    });
  }
  for (const t of demoTasks) {
    out.push({ type: "Task", id: t.id, data: { ...t } as Record<string, unknown> });
  }
  return out;
}
