/**
 * a2ui-react.test.tsx — Integration tests for the a2ui-react package.
 *
 * Tests cover:
 * 1. useChatSession — message append, STATE_SNAPSHOT projection into graph,
 *    tool call dispatch to EntityToolProvider
 * 2. useEntityDiff — baseline capture, field diff computation
 * 3. EntityStream — token streaming, STATE_SNAPSHOT graph projection
 * 4. EntityApproval — autoCapture, approve / reject (graph restore)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import React from "react";

import {
  useGraphStore,
  configureTimeTravel,
} from "@prometheus-ags/entity-graph-core";

import {
  useChatSession,
  useEntityDiff,
  EntityStream,
  EntityApproval,
} from "./index.js";
import type {
  StreamEvent,
  EntityToolProvider,
  ToolCallRequest,
  ToolCallResult,
} from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function* makeStream(events: StreamEvent[]): AsyncIterable<StreamEvent> {
  for (const e of events) yield e;
}

function resetAll() {
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
  configureTimeTravel({ capacity: 1 });
  configureTimeTravel({ capacity: 50 });
}

beforeEach(() => {
  resetAll();
});

afterEach(() => {
  cleanup();
});

// ── 1. useChatSession ────────────────────────────────────────────────────────

describe("useChatSession", () => {
  it("appends a user message and assistant tokens to session.messages", async () => {
    const events: StreamEvent[] = [
      { type: "MESSAGE_START", messageId: "msg1" },
      { type: "MESSAGE_DELTA", messageId: "msg1", delta: "Hello" },
      { type: "MESSAGE_DELTA", messageId: "msg1", delta: " world" },
      { type: "MESSAGE_END", messageId: "msg1" },
      { type: "DONE" },
    ];

    const { result } = renderHook(() =>
      useChatSession({ streamFactory: () => makeStream(events) })
    );

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    const msgs = result.current.session.messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0]).toMatchObject({ role: "user", content: "Hi" });
    expect(msgs[1]).toMatchObject({
      role: "assistant",
      content: "Hello world",
      streaming: false,
    });
    expect(result.current.session.isLoading).toBe(false);
  });

  it("projects STATE_SNAPSHOT into the entity graph", async () => {
    const snapshot = { order: { id: "ord_1", status: "pending", amount: 100 } };
    const events: StreamEvent[] = [
      { type: "STATE_SNAPSHOT", snapshot },
      { type: "DONE" },
    ];

    const { result } = renderHook(() =>
      useChatSession({
        streamFactory: () => makeStream(events),
        mappings: [
          {
            entityType: "Order",
            pointer: "/order",
            kind: "single",
            idField: "id",
            write: "replace",
          },
        ],
      })
    );

    await act(async () => {
      await result.current.sendMessage("What is the status?");
    });

    const graphState = useGraphStore.getState();
    expect(graphState.entities["Order"]?.["ord_1"]).toMatchObject({
      status: "pending",
      amount: 100,
    });
  });

  it("dispatches tool calls to the EntityToolProvider", async () => {
    const executeTool = vi.fn<[ToolCallRequest], Promise<ToolCallResult>>()
      .mockResolvedValue({ toolCallId: "tc1", result: { price: 42 } });

    const provider: EntityToolProvider = {
      getTools: () => [],
      executeTool,
    };

    const events: StreamEvent[] = [
      { type: "MESSAGE_START", messageId: "msg2" },
      { type: "TOOL_CALL_START", messageId: "msg2", toolCallId: "tc1", toolName: "getPrice" },
      { type: "TOOL_CALL_DELTA", toolCallId: "tc1", toolArgsDelta: '{"sku":"ABC"}' },
      { type: "TOOL_CALL_END", toolCallId: "tc1" },
      { type: "DONE" },
    ];

    const { result } = renderHook(() =>
      useChatSession({
        streamFactory: () => makeStream(events),
        toolProvider: provider,
      })
    );

    await act(async () => {
      await result.current.sendMessage("What is the price?");
    });

    expect(executeTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "getPrice", toolCallId: "tc1" })
    );

    const toolMsg = result.current.session.messages.find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(toolMsg?.content).toContain("42");
  });

  it("sets error on stream ERROR event", async () => {
    const events: StreamEvent[] = [
      { type: "ERROR", error: "Agent unavailable" },
    ];

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useChatSession({
        streamFactory: () => makeStream(events),
        onError,
      })
    );

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.session.error).toBe("Agent unavailable");
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── 2. useEntityDiff ─────────────────────────────────────────────────────────

describe("useEntityDiff", () => {
  it("returns null diff before baseline is captured", () => {
    const { result } = renderHook(() =>
      useEntityDiff({ entityType: "Product", entityId: "p1" })
    );
    expect(result.current.diff).toBeNull();
    expect(result.current.baselineSeq).toBeNull();
  });

  it("detects added and replaced fields after entity is mutated", () => {
    useGraphStore.getState().upsertEntity("Product", "p1", { name: "Widget", price: 10 });

    const { result } = renderHook(() =>
      useEntityDiff({ entityType: "Product", entityId: "p1", includeUnchanged: false })
    );

    act(() => {
      result.current.captureBaseline();
    });

    expect(result.current.baselineSeq).not.toBeNull();

    act(() => {
      useGraphStore.getState().upsertEntity("Product", "p1", { price: 20, sku: "WGT-001" });
    });

    act(() => {
      result.current.recompute();
    });

    const { diff } = result.current;
    expect(diff).not.toBeNull();

    const fieldNames = diff!.fields.map((f) => f.field);
    expect(fieldNames).toContain("price");
    expect(fieldNames).toContain("sku");

    const priceField = diff!.fields.find((f) => f.field === "price");
    expect(priceField?.op).toBe("replace");
    expect(priceField?.before).toBe(10);
    expect(priceField?.after).toBe(20);

    const skuField = diff!.fields.find((f) => f.field === "sku");
    expect(skuField?.op).toBe("add");
  });

  it("restoreBaseline returns boolean without throwing", () => {
    useGraphStore.getState().upsertEntity("Widget", "w1", { status: "active" });

    const { result } = renderHook(() =>
      useEntityDiff({ entityType: "Widget", entityId: "w1" })
    );

    act(() => { result.current.captureBaseline(); });
    const ok = result.current.restoreBaseline();
    expect(typeof ok).toBe("boolean");
  });
});

// ── 3. EntityStream ──────────────────────────────────────────────────────────

describe("EntityStream", () => {
  it("renders streamed content progressively", async () => {
    const events: StreamEvent[] = [
      { type: "MESSAGE_DELTA", delta: "Streamed " },
      { type: "MESSAGE_DELTA", delta: "content" },
      { type: "DONE" },
    ];

    async function* streamGen() {
      for (const e of events) yield e;
    }

    const onComplete = vi.fn<[string], void>();

    const { container } = render(
      <EntityStream stream={streamGen()} onComplete={onComplete} />
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Streamed content");
    });

    expect(onComplete).toHaveBeenCalledWith("Streamed content");
  });

  it("projects STATE_SNAPSHOT from stream into the entity graph", async () => {
    const snapshot = { invoice: { id: "inv_1", total: 500 } };
    const events: StreamEvent[] = [
      { type: "STATE_SNAPSHOT", snapshot },
      { type: "DONE" },
    ];

    async function* streamGen() {
      for (const e of events) yield e;
    }

    render(
      <EntityStream
        stream={streamGen()}
        mappings={[
          { entityType: "Invoice", pointer: "/invoice", kind: "single", idField: "id" },
        ]}
      />
    );

    await waitFor(() => {
      const inv = useGraphStore.getState().entities["Invoice"]?.["inv_1"];
      expect(inv).toMatchObject({ total: 500 });
    });
  });

  it("renders placeholder when stream is null", () => {
    render(<EntityStream stream={null} placeholder={<span>Waiting…</span>} />);
    expect(screen.getByText("Waiting…")).toBeTruthy();
  });
});

// ── 4. EntityApproval ────────────────────────────────────────────────────────

describe("EntityApproval", () => {
  it("renders approve and reject buttons", () => {
    useGraphStore.getState().upsertEntity("Task", "t1", { title: "Draft" });

    const { container } = render(
      <EntityApproval
        entityType="Task"
        entityId="t1"
        autoCapture
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(within(container as HTMLElement).getByText("Approve")).toBeTruthy();
    expect(within(container as HTMLElement).getByText("Reject & Restore")).toBeTruthy();
  });

  it("calls onApprove after entity mutation and recompute", async () => {
    useGraphStore.getState().upsertEntity("Task", "t2", { title: "Old title", done: false });

    const onApprove = vi.fn();

    const { container } = render(
      <EntityApproval
        entityType="Task"
        entityId="t2"
        autoCapture
        onApprove={onApprove}
        onReject={vi.fn()}
      />
    );

    // Simulate agent mutating the entity
    act(() => {
      useGraphStore.getState().upsertEntity("Task", "t2", { title: "New title" });
    });

    // Trigger recompute via the Refresh diff button
    fireEvent.click(within(container as HTMLElement).getByText("Refresh diff"));

    // Wait for the Approve button to become enabled (diff detected).
    // Use native DOM disabled check instead of jest-dom matcher.
    await waitFor(() => {
      const btn = within(container as HTMLElement).getByText("Approve");
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(within(container as HTMLElement).getByText("Approve"));
    expect(onApprove).toHaveBeenCalled();
  });
});
