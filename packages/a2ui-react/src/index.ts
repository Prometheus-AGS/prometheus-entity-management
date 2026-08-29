/**
 * A2UI v1.0-RC compatibility over the official v0.9.1 React renderer and
 * Prometheus entity-graph policy bridge.
 *
 * AG-UI chat/state compatibility APIs intentionally live at
 * `@prometheus-ags/a2ui-react/ag-ui`; AG-UI transport and A2UI rendering are
 * separate protocol layers.
 */

export {
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  DEFAULT_PROMETHEUS_A2UI_COMPONENTS,
  DEFAULT_PROMETHEUS_A2UI_FUNCTIONS,
  createPrometheusA2uiCatalog,
} from "./official/catalog.js";
export type {
  PrometheusA2uiCatalogOptions,
  PrometheusA2uiComponentName,
  PrometheusA2uiFunctionName,
} from "./official/catalog.js";

export {
  PrometheusA2uiError,
  PrometheusA2uiRuntime,
  createPrometheusA2uiRuntime,
} from "./official/runtime.js";
export type { PrometheusA2uiComponentImplementation } from "./official/types.js";
export type {
  CreatePrometheusA2uiRuntimeOptions,
  PrometheusA2uiErrorCode,
  PrometheusA2uiMessageInput,
  PrometheusA2uiRendererMessage,
} from "./official/runtime.js";
export { PROMETHEUS_A2UI_RC_PROTOCOL_VERSION } from "./official/v1-compat.js";
export type {
  PrometheusA2uiV1ActionMetadata,
  PrometheusA2uiV1ActionResponse,
  PrometheusA2uiV1FunctionCall,
  PrometheusA2uiV1Message,
} from "./official/v1-compat.js";

export {
  createA2uiActionPolicy,
  createDenyAllA2uiActionPolicy,
} from "./policy/action-policy.js";
export type {
  A2uiActionDecision,
  A2uiActionDeniedCode,
  A2uiActionPolicy,
  A2uiActionPolicyOptions,
  A2uiActionRule,
  A2uiApprovalRequest,
  A2uiAuthorizationDecision,
} from "./policy/action-policy.js";

export {
  ENTITY_GRAPH_A2UI_ACTIONS,
  createEntityGraphA2uiActionPolicy,
} from "./policy/entity-graph-policy.js";
export type {
  CreateEntityGraphA2uiActionPolicyOptions,
  EntityGraphA2uiActionName,
  EntityGraphA2uiAuthorizationContext,
  EntityGraphA2uiEntityPolicy,
} from "./policy/entity-graph-policy.js";

export {
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  PrometheusA2uiSurfaces,
  usePrometheusA2ui,
  usePrometheusA2uiRuntime,
  usePrometheusA2uiSurfaces,
} from "./react/a2ui-provider.js";
export type {
  PrometheusA2uiProviderProps,
  PrometheusA2uiSurfaceProps,
  PrometheusA2uiSurfacesProps,
  UsePrometheusA2uiResult,
} from "./react/a2ui-provider.js";

// Selected official types are re-exported for consumers without claiming
// ownership of the A2UI protocol/runtime.
export type {
  A2uiClientAction,
  A2uiClientCapabilities,
  A2uiClientDataModel,
  A2uiMessage,
  Catalog,
  SurfaceModel,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
