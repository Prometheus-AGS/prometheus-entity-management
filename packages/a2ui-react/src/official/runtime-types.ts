/**
 * Public option, error and message types of the Prometheus A2UI runtime,
 * separate from the runtime class so that file stays focused. Everything here
 * is re-exported from `runtime.ts`, so import paths do not change.
 */

import type {
  A2uiClientAction,
  Catalog,
  ComponentApi,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import type { A2uiActionDecision, A2uiActionPolicy } from "../policy/action-policy.js";
import type { PrometheusA2uiDataConflict } from "./data-reconcile.js";
import type {
  PrometheusA2uiActionEnvelope,
  PrometheusA2uiResyncRequest,
} from "./forwarded-props.js";
import type { PrometheusA2uiLimits, PrometheusA2uiProducerFault } from "./limits.js";
import type { PrometheusA2uiComponentImplementation } from "./types.js";
import type {
  PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  PrometheusA2uiV1FunctionCall,
} from "./v1-compat.js";

export type PrometheusA2uiErrorCode =
  | "invalid-message"
  | "unsupported-protocol-version"
  | "component-not-allowed"
  | "limit-exceeded"
  | "surface-not-found"
  | "runtime-disposed";

export class PrometheusA2uiError extends Error {
  readonly code: PrometheusA2uiErrorCode;
  readonly cause?: unknown;

  constructor(code: PrometheusA2uiErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "PrometheusA2uiError";
    this.code = code;
    this.cause = cause;
  }
}

export type PrometheusA2uiMessageInput =
  | readonly unknown[]
  | { readonly messages: readonly unknown[] };

export interface CreatePrometheusA2uiRuntimeOptions<
  Implementation extends ComponentApi = PrometheusA2uiComponentImplementation,
> {
  /** Explicit catalogs advertised to and accepted from agents. */
  catalogs?: readonly Catalog<Implementation>[];
  /** Defaults to a deny-all policy; applications must install authority. */
  actionPolicy?: A2uiActionPolicy;
  /** Receives the auditable outcome of every official client action. */
  onActionDecision?: (decision: A2uiActionDecision) => void | Promise<void>;
  /** Receives A2UI v1.0 renderer-to-agent action/function/error messages. */
  onRendererMessage?: (message: PrometheusA2uiRendererMessage) => void | Promise<void>;
  /** Application-owned implementation for v1.0 agent-initiated function calls. */
  onFunctionCall?: (call: PrometheusA2uiV1FunctionCall) => unknown | Promise<unknown>;
  /**
   * Resource limits for agent-generated UI. Unspecified limits use
   * `DEFAULT_PROMETHEUS_A2UI_LIMITS`; enforcement is on by default.
   */
  limits?: Partial<PrometheusA2uiLimits>;
  /**
   * Receives each producer fault (an input the runtime refused and left every
   * surface unchanged for). Called synchronously before the rejection is
   * thrown; it should not throw.
   */
  onProducerFault?: (fault: PrometheusA2uiProducerFault) => void;
  /**
   * Receives each data leaf the producer changed while the user had also
   * changed it. The producer's value was written; this is the notice, so the
   * host can warn the user. It should not throw.
   */
  onConflict?: (conflict: PrometheusA2uiDataConflict) => void;
  /**
   * Receives an executed user action as an envelope ready to send to the agent:
   * `envelope.forwardedProps` goes into the next AG-UI run input. Called only
   * for actions the action policy executed; a denied action never leaves the
   * runtime. Use `runtime.retryAction(actionId)` to resend one under the same
   * id.
   */
  onActionEnvelope?: (envelope: PrometheusA2uiActionEnvelope) => void | Promise<void>;
  /**
   * Called when the runtime cannot continue a surface without help: a delta
   * built on a version that never arrived, a full delta buffer, or a batch the
   * runtime refused. Send `request.held` upstream (see
   * `buildA2uiForwardedProps`) so the agent resends what is missing. It should
   * not throw.
   */
  onResyncNeeded?: (request: PrometheusA2uiResyncRequest) => void;
}

export type PrometheusA2uiRendererMessage =
  | {
      version: typeof PROMETHEUS_A2UI_RC_PROTOCOL_VERSION;
      action: A2uiClientAction & { wantResponse?: boolean; actionId?: string };
    }
  | {
      version: typeof PROMETHEUS_A2UI_RC_PROTOCOL_VERSION;
      functionResponse: { functionCallId: string; call: string; value: unknown };
    }
  | {
      version: typeof PROMETHEUS_A2UI_RC_PROTOCOL_VERSION;
      error: {
        code: string;
        message: string;
        functionCallId: string;
      };
    };
