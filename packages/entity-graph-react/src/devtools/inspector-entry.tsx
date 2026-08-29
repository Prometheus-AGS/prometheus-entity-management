import { EntityGraphInspectorShell } from "./inspector-shell";

/** Heavy lazy boundary shared by embedded and extension hosts. */
export default function EntityGraphDevtoolsInspectorEntry() {
  return <EntityGraphInspectorShell />;
}
