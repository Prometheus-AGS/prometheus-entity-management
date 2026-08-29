/** Isolated Shadow DOM contract for the shared forensic inspector workspace. */
export const ENTITY_GRAPH_DEVTOOLS_STYLES = `
:host {
  all: initial;
  color-scheme: dark;
  position: fixed;
  z-index: 2147483000;
  inset: 0;
  box-sizing: border-box;
  font-family: var(--pem-devtools-font-body, ui-sans-serif, system-ui, sans-serif);
  color: var(--pem-devtools-color-text, #e8e6df);
  pointer-events: none;
}

*, *::before, *::after { box-sizing: border-box; }
button, input, select, textarea { font: inherit; }
button { color: inherit; }
h1, h2, h3, p, dl, dd, ol, ul { margin: 0; }
ol, ul { padding: 0; list-style: none; }
code, pre, .pem-mono {
  font-family: var(--pem-devtools-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
}
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible,
[tabindex="0"]:focus-visible, [tabindex="-1"]:focus-visible {
  outline: 2px solid var(--pem-devtools-color-focus, #6ed8c9);
  outline-offset: 2px;
}

.pem-devtools-surface {
  --pem-line: #344047;
  --pem-muted: #92a0a6;
  --pem-accent: #63c7a8;
  position: fixed;
  inset: 0;
  pointer-events: none;
  color: var(--pem-devtools-color-text, #e8e6df);
  font: 13px/1.4 var(--pem-devtools-font-body, ui-sans-serif, system-ui, sans-serif);
}
.pem-launcher-slot {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 5px;
  pointer-events: auto;
}
.pem-launcher-slot[data-position="top-left"] { top: max(14px, env(safe-area-inset-top)); left: max(14px, env(safe-area-inset-left)); }
.pem-launcher-slot[data-position="top-right"] { top: max(14px, env(safe-area-inset-top)); right: max(14px, env(safe-area-inset-right)); }
.pem-launcher-slot[data-position="bottom-left"] { bottom: max(14px, env(safe-area-inset-bottom)); left: max(14px, env(safe-area-inset-left)); }
.pem-launcher-slot[data-position="bottom-right"] { right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); }
.pem-launcher, .pem-launcher-settings, .pem-panel-toolbar button {
  border: 1px solid #3c494f;
  background: #111719;
  color: #e8e6df;
  box-shadow: 0 12px 36px rgb(0 0 0 / 36%);
  cursor: pointer;
}
.pem-launcher {
  display: flex;
  min-width: 52px;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-color: #478e82;
  border-radius: 999px;
  padding: 7px 14px 7px 7px;
  background: #142320;
  color: #c6f4ec;
  font-weight: 720;
}
.pem-launcher:hover { border-color: #79d7c9; background: #19302b; }
.pem-launcher-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #79d7c9;
  border-radius: 50%;
  color: #79d7c9;
  font: 800 13px/1 var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-launcher-badge {
  display: grid;
  min-width: 20px;
  min-height: 20px;
  place-items: center;
  border-radius: 10px;
  padding: 0 5px;
  background: #e85d32;
  color: #fff8f2;
  font: 800 10px/1 var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-launcher-settings {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}
.pem-launcher-slot[data-form="edge-tab"] .pem-launcher {
  min-width: 38px;
  min-height: 48px;
  border-radius: 5px;
  padding: 5px;
}
.pem-launcher-slot[data-form="edge-tab"] .pem-launcher-label { display: none; }
.pem-launcher-slot[data-form="edge-tab"] .pem-launcher-mark { width: 28px; height: 34px; border: 0; }
.pem-launcher-slot[data-form="edge-tab"][data-position$="left"] { left: 0; }
.pem-launcher-slot[data-form="edge-tab"][data-position$="right"] { right: 0; }
.pem-launcher-slot[data-position^="bottom"] .pem-settings { top: auto; bottom: calc(100% + 7px); }

.pem-panel-frame {
  position: fixed;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: visible;
  border: 1px solid #303a40;
  border-radius: 9px;
  background: #101416;
  box-shadow: 0 28px 80px rgb(0 0 0 / 52%);
  pointer-events: auto;
}
.pem-panel-frame[data-layout="floating"] {
  top: max(20px, env(safe-area-inset-top));
  left: 50%;
  width: min(1180px, calc(100vw - 40px));
  height: min(780px, calc(100vh - 40px));
  transform: translateX(-50%);
}
.pem-panel-frame[data-layout="dock-right"] {
  inset: 0 0 0 auto;
  width: min(720px, 52vw);
  border-radius: 0;
}
.pem-panel-frame[data-layout="dock-bottom"] {
  inset: auto 0 0;
  width: 100vw;
  height: min(680px, 72vh);
  border-radius: 9px 9px 0 0;
}
.pem-panel-toolbar {
  position: relative;
  z-index: 4;
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #303a40;
  padding: 4px 7px 4px 12px;
  background: #0d1113;
  color: #92a0a6;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.pem-panel-toolbar > div { display: flex; gap: 5px; }
.pem-panel-toolbar button {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  box-shadow: none;
}
.pem-panel-content { min-width: 0; min-height: 0; overflow: hidden; }
.pem-settings {
  position: absolute;
  z-index: 7;
  top: calc(100% + 7px);
  right: 0;
  display: grid;
  width: min(310px, calc(100vw - 28px));
  gap: 12px;
  border: 1px solid #3c494f;
  border-radius: 7px;
  padding: 13px;
  background: #151a1d;
  box-shadow: 0 18px 52px rgb(0 0 0 / 50%);
  color: #e8e6df;
  text-transform: none;
}
.pem-panel-frame > .pem-settings { top: 42px; right: 7px; }
.pem-launcher-slot[data-position$="left"] .pem-settings { right: auto; left: 0; }
.pem-settings header { display: flex; align-items: center; justify-content: space-between; }
.pem-settings header button { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 18px; }
.pem-settings label { display: grid; gap: 5px; color: #92a0a6; font-size: 10px; }
.pem-settings select {
  width: 100%;
  min-height: 36px;
  border: 1px solid #303a40;
  border-radius: 4px;
  padding: 6px 8px;
  background: #0d1113;
  color: #e8e6df;
}
.pem-settings fieldset { display: flex; gap: 5px; margin: 0; border: 0; padding: 0; }
.pem-settings legend { margin-bottom: 5px; color: #92a0a6; font-size: 10px; }
.pem-settings fieldset button, .pem-settings-hide button {
  min-height: 34px;
  border: 1px solid #303a40;
  border-radius: 4px;
  padding: 5px 8px;
  background: #171e21;
  color: #d9dfdc;
  cursor: pointer;
  font-size: 10px;
  text-transform: capitalize;
}
.pem-settings fieldset button[aria-pressed="true"] { border-color: #478e82; background: #1c3b36; color: #a7eee2; }
.pem-settings p { color: #92a0a6; font-size: 10px; }
.pem-settings kbd { border: 1px solid #303a40; border-radius: 3px; padding: 2px 4px; background: #0d1113; color: #d7e4e1; }
.pem-settings-hide { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px solid #303a40; padding-top: 11px; }

.pem-inspector {
  --pem-panel: #1b2227;
  --pem-line: #344047;
  --pem-muted: #92a0a6;
  --pem-accent: #63c7a8;
  --pem-attention: #e85d32;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: var(--pem-devtools-color-shell, #101416);
  box-shadow: none;
  color: var(--pem-devtools-color-text, #e8e6df);
  font-size: 13px;
  line-height: 1.4;
}

.pem-shell-header {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--pem-line);
  background: #121719;
}
.pem-brand, .pem-shell-status, .pem-status-cluster, .pem-row-signals {
  display: flex;
  align-items: center;
}
.pem-brand { gap: 10px; }
.pem-brand strong { display: block; font-size: 13px; letter-spacing: .02em; }
.pem-brand small, .pem-shell-status small { color: var(--pem-muted); }
.pem-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid #8be5d8;
  border-radius: 5px;
  color: var(--pem-accent);
  font: 700 14px/1 var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-shell-status { flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.pem-shell-status > span, .pem-status-cluster > span, .pem-live-status, .pem-registered-status {
  border: 1px solid var(--pem-line);
  border-radius: 999px;
  padding: 3px 8px;
  background: #171d20;
  color: #b9c4c8;
  font-size: 11px;
  white-space: nowrap;
}
[data-tone="attention"] { color: var(--pem-attention) !important; }

.pem-workspace-tabs {
  display: flex;
  min-height: 39px;
  align-items: end;
  gap: 4px;
  padding: 0 12px;
  border-bottom: 1px solid var(--pem-line);
  background: #111618;
}
.pem-workspace-tabs button, .pem-value-tabs button, .pem-filter-row button, .pem-pause {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.pem-workspace-tabs button {
  min-height: 38px;
  padding: 0 12px;
  border-bottom: 2px solid transparent;
  color: var(--pem-muted);
  font-weight: 650;
}
.pem-workspace-tabs button[aria-selected="true"] {
  border-color: var(--pem-accent);
  color: #f5f2e9;
}

.pem-command-feedback {
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  overflow: hidden;
  border-bottom: 0 solid var(--pem-line);
  padding: 0 14px;
  background: #151b1e;
  color: var(--pem-muted);
  font-size: 11px;
}
.pem-command-feedback[data-state="success"], .pem-command-feedback[data-state="error"] {
  min-height: 34px;
  border-bottom-width: 1px;
}
.pem-command-feedback[data-state="success"] { color: var(--pem-accent); }
.pem-command-feedback[data-state="error"] { color: #ffc68b; background: #271e18; }
.pem-command-feedback button {
  border: 0;
  padding: 3px 7px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pem-shell-main, .pem-workspace, .pem-navigator, .pem-entity-detail,
.pem-view-detail, .pem-activity-detail { min-width: 0; min-height: 0; }
.pem-shell-main { overflow: hidden; }
.pem-workspace { height: 100%; overflow: auto; }
.pem-workspace-heading, .pem-detail-header, .pem-card-heading, .pem-navigator-heading,
.pem-activity-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pem-workspace-heading h2, .pem-detail-header h2, .pem-navigator-heading h2 {
  font-size: 18px;
  line-height: 1.2;
}
.pem-eyebrow {
  margin-bottom: 4px;
  color: var(--pem-accent);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.pem-overview-actions, .pem-detail-actions, .pem-preview-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}
.pem-store-select {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--pem-muted);
  font-size: 10px;
}
.pem-store-select select {
  max-width: 240px;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 5px 7px;
  background: #0d1113;
  color: #e8e6df;
}
.pem-policy-status {
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 4px 6px;
  color: var(--pem-muted);
  font: 9px var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-primary-action, .pem-secondary-action, .pem-detail-actions button,
.pem-time-travel-controls button {
  min-height: 29px;
  border: 1px solid #3c494f;
  border-radius: 4px;
  padding: 5px 9px;
  background: #171e21;
  color: #d9dfdc;
  cursor: pointer;
  font-size: 11px;
}
.pem-primary-action { border-color: #478e82; background: #1c3b36; color: #a7eee2; }
.pem-primary-action:disabled, .pem-secondary-action:disabled, .pem-detail-actions button:disabled,
.pem-time-travel-controls button:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.pem-overview { padding: 20px; }
.pem-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}
.pem-metric, .pem-card, .pem-detail-section {
  border: 1px solid var(--pem-line);
  border-radius: 6px;
  background: var(--pem-panel);
}
.pem-metric { min-height: 82px; padding: 13px; }
.pem-metric span { display: block; margin-bottom: 6px; color: var(--pem-muted); font-size: 11px; }
.pem-metric strong { font-size: 24px; line-height: 1; }
.pem-overview-grid {
  display: grid;
  grid-template-columns: minmax(240px, .7fr) minmax(420px, 1.3fr);
  gap: 12px;
  margin-top: 12px;
}
.pem-card, .pem-detail-section { padding: 14px; }
.pem-card-heading { margin-bottom: 10px; }
.pem-card-heading h3 { font-size: 12px; }
.pem-card-heading > span {
  color: var(--pem-muted);
  font: 11px var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-readout-list { display: grid; gap: 8px; }
.pem-readout-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #252e32;
  padding-bottom: 7px;
}
.pem-readout-list div:last-child { border: 0; padding-bottom: 0; }
.pem-readout-list dt, .pem-readout-list dd, .pem-empty { color: var(--pem-muted); }
.pem-trace-list { display: grid; gap: 5px; }
.pem-trace-list li {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: baseline;
  border-top: 1px solid #252e32;
  padding: 8px 0 3px;
}
.pem-trace-type {
  color: var(--pem-accent);
  font: 10px var(--pem-devtools-font-mono, ui-monospace, monospace);
  text-transform: uppercase;
}
.pem-trace-copy { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pem-trace-list time, .pem-compact-list time {
  color: var(--pem-muted);
  font: 10px var(--pem-devtools-font-mono, ui-monospace, monospace);
}

.pem-entity-workspace, .pem-view-workspace, .pem-activity-workspace {
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  overflow: hidden;
}
.pem-entity-workspace {
  grid-template-columns: 286px minmax(0, 1fr) 240px;
}
.pem-entity-workspace[data-navigator-collapsed="true"] {
  grid-template-columns: 38px minmax(0, 1fr) 240px;
}
.pem-entity-workspace[data-causal-rail-collapsed="true"] {
  grid-template-columns: 286px minmax(0, 1fr) 38px;
}
.pem-entity-workspace[data-navigator-collapsed="true"][data-causal-rail-collapsed="true"] {
  grid-template-columns: 38px minmax(0, 1fr) 38px;
}
.pem-navigator {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  padding: 14px 10px 10px;
  border-right: 1px solid var(--pem-line);
  background: #121719;
}
.pem-navigator[data-collapsed="true"] { padding: 8px 4px; }
.pem-rail-collapse, .pem-rail-restore {
  display: inline-grid;
  min-width: 28px;
  min-height: 28px;
  place-items: center;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  background: #151b1e;
  color: var(--pem-muted);
  cursor: pointer;
}
.pem-rail-restore { width: 28px; margin: 0 auto; }
.pem-coverage-note {
  border-left: 2px solid var(--pem-line);
  padding: 3px 7px;
  color: var(--pem-muted);
  font-size: 10px;
}
.pem-search input, .pem-select-label select {
  width: 100%;
  border: 1px solid var(--pem-line);
  border-radius: 5px;
  padding: 8px 9px;
  background: #0d1113;
  color: #e8e6df;
}
.pem-filter-row { display: flex; gap: 5px; }
.pem-filter-row button, .pem-pause {
  border: 1px solid var(--pem-line);
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--pem-muted);
  font-size: 11px;
  text-transform: capitalize;
}
.pem-filter-row button[aria-pressed="true"], .pem-pause[aria-pressed="true"] {
  border-color: #4a887f;
  background: #17302e;
  color: var(--pem-accent);
}
.pem-scroll-list { min-height: 0; flex: 1; overflow: auto; scrollbar-color: #445158 transparent; }
.pem-virtual-space, .pem-virtual-row { position: relative; width: 100%; }
.pem-virtual-row { position: absolute; inset: 0 0 auto; }
.pem-entity-row, .pem-view-row, .pem-event-row, .pem-membership-row,
.pem-compact-list button {
  width: 100%;
  border: 0;
  border-radius: 4px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.pem-entity-row, .pem-view-row, .pem-event-row {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 7px;
}
.pem-entity-row:hover, .pem-view-row:hover, .pem-event-row:hover,
.pem-membership-row:hover, .pem-compact-list button:hover { background: #20282c; }
.pem-entity-row[data-selected="true"], .pem-view-row[data-selected="true"],
.pem-event-row[data-selected="true"] {
  background: #20322f;
  box-shadow: inset 2px 0 var(--pem-accent);
}
.pem-entity-row[data-causal="true"], .pem-view-row[data-causal="true"],
.pem-membership-row[data-causal="true"], .pem-compact-list li[data-causal="true"] {
  box-shadow: inset 2px 0 var(--pem-accent);
  background: #1a2c28;
}
.pem-entity-copy, .pem-event-copy { display: grid; min-width: 0; }
.pem-entity-copy strong, .pem-event-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.pem-entity-copy code, .pem-event-copy small, .pem-view-row code {
  overflow: hidden;
  color: var(--pem-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pem-row-signals, .pem-status-cluster {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
  color: var(--pem-attention);
  font-size: 10px;
}
.pem-entity-detail, .pem-view-detail, .pem-activity-detail { overflow: auto; padding: 18px; }
.pem-entity-detail article > section, .pem-view-detail article > section,
.pem-activity-detail article > section { content-visibility: auto; contain-intrinsic-size: 120px; }
.pem-entity-confirmation { margin: -5px 0 12px; font-size: 10px; }
.pem-detail-header { margin-bottom: 14px; }
.pem-detail-tools { display: grid; justify-items: end; gap: 8px; }
.pem-detail-header h2 code { color: var(--pem-muted); font-size: .75em; font-weight: 500; }
.pem-error, .pem-expired {
  display: grid;
  gap: 3px;
  margin-bottom: 12px;
  border: 1px solid #7f5233;
  border-radius: 5px;
  padding: 9px 11px;
  background: #2b2019;
  color: #ffd4a0;
}

.pem-value-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--pem-line); }
.pem-value-tabs button {
  padding: 7px 10px;
  border-bottom: 2px solid transparent;
  color: var(--pem-muted);
  text-transform: capitalize;
}
.pem-value-tabs button[aria-selected="true"] { border-color: var(--pem-accent); color: #f5f2e9; }
.pem-value-panel {
  min-height: 160px;
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--pem-line);
  border-top: 0;
  border-radius: 0 0 5px 5px;
  background: #0e1214;
}
.pem-value {
  overflow: auto;
  margin: 0;
  padding: 12px;
  color: #d7e4e1;
  font-size: 11px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.pem-preview-panel {
  margin-top: 12px;
  border: 1px solid var(--pem-line);
  border-radius: 6px;
  padding: 13px;
  background: #13191b;
}
.pem-preview-editor { display: grid; gap: 5px; color: var(--pem-muted); font-size: 10px; }
.pem-preview-editor textarea {
  min-height: 84px;
  resize: vertical;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 9px;
  background: #0d1113;
  color: #d7e4e1;
  font: 11px/1.5 var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-inline-error { margin-top: 7px; color: #ffc68b; font-size: 11px; }
.pem-preview-diff { margin-top: 10px; border: 1px solid #293337; border-radius: 4px; overflow: hidden; }
.pem-preview-diff > p { padding: 7px 9px; background: #171e21; color: var(--pem-muted); font-size: 10px; }
.pem-preview-actions { justify-content: flex-start; margin-top: 10px; }
.pem-preview-receipt { margin-top: 8px; color: var(--pem-muted); font-size: 10px; }
.pem-diff-table { display: grid; }
.pem-diff-row {
  display: grid;
  grid-template-columns: minmax(90px, .65fr) repeat(2, minmax(120px, 1fr));
  border-top: 1px solid #252e32;
}
.pem-diff-row:first-child { border-top: 0; }
.pem-diff-row > span {
  min-width: 0;
  padding: 7px 9px;
  overflow-wrap: anywhere;
  font: 10px/1.4 var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-diff-head { color: var(--pem-muted); background: #161c1f; font-weight: 700; }
.pem-diff-row[data-kind="changed"] > span:first-child,
.pem-diff-row[data-kind="added"] > span:first-child,
.pem-diff-row[data-kind="removed"] > span:first-child { color: var(--pem-attention); }

.pem-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.pem-causal-rail {
  min-width: 0;
  overflow: auto;
  border-left: 1px solid var(--pem-line);
  padding: 14px 10px;
  background: #121719;
}
.pem-causal-rail[data-collapsed="true"] { overflow: hidden; padding: 8px 4px; }
.pem-causal-heading { display: flex; align-items: start; justify-content: space-between; gap: 8px; }
.pem-causal-heading h2 { font-size: 15px; }
.pem-causal-path { display: grid; gap: 0; margin-top: 14px; }
.pem-causal-path li {
  position: relative;
  display: grid;
  gap: 5px;
  border-left: 1px solid var(--pem-line);
  padding: 0 0 14px 12px;
}
.pem-causal-path li::before {
  position: absolute;
  top: 2px;
  left: -4px;
  width: 7px;
  height: 7px;
  border: 1px solid var(--pem-accent);
  border-radius: 50%;
  background: #121719;
  content: "";
}
.pem-causal-path li > span { color: var(--pem-accent); font-size: 9px; font-weight: 800; text-transform: uppercase; }
.pem-causal-path button, .pem-causal-path code {
  display: grid;
  width: 100%;
  border: 0;
  padding: 3px 0;
  background: transparent;
  color: #dce4df;
  text-align: left;
  overflow-wrap: anywhere;
  font-size: 10px;
}
.pem-causal-path button { cursor: pointer; }
.pem-causal-path small { color: var(--pem-muted); font-size: 9px; }
.pem-compact-list { display: grid; gap: 3px; }
.pem-compact-list button, .pem-membership-row { display: grid; gap: 3px; padding: 6px; }
.pem-compact-list code, .pem-compact-list small, .pem-membership-row code {
  color: var(--pem-muted);
  font-size: 9px;
}
.pem-view-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 12px; }
.pem-readout { min-height: 70px; }
.pem-list-health { margin-bottom: 12px; }
.pem-membership-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}
.pem-membership-row { border: 1px solid #293337; background: #121719; }
.pem-membership-position { color: var(--pem-accent); font: 9px var(--pem-devtools-font-mono, ui-monospace, monospace); }
.pem-last-change { margin-bottom: 12px; }
.pem-last-change-readout { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; }
.pem-last-change-readout code { grid-column: 1 / -1; color: var(--pem-muted); font-size: 9px; overflow-wrap: anywhere; }
.pem-activity-heading { align-items: start; }
.pem-select-label { display: grid; gap: 5px; color: var(--pem-muted); font-size: 10px; }
.pem-event-row { min-height: 50px; justify-content: start; }
.pem-correlation { color: var(--pem-muted); font-size: 9px; }
.pem-event-sequence {
  flex: 0 0 42px;
  color: var(--pem-accent);
  font: 10px var(--pem-devtools-font-mono, ui-monospace, monospace);
}
.pem-time-travel {
  border: 1px solid #293337;
  border-radius: 5px;
  padding: 9px;
  background: #101517;
}
.pem-time-travel .pem-card-heading { margin-bottom: 7px; }
.pem-time-travel-controls { display: grid; gap: 7px; }
.pem-time-travel-controls p { color: var(--pem-muted); font-size: 10px; }
.pem-event-readouts { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 12px; }
.pem-event-readouts div { border: 1px solid #293337; border-radius: 4px; padding: 8px; }
.pem-change-list { display: grid; gap: 5px; }
.pem-change-list li {
  display: grid;
  grid-template-columns: 70px minmax(120px, .8fr) minmax(0, 1fr);
  gap: 9px;
  border-top: 1px solid #252e32;
  padding: 7px 0;
}
.pem-retention-warning {
  margin-bottom: 10px;
  border-left: 2px solid var(--pem-attention);
  padding: 6px 8px;
  background: #281a17;
  color: #f2b19d;
  font-size: 10px;
}
.pem-impact-readouts { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 10px; }
.pem-impact-identities { display: flex; flex-wrap: wrap; gap: 5px; margin: 7px 0; }
.pem-impact-identities strong { color: var(--pem-muted); font-size: 10px; }
.pem-impact-identities code { border: 1px solid var(--pem-line); border-radius: 3px; padding: 2px 5px; font-size: 9px; }

.pem-graph-pulse {
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr) minmax(190px, .45fr);
  min-height: 54px;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--pem-line);
  padding: 7px 10px;
  background: #0f1315;
}
.pem-graph-pulse[data-collapsed="true"] { grid-template-columns: auto; min-height: 34px; }
.pem-pulse-toggle {
  min-height: 30px;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 4px 8px;
  background: #171d20;
  color: var(--pem-accent);
  cursor: pointer;
  font-weight: 750;
}
.pem-pulse-segments { display: flex; min-width: 0; align-items: stretch; gap: 2px; overflow-x: auto; }
.pem-pulse-segments li { flex: 1 0 20px; max-width: 48px; }
.pem-pulse-segments button {
  display: grid;
  width: 100%;
  min-height: 32px;
  place-items: center;
  border: 0;
  border-bottom: 2px solid #526069;
  background: transparent;
  color: var(--pem-muted);
  cursor: pointer;
  animation: pem-pulse-arrival 150ms ease-out both;
}
.pem-pulse-segments button[data-event-type="mutation"] { border-color: var(--pem-accent); }
.pem-pulse-segments button[data-selected="true"] { background: #1a2c28; color: #eef8f3; }
.pem-pulse-segments button > span { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pem-pulse-segments small { font-size: 8px; }
.pem-pulse-empty { color: var(--pem-muted); font-size: 10px; }
.pem-pulse-readout { display: grid; min-width: 0; }
.pem-pulse-readout strong, .pem-pulse-readout span, .pem-pulse-readout code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pem-pulse-readout span, .pem-pulse-readout code { color: var(--pem-muted); font-size: 9px; }
@keyframes pem-pulse-arrival {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.pem-empty { padding: 10px 2px; font-size: 11px; }
.pem-empty-large { display: grid; min-height: 240px; place-items: center; text-align: center; }
.pem-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.pem-devtools-loading {
  min-width: 224px;
  border: 1px solid var(--pem-devtools-color-border, #344047);
  border-radius: var(--pem-devtools-radius-panel, 6px);
  padding: 12px 16px;
  background: var(--pem-devtools-color-shell, #111416);
  color: var(--pem-devtools-color-text, #e8e6df);
  box-shadow: 0 16px 48px rgb(0 0 0 / 36%);
  font-size: 13px;
  line-height: 1.4;
}

.pem-mobile-back { display: none; }

@media (max-width: 719px) {
  .pem-panel-frame,
  .pem-panel-frame[data-layout="floating"],
  .pem-panel-frame[data-layout="dock-right"],
  .pem-panel-frame[data-layout="dock-bottom"] {
    inset: 0;
    width: 100vw;
    height: 100dvh;
    transform: none;
    border: 0;
    border-radius: 0;
    padding-top: env(safe-area-inset-top);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
  }
  .pem-panel-toolbar { min-height: 44px; }
  .pem-panel-toolbar button, .pem-workspace-tabs button, .pem-mobile-back,
  .pem-primary-action, .pem-secondary-action, .pem-detail-actions button,
  .pem-time-travel-controls button, .pem-settings button, .pem-settings select {
    min-width: 44px;
    min-height: 44px;
  }
  .pem-inspector { font-size: 12px; }
  .pem-shell-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
  }
  .pem-shell-status { justify-content: flex-start; }
  .pem-workspace-tabs {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
  }
  .pem-workspace-tabs button { flex: 0 0 auto; }
  .pem-shell-main, .pem-workspace, .pem-navigator, .pem-entity-detail,
  .pem-view-detail, .pem-activity-detail, .pem-scroll-list, .pem-value-panel {
    overscroll-behavior: contain;
  }
  .pem-overview { padding: 12px; }
  .pem-workspace-heading { align-items: flex-start; flex-direction: column; }
  .pem-overview-actions { width: 100%; justify-content: flex-start; }
  .pem-store-select { width: 100%; }
  .pem-store-select select { min-height: 44px; max-width: none; flex: 1; }
  .pem-metric-grid, .pem-view-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pem-overview-grid, .pem-detail-grid { grid-template-columns: 1fr; }
  .pem-entity-workspace, .pem-view-workspace, .pem-activity-workspace {
    display: block;
    overflow: hidden;
  }
  .pem-causal-rail { display: none; }
  .pem-graph-pulse { grid-template-columns: auto minmax(180px, 1fr); }
  .pem-pulse-readout { display: none; }
  .pem-navigator, .pem-entity-detail, .pem-view-detail, .pem-activity-detail { height: 100%; }
  .pem-workspace[data-narrow-detail="false"] > .pem-entity-detail,
  .pem-workspace[data-narrow-detail="false"] > .pem-view-detail,
  .pem-workspace[data-narrow-detail="false"] > .pem-activity-detail { display: none; }
  .pem-workspace[data-narrow-detail="true"] > .pem-navigator { display: none; }
  .pem-navigator { border-right: 0; padding: 12px; }
  .pem-entity-detail, .pem-view-detail, .pem-activity-detail { padding: 12px; }
  .pem-mobile-back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #3c494f;
    border-radius: 4px;
    margin-bottom: 10px;
    padding: 6px 10px;
    background: #171e21;
    color: #d9dfdc;
    cursor: pointer;
  }
  .pem-detail-header { align-items: flex-start; flex-direction: column; }
  .pem-detail-tools { width: 100%; justify-items: start; }
  .pem-detail-actions { justify-content: flex-start; }
  .pem-value-tabs { overflow-x: auto; }
  .pem-value-tabs button { flex: 0 0 auto; min-height: 44px; }
  .pem-value-panel { max-height: 42vh; }
  .pem-preview-panel { padding: 10px; }
  .pem-preview-editor textarea { min-height: 120px; }
  .pem-preview-diff { overflow-x: auto; }
  .pem-diff-table { min-width: 520px; }
  .pem-membership-list { grid-template-columns: 1fr; }
  .pem-event-readouts { grid-template-columns: 1fr; }
  .pem-change-list li { grid-template-columns: 62px minmax(0, 1fr); }
  .pem-change-list li small { grid-column: 2; }
  .pem-settings { position: fixed; top: calc(52px + env(safe-area-inset-top)); right: 14px; left: 14px; width: auto; }
  .pem-settings fieldset, .pem-settings-hide { grid-template-columns: 1fr; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
`;
