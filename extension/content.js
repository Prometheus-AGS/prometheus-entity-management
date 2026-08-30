/**
 * content.js — Chrome MV3 Content Script (ISOLATED world)
 *
 * Listens for window.postMessage events from the inspected page
 * (emitted by EntityExplorerProvider when enableWindowBridge={true})
 * and forwards them to the background service worker via chrome.runtime.sendMessage.
 */

const SOURCE = "prometheus.entity-graph.devtools.extension";
const BRIDGE_VERSION = 1;
const MAX_REQUEST_BYTES = 512 * 1024;
const epoch = crypto.randomUUID();
const pending = new Map();

function pageMessage(message) {
  window.postMessage({ source: SOURCE, direction: "extension-to-page", bridgeVersion: BRIDGE_VERSION, ...message, epoch }, window.location.origin);
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const message = event.data;
  if (!message || message.source !== SOURCE || message.direction !== "page-to-extension" || message.bridgeVersion !== BRIDGE_VERSION || message.epoch !== epoch) return;
  if (message.kind === "event") {
    chrome.runtime.sendMessage({ kind: "event", epoch, storeId: message.storeId, event: message.event }).catch(() => {});
    return;
  }
  const resolve = pending.get(message.requestId);
  if (resolve) {
    pending.delete(message.requestId);
    resolve({ ...message, epoch });
  }
});

chrome.runtime.sendMessage({ kind: "available", epoch }).catch(() => {});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !["handshake", "request"].includes(message.kind)) return;
  if (message.kind === "request" && message.epoch !== epoch) {
    sendResponse({ kind: "response", requestId: message.requestId, epoch, error: "The inspected document changed" });
    return;
  }
  if (new TextEncoder().encode(JSON.stringify(message)).byteLength > MAX_REQUEST_BYTES) {
    sendResponse({ kind: "response", requestId: message.requestId, error: "Request exceeds 512 KiB" });
    return;
  }
  let timer;
  pending.set(message.requestId, (response) => {
    clearTimeout(timer);
    sendResponse(response);
  });
  timer = setTimeout(() => {
    pending.delete(message.requestId);
    sendResponse({ kind: "unavailable", requestId: message.requestId, epoch });
  }, 5000);
  pageMessage(message);
  return true;
});
