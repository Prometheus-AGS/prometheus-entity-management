import {
  createA2uiActionPolicy,
  createPrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
import { z } from "zod";
import { useLabStore } from "./lab-store";

/** An action the lab executes. */
export const LAB_ACTION_PING = "lab.ping";
/** An action the lab's policy always denies: the negative control for envelopes. */
export const LAB_ACTION_FORBIDDEN = "lab.forbidden";

const emptyContext = z.object({}).passthrough();

const labActionPolicy = createA2uiActionPolicy({
  rules: [
    {
      name: LAB_ACTION_PING,
      contextSchema: emptyContext,
      authorize: () => true,
      execute: () => ({ acknowledged: true }),
    },
    {
      name: LAB_ACTION_FORBIDDEN,
      contextSchema: emptyContext,
      authorize: () => ({ allowed: false, reason: "The lab denies this action by design." }),
      execute: () => ({ acknowledged: false }),
    },
  ],
});

/**
 * The runtime the lab renders. Its callbacks hand producer-facing events to the
 * store, which owns all I/O; the runtime itself never touches the network.
 */
export const labRuntime = createPrometheusA2uiRuntime({
  actionPolicy: labActionPolicy,
  onProducerFault: (fault) => useLabStore.getState().recordFault(fault),
  onConflict: (conflict) => useLabStore.getState().recordConflict(conflict),
  onResyncNeeded: (request) => useLabStore.getState().sendResync(request),
  onActionEnvelope: (envelope) => useLabStore.getState().sendEnvelope(envelope),
});
