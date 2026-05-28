/**
 * background.js — Chrome MV3 Service Worker
 *
 * Stateless port relay: forwards DevtoolsEvent messages from content scripts
 * to the open DevTools panel (if any). Does NOT buffer events.
 *
 * The chrome.runtime.connect() port from the panel keeps this worker alive
 * while the DevTools panel is open.
 */

/** @type {chrome.runtime.Port | null} */
let panelPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "entity-explorer-panel") return;

  panelPort = port;

  port.onDisconnect.addListener(() => {
    panelPort = null;
  });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== "__entity_explorer_event__" || !msg.payload) return;
  if (panelPort) {
    panelPort.postMessage(msg.payload);
  }
});
