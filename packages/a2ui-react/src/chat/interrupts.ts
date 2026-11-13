/**
 * The AG-UI 1.0 interrupt wire mapping, in one module because the AG-UI docs
 * still mark the run-outcome fields Draft. Everything else in the chat stack
 * works with the types below, so a wire change touches only this file.
 *
 * Wire (from `@ag-ui/core` 1.0.4):
 * - `RUN_FINISHED.outcome = { type: "interrupt", interrupts: Interrupt[] }`,
 *   `Interrupt { id, reason, message?, toolCallId?, responseSchema?, expiresAt?, metadata? }`;
 * - the next run's input carries `resume: ResumeEntry[]`,
 *   `ResumeEntry { interruptId, status: "resolved" | "cancelled", payload?, metadata? }`.
 */
import type { AgUiEvent } from "../types.js";

/** A run paused for a human decision. */
export interface ChatInterrupt {
  id: string;
  reason: string;
  message?: string;
  toolCallId?: string;
  responseSchema?: Record<string, unknown>;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

/** The answer to one interrupt, sent in the next run's `resume[]`. */
export interface ChatResumeEntry {
  interruptId: string;
  status: "resolved" | "cancelled";
  payload?: unknown;
  metadata?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The interrupts a `RUN_FINISHED` event pauses for, or `undefined` when its
 * outcome is not an interrupt. If any entry is unreadable (no string `id` and
 * `reason`) the whole pause is unreadable and the result is empty, so the
 * caller fails closed instead of resuming after deciding only some of them.
 */
export function readInterruptOutcome(event: AgUiEvent): ChatInterrupt[] | undefined {
  if (event.type !== "RUN_FINISHED" || !isRecord(event.outcome)) return undefined;
  const outcome = event.outcome;
  if (outcome.type !== "interrupt" || !Array.isArray(outcome.interrupts)) return undefined;
  const interrupts: ChatInterrupt[] = [];
  for (const raw of outcome.interrupts) {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.reason !== "string") return [];
    interrupts.push({
      id: raw.id,
      reason: raw.reason,
      ...(typeof raw.message === "string" ? { message: raw.message } : {}),
      ...(typeof raw.toolCallId === "string" ? { toolCallId: raw.toolCallId } : {}),
      ...(isRecord(raw.responseSchema) ? { responseSchema: raw.responseSchema } : {}),
      ...(typeof raw.expiresAt === "string" ? { expiresAt: raw.expiresAt } : {}),
      ...(isRecord(raw.metadata) ? { metadata: raw.metadata } : {}),
    });
  }
  return interrupts;
}

/** The `resume[]` value for the next run's input, in wire shape. */
export function toResumeInput(entries: readonly ChatResumeEntry[]): Array<Record<string, unknown>> {
  return entries.map((entry) => ({
    interruptId: entry.interruptId,
    status: entry.status,
    ...(entry.payload === undefined ? {} : { payload: entry.payload }),
    ...(entry.metadata === undefined ? {} : { metadata: entry.metadata }),
  }));
}
