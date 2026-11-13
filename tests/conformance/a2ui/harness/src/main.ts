import { beginStep, finishStep, settle, startCase } from "./case-runtime.js";
import "./types.js";

/**
 * The official `openUrl` opens a window; the upstream harnesses stub it so a
 * gesture-gated case does not navigate. Calls are recorded instead.
 */
window.__a2uiConformanceOpenedUrls = [];
window.open = ((url?: string | URL) => {
  window.__a2uiConformanceOpenedUrls.push(String(url ?? ""));
  return null;
}) as typeof window.open;

window.__a2uiConformance = { startCase, beginStep, settle, finishStep };
document.documentElement.dataset.a2uiConformanceReady = "true";
