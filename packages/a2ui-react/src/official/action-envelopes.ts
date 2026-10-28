/**
 * Retains the envelopes the runtime emitted, so `retryAction` can resend one
 * under the same `actionId`. The runtime, not the host, owns retry: a host that
 * resends on its own would mint a new id and defeat idempotency.
 *
 * Actions are user-driven, so the bound is small and fixed; the oldest envelope
 * is forgotten first.
 */

import type { PrometheusA2uiActionEnvelope } from "./forwarded-props.js";

export const MAX_RETAINED_ACTION_ENVELOPES = 100;

export class ActionEnvelopeStore {
  private readonly envelopes = new Map<string, PrometheusA2uiActionEnvelope>();

  retain(envelope: PrometheusA2uiActionEnvelope): void {
    this.envelopes.delete(envelope.actionId);
    this.envelopes.set(envelope.actionId, envelope);
    while (this.envelopes.size > MAX_RETAINED_ACTION_ENVELOPES) {
      const oldest = this.envelopes.keys().next();
      if (oldest.done) return;
      this.envelopes.delete(oldest.value);
    }
  }

  get(actionId: string): PrometheusA2uiActionEnvelope | undefined {
    return this.envelopes.get(actionId);
  }

  clear(): void {
    this.envelopes.clear();
  }
}
