/**
 * content.js — Chrome MV3 Content Script (ISOLATED world)
 *
 * Listens for window.postMessage events from the inspected page
 * (emitted by EntityExplorerProvider when enableWindowBridge={true})
 * and forwards them to the background service worker via chrome.runtime.sendMessage.
 */

window.addEventListener("message", (e) => {
  // Only accept messages from the page itself
  if (e.source !== window) return;

  const data = e.data;
  if (!data || data.type !== "__entity_explorer_event__" || !data.payload) return;

  // Forward to background service worker
  chrome.runtime.sendMessage({
    type: "__entity_explorer_event__",
    payload: data.payload,
  }).catch(() => {
    // Service worker may be sleeping; event is dropped (acceptable)
  });
});
