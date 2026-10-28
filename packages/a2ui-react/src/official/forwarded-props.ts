import type { A2uiClientAction } from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };

/**
 * What the runtime tells the host so it can ask the agent for what is missing.
 *
 * AG-UI has no resync event, so the request travels where actions already do:
 * in `forwardedProps` of the next run input. The shapes here are the single
 * description of that wire object; `buildA2uiForwardedProps` is its only builder.
 */

export interface PrometheusA2uiHeldVersion {
  readonly epoch: number;
  readonly version: number;
}

/** The version the runtime holds for each surface that has versioned state. */
export type PrometheusA2uiHeldVersions = Readonly<Record<string, PrometheusA2uiHeldVersion>>;

export type PrometheusA2uiResyncReason =
  /** A delta built on a version ahead of the one held, and the gap did not close in time. */
  | "gap"
  /** A delta arrived for a surface the runtime holds no versioned state for. */
  | "missing-surface"
  /** The delta buffer was full, so the oldest waiting delta was dropped. */
  | "buffer-overflow"
  /** The runtime refused a batch the producer had accepted, so it is stuck at its last version. */
  | "refused"
  /** A server rejected an action as stale and returned nothing to catch the surface up with. */
  | "stale-action";

export interface PrometheusA2uiResyncSurface {
  readonly surfaceId: string;
  /** What the runtime holds for the surface; absent when it holds none. */
  readonly held?: PrometheusA2uiHeldVersion;
  /** The version the missing delta builds on, or the version the refused batch carried. */
  readonly expected?: PrometheusA2uiHeldVersion;
}

/** Delivered to `onResyncNeeded`. */
export interface PrometheusA2uiResyncRequest {
  readonly reason: PrometheusA2uiResyncReason;
  readonly messageId: string;
  readonly surfaces: readonly PrometheusA2uiResyncSurface[];
  /** Everything the runtime holds now, so the host can send it upstream as-is. */
  readonly held: PrometheusA2uiHeldVersions;
}

/** The user-action part of `forwardedProps`: the raw action plus what orders and de-duplicates it. */
export interface PrometheusA2uiActionProps {
  /** The A2UI action exactly as the renderer produced it; never modified. */
  readonly userAction: PrometheusA2uiUserAction;
  /** Globally unique idempotency key (UUIDv7), minted once per interaction and reused on retry. */
  readonly actionId: string;
  /** The version the surface held when the action fired; absent for a surface with no versioned state. */
  readonly heldVersion?: PrometheusA2uiHeldVersion;
  /** The client data model, present only when the surface sets `sendDataModel`. */
  readonly dataModel?: unknown;
}

/** The A2UI keys the runtime adds to `forwardedProps` of an AG-UI run input. */
export interface PrometheusA2uiForwardedProps {
  /** Reports what the runtime holds, so the agent resends only what is missing. */
  readonly a2uiResync?: {
    readonly held: PrometheusA2uiHeldVersions;
    readonly reason?: PrometheusA2uiResyncReason;
  };
  /** One executed user action. */
  readonly a2uiAction?: PrometheusA2uiActionProps;
}

export interface BuildA2uiForwardedPropsInput {
  readonly resync?: {
    readonly held: PrometheusA2uiHeldVersions;
    readonly reason?: PrometheusA2uiResyncReason;
  };
  readonly action?: PrometheusA2uiActionProps;
}

/**
 * The single builder of the A2UI `forwardedProps` object. Spread its result
 * into the run input's `forwardedProps`; an input with nothing to say yields an
 * empty object, so it is always safe to spread.
 */
export function buildA2uiForwardedProps(
  input: BuildA2uiForwardedPropsInput,
): PrometheusA2uiForwardedProps {
  const { resync, action } = input;
  return {
    ...(resync
      ? {
          a2uiResync: {
            held: resync.held,
            ...(resync.reason ? { reason: resync.reason } : {}),
          },
        }
      : {}),
    ...(action
      ? {
          a2uiAction: {
            userAction: action.userAction,
            actionId: action.actionId,
            ...(action.heldVersion ? { heldVersion: action.heldVersion } : {}),
            ...(action.dataModel !== undefined ? { dataModel: action.dataModel } : {}),
          },
        }
      : {}),
  };
}

/**
 * An executed user action, ready to send to the agent. `forwardedProps` goes
 * into the next AG-UI run input; `actionId` is the idempotency key, kept
 * across retries.
 */
export interface PrometheusA2uiActionEnvelope {
  readonly actionId: string;
  readonly surfaceId: string;
  readonly forwardedProps: PrometheusA2uiForwardedProps;
}

/** The raw A2UI action, unmodified. */
export type PrometheusA2uiUserAction = A2uiClientAction;
