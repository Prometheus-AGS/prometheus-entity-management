/**
 * Upgrade fixture: v2-to-v3 — sync status outside React.
 *
 * Proves the "after" state of the migration documented in
 * site/docs/migration/v2-to-v3.mdx ("Sync status readers"): non-React hosts
 * (Node services, workers, Tauri commands) read persistence/runtime state
 * through the core-owned imperative reader instead of importing a hook.
 */
import {
  getGraphSyncStatus,
  graphSyncStatusStore,
} from "@prometheus-ags/entity-graph-core";

// After: imperative reader for non-React code.
const status = getGraphSyncStatus();

// After: the underlying vanilla store can be subscribed directly.
const unsubscribe = graphSyncStatusStore.subscribe(() => {
  getGraphSyncStatus();
});

unsubscribe();
export { status };
