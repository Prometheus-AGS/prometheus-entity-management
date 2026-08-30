/**
 * background.js — Chrome MV3 Service Worker
 *
 * Stateless port relay: forwards DevtoolsEvent messages from content scripts
 * to the open DevTools panel (if any). Does NOT buffer events.
 *
 * The chrome.runtime.connect() port from the panel keeps this worker alive
 * while the DevTools panel is open.
 */

const panelsByTab = new Map();

function panelsFor(tabId) {
  let panels = panelsByTab.get(tabId);
  if (!panels) {
    panels = new Set();
    panelsByTab.set(tabId, panels);
  }
  return panels;
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "prometheus-entity-graph-panel") return;
  let tabId = null;
  port.onMessage.addListener((message) => {
    if (message?.kind === "panel-connect" && Number.isInteger(message.tabId)) {
      tabId = message.tabId;
      panelsFor(tabId).add(port);
      chrome.tabs.sendMessage(tabId, { kind: "handshake", requestId: message.requestId })
        .then((response) => port.postMessage(response))
        .catch(() => port.postMessage({ kind: "unavailable", requestId: message.requestId }));
      return;
    }
    if (tabId === null || message?.kind !== "request") return;
    chrome.tabs.sendMessage(tabId, message)
      .then((response) => port.postMessage(response))
      .catch(() => port.postMessage({ kind: "response", requestId: message.requestId, error: "The inspected page is unavailable" }));
  });
  port.onDisconnect.addListener(() => {
    if (tabId === null) return;
    const panels = panelsByTab.get(tabId);
    panels?.delete(port);
    if (panels?.size === 0) panelsByTab.delete(tabId);
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (!Number.isInteger(tabId) || !["event", "available"].includes(message?.kind)) return;
  for (const panel of panelsByTab.get(tabId) ?? []) panel.postMessage(message);
});

chrome.tabs.onRemoved.addListener((tabId) => panelsByTab.delete(tabId));
