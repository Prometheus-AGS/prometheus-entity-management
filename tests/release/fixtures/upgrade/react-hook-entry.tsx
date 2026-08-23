/**
 * Upgrade fixture: v2-to-v3 — React hook entry point.
 *
 * Proves the "after" state of the migration documented in
 * site/docs/migration/v2-to-v3.mdx ("React hook import"): React consumers keep
 * a callable `useGraphStore(selector)` hook, imported from the React package
 * (`@prometheus-ags/prometheus-entity-management`), which subscribes to the
 * same vanilla singleton that core exposes imperatively.
 */
import {
  graphStore,
  useGraphStore,
} from "@prometheus-ags/prometheus-entity-management";

export function ProjectName(props: { id: string }) {
  const project = useGraphStore((state) =>
    state.readEntity<{ name: string }>("Project", props.id),
  );
  return <span>{project?.name ?? "Unknown project"}</span>;
}

// The hook and the imperative singleton share one graph.
graphStore.getState().upsertEntity("Project", "p1", { name: "Prometheus" });
