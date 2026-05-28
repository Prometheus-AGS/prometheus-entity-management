/**
 * devtools.js — Chrome DevTools Page
 *
 * Creates the Entity Explorer panel in Chrome DevTools.
 * This file runs in the devtools context (not the inspected page).
 */

chrome.devtools.panels.create(
  "Entity Explorer",
  "icons/icon16.png",
  "panel.html",
  (panel) => {
    // Panel created — panel.html will connect via chrome.runtime.connect()
  }
);
