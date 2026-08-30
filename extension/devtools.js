/**
 * devtools.js — Chrome DevTools Page
 *
 * Creates the Entity Explorer panel in Chrome DevTools.
 * This file runs in the devtools context (not the inspected page).
 */

chrome.devtools.panels.create(
  "Entity Graph",
  "icons/icon16.png",
  "panel.html",
  () => {}
);
