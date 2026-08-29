import { EntityGraphInspectorShell } from "./inspector-shell";
import type { EntityGraphInspectorStateAdapter } from "./state";

/** Heavy lazy boundary shared by embedded and extension hosts. */
export default function EntityGraphDevtoolsInspectorEntry({
  stateAdapter,
}: {
  stateAdapter?: EntityGraphInspectorStateAdapter;
}) {
  return <EntityGraphInspectorShell stateAdapter={stateAdapter} />;
}
