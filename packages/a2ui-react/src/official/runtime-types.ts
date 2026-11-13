/**
 * Public option, error and message types of the Prometheus A2UI runtime,
 * separate from the runtime class so that file stays focused. Everything here
 * is re-exported from `runtime.ts`, so import paths do not change.
 */

import type {
  A2uiClientAction,
  Catalog,
  ComponentApi,
  MessageProcessor,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import type { A2uiActionDecision, A2uiActionPolicy } from "../policy/action-policy.js";
import type { PrometheusA2uiDataConflict } from "./data-reconcile.js";
import type {
  PrometheusA2uiActionEnvelope,
  PrometheusA2uiResyncRequest,
} from "./forwarded-props.js";
import type { PrometheusA2uiLimits, PrometheusA2uiProducerFault } from "./limits.js";
import type { PrometheusA2uiComponentImplementation } from "./types.js";
import type { RendererToAgentMessage } from "@a2ui/web_core/v1_0" with { "resolution-mode": "import" };
import { A2uiError as OfficialA2uiError } from "@a2ui/web_core/v0_9";

export type PrometheusA2uiErrorCode =
  | "invalid-message"
  | "unsupported-protocol-version"
  | "component-not-allowed"
  | "limit-exceeded"
  | "surface-not-found"
  | "runtime-disposed"
  | "protocol-error";

export class PrometheusA2uiError extends Error {
  readonly code: PrometheusA2uiErrorCode;
  readonly cause?: unknown;
  /**
   * The A2UI error code the official processor reported (for example
   * `VALIDATION_ERROR`, `CATALOG_ERROR`, `INVALID_FUNCTION_CALL`,
   * `EXPRESSION_ERROR`), when `code` is `protocol-error`.
   */
  readonly protocolCode?: string;

  constructor(code: PrometheusA2uiErrorCode, message: string, cause?: unknown, protocolCode?: string) {
    super(message);
    this.name = "PrometheusA2uiError";
    this.code = code;
    this.cause = cause;
    if (protocolCode !== undefined) this.protocolCode = protocolCode;
  }
}

/**
 * Wrap an error the official A2UI processor threw (an `A2ui*Error` carrying a
 * string `code`) as a `protocol-error` that keeps the A2UI code. Anything else
 * is returned unchanged.
 */
export function toPrometheusA2uiError(cause: unknown): unknown {
  if (cause instanceof PrometheusA2uiError) return cause;
  // instanceof first: official errors take `name` from constructor.name, which a minifier mangles.
  if (
    cause instanceof Error &&
    (cause instanceof OfficialA2uiError || cause.name.startsWith("A2ui")) &&
    typeof (cause as { code?: unknown }).code === "string"
  ) {
    return new PrometheusA2uiError(
      "protocol-error",
      cause.message,
      cause,
      (cause as unknown as { code: string }).code,
    );
  }
  return cause;
}

/** Renderer capabilities for every protocol version the runtime's catalogs declare. */
export type PrometheusA2uiRendererCapabilities = ReturnType<MessageProcessor["getRendererCapabilities"]>;

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
  /**
   * Receives A2UI 1.0 renderer-to-agent messages for 1.0 surfaces: `action`
   * (an executed action), `callAgentFunction`, `rendererFunctionResponse`
   * (the answer to an agent's `callRendererFunction`) and `error` (a refused
   * 1.0 batch or function call, with its A2UI error code). Send them to the
   * agent over the transport in use (for example A2A).
   */
  onRendererMessage?: (message: PrometheusA2uiRendererMessage) => void | Promise<void>;
  /**
   * Accept A2UI 1.0 **release-candidate** envelopes (`version: "v1.0"`) by
   * translating them to A2UI 1.0 (see `rc-shim.ts`). Off by default; kept for
   * one minor line after 5.0.0 so producers can migrate.
   */
  acceptReleaseCandidateInput?: boolean;
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

/** An A2UI 1.0 renderer-to-agent message, as the official 1.0 schema defines it. */
export type PrometheusA2uiRendererMessage = RendererToAgentMessage;

/** A function the renderer asks the agent to run (`callAgentFunction`). */
export interface PrometheusA2uiAgentFunctionCall {
  /** The agent function's name. */
  call: string;
  args?: Record<string, unknown>;
  catalogId?: string;
}

export interface PrometheusA2uiAgentFunctionOptions {
  /**
   * Write the agent's answer into the surface's data model at this JSON
   * Pointer, through `processMessages`, so the resource limits apply. A failed
   * write is reported as a producer fault and does not reject the call.
   */
  writeTo?: string;
  /** Milliseconds before the call is rejected; the official default is 30000. */
  timeoutMs?: number;
}
