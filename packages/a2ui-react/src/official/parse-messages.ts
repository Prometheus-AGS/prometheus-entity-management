import {
  A2uiMessageListSchema,
  A2uiMessageListWrapperSchema,
} from "@a2ui/web_core/v0_9";
import type { A2uiMessage } from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import { PROMETHEUS_A2UI_PROTOCOL_VERSION } from "./catalog-core.js";
import { PrometheusA2uiError, type PrometheusA2uiMessageInput } from "./runtime-types.js";

/** Validate one official v0.9.1 message list against the official schema. */
export function parseMessages(input: PrometheusA2uiMessageInput): A2uiMessage[] {
  const parsed = Array.isArray(input)
    ? A2uiMessageListSchema.safeParse(input)
    : A2uiMessageListWrapperSchema.safeParse(input);

  if (!parsed.success) {
    throw new PrometheusA2uiError(
      "invalid-message",
      "Input does not match the official A2UI v0.9 message schema.",
      parsed.error,
    );
  }

  const messages = Array.isArray(parsed.data) ? parsed.data : parsed.data.messages;
  for (const message of messages) {
    if (message.version !== PROMETHEUS_A2UI_PROTOCOL_VERSION) {
      throw new PrometheusA2uiError(
        "unsupported-protocol-version",
        `Expected ${PROMETHEUS_A2UI_PROTOCOL_VERSION}; received ${message.version}.`,
      );
    }
  }
  return messages;
}
