/**
 * tests/bridge-contract.test.ts
 *
 * Frontend contract tests for the platform adapter boundary (design D-2/D-4):
 *   - deep links are parsed fail-closed (only prometheus-tasks://task/<id>);
 *   - the web fallback persists and restores across a simulated restart;
 *   - receipts record every bridge action for the platform panel.
 *
 * Native capability denial is proven by the Rust MockRuntime suite in
 * src-tauri/src/lib.rs; these tests pin the JS-side boundary semantics.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { BridgeDeniedError, isTauriHost, parseTaskDeepLink } from "../src/platform/bridge";
import { WebBridge } from "../src/platform/web-bridge";

// Minimal browser stubs for the web lane under node --test.
const localStorageData = new Map<string, string>();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (key: string) => localStorageData.get(key) ?? null,
    setItem: (key: string, value: string) => void localStorageData.set(key, value),
    removeItem: (key: string) => void localStorageData.delete(key),
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

test("deep links open only allowlisted task targets", () => {
  assert.equal(parseTaskDeepLink("prometheus-tasks://task/task-sync"), "task-sync");
  assert.equal(parseTaskDeepLink("prometheus-tasks://task/task-sync?source=push"), "task-sync");
  assert.equal(parseTaskDeepLink("https://evil.example/task/task-sync"), null);
  assert.equal(parseTaskDeepLink("prometheus-tasks://admin/task-sync"), null);
  assert.equal(parseTaskDeepLink("prometheus-tasks://task/"), null);
  assert.equal(parseTaskDeepLink("prometheus-tasks://task/task sync"), null);
  assert.equal(parseTaskDeepLink(""), null);
});

test("web fallback persists and restores across a simulated restart", async () => {
  const first = new WebBridge();
  await first.mirrorUpsert("Task", "task-offline", { title: "Offline restart proof" });
  await first.persistNow();

  // Simulated restart: a fresh bridge with an empty in-memory mirror.
  const second = new WebBridge();
  assert.deepEqual(second.mirrorSnapshot(), {});
  await second.restoreNow();
  assert.deepEqual(second.mirrorSnapshot(), {
    "Task:task-offline": { title: "Offline restart proof" },
  });
});

test("bridge receipts record every action for the platform panel", async () => {
  const bridge = new WebBridge();
  await bridge.lane();
  await bridge.mirrorUpsert("Task", "task-sync", { title: "Sync engine cutover" });
  const receipts = bridge.receipts();
  assert.deepEqual(
    receipts.map((receipt) => receipt.action),
    ["platformPing", "upsertEntity"],
  );
  assert.ok(receipts.every((receipt) => receipt.ok));
});

test("denial type identifies the denied action", () => {
  const error = new BridgeDeniedError("graph_platform_ping", new Error("not allowed to request command"));
  assert.equal(error.name, "BridgeDeniedError");
  assert.match(error.message, /graph_platform_ping/);
  assert.match(error.message, /not allowed/);
});

test("host detection fails closed outside a Tauri webview", () => {
  assert.equal(isTauriHost(), false);
});
