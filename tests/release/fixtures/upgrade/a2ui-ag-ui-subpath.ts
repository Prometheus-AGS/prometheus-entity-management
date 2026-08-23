/**
 * Upgrade fixture: alpha-to-stable — AG-UI compatibility subpath.
 *
 * Proves the "after" state of the migration documented in
 * site/docs/migration/alpha-to-stable.mdx ("A2UI package boundary"): the 3.0
 * package root is reserved for official A2UI v0.9.1 rendering, and the pre-3.0
 * AG-UI chat/state APIs are imported from the explicit `./ag-ui` subpath.
 * Shape mirrors the certified reference in
 * prometheus-entity-skills/_shared/references/a2ui-protocol-bridge.md.
 */
import {
  EntityApproval,
  EntityChat,
  useChatSession,
} from "@prometheus-ags/a2ui-react/ag-ui";

export { EntityApproval, EntityChat, useChatSession };
