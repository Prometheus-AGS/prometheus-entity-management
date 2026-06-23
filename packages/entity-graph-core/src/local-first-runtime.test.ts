import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { replayActionWithRetry } from "./local-first-runtime";
import * as graphActions from "./graph-actions";

const action = { id: "a1", key: "demo", input: {}, enqueuedAt: "now" };

describe("replayActionWithRetry", () => {
  let replaySpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    replaySpy = vi.spyOn(graphActions, "replayRegisteredGraphAction");
  });
  afterEach(() => {
    replaySpy.mockRestore();
  });

  it("succeeds on the first attempt", async () => {
    replaySpy.mockResolvedValueOnce(undefined as never);
    const result = await replayActionWithRetry(action, {
      maxAttempts: 3,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 2,
      jitter: "none",
    });
    expect(result.ok).toBe(true);
    expect(replaySpy).toHaveBeenCalledTimes(1);
  });

  it("retries until success", async () => {
    replaySpy
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom again"))
      .mockResolvedValueOnce(undefined as never);
    const result = await replayActionWithRetry(action, {
      maxAttempts: 5,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 2,
      jitter: "none",
    });
    expect(result.ok).toBe(true);
    expect(replaySpy).toHaveBeenCalledTimes(3);
  });

  it("escalates to poison after maxAttempts", async () => {
    replaySpy.mockRejectedValue(new Error("permanent"));
    const poison = vi.fn();
    const result = await replayActionWithRetry(action, {
      maxAttempts: 2,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 2,
      jitter: "none",
      poisonHandler: poison,
    });
    expect(result.ok).toBe(false);
    expect((result as { poisoned: boolean }).poisoned).toBe(true);
    expect(replaySpy).toHaveBeenCalledTimes(2);
    expect(poison).toHaveBeenCalledTimes(1);
    expect(poison.mock.calls[0]?.[0]).toBe(action);
  });

  it("swallows poison handler errors", async () => {
    replaySpy.mockRejectedValue(new Error("permanent"));
    const result = await replayActionWithRetry(action, {
      maxAttempts: 1,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 2,
      jitter: "none",
      poisonHandler: () => {
        throw new Error("handler broke");
      },
    });
    expect(result.ok).toBe(false);
  });
});
