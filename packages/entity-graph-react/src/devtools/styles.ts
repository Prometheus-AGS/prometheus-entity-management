/**
 * Isolated Shadow DOM contract for the shared forensic inspector workspace.
 *
 * Palette "Instrument Dark" (docs/devtools-design-notes.md §2). Every colour in this sheet is a
 * `--pem-*` token declared once on `:host`; each token accepts a `--pem-devtools-<name>` host
 * override and the pre-existing `--pem-devtools-color-*` / `-radius-panel` / `-font-*` names.
 * Type scale 11/12/13/15/18/24, spacing scale 2/4/6/8/12/16/20/24, hit targets 32px (44px on
 * small viewports). Layout breakpoints are container queries on `.pem-panel-content`.
 */
export const ENTITY_GRAPH_DEVTOOLS_STYLES = `
:host {
  all: initial;
  --pem-shell: var(--pem-devtools-shell, var(--pem-devtools-color-shell, #0D1117));
  --pem-surface: var(--pem-devtools-surface, #161B22);
  --pem-elevated: var(--pem-devtools-elevated, #1C2333);
  --pem-text: var(--pem-devtools-text, var(--pem-devtools-color-text, #E6EDF3));
  --pem-muted: var(--pem-devtools-muted, #8B949E);
  --pem-code: var(--pem-devtools-code, #CDD9E5);
  --pem-accent: var(--pem-devtools-accent, #F0A500);
  --pem-add: var(--pem-devtools-add, #3FB950);
  --pem-mod: var(--pem-devtools-mod, #D29922);
  --pem-del: var(--pem-devtools-del, #F85149);
  --pem-line: var(--pem-devtools-line, var(--pem-devtools-color-border, #30363D));
  --pem-focus: var(--pem-devtools-focus, var(--pem-devtools-color-focus, #F0A500));
  --pem-radius-panel: var(--pem-devtools-radius-panel, 8px);
  --pem-font-body: var(--pem-devtools-font-body, ui-sans-serif, system-ui, sans-serif);
  --pem-font-mono: var(--pem-devtools-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  color-scheme: dark;
  position: fixed;
  z-index: 2147483000;
  inset: 0;
  box-sizing: border-box;
  font-family: var(--pem-font-body);
  color: var(--pem-text);
  pointer-events: none;
}

*, *::before, *::after { box-sizing: border-box; }
button, input, select, textarea { font: inherit; }
button { color: inherit; touch-action: manipulation; }
h1, h2, h3, p, dl, dd, ol, ul { margin: 0; }
ol, ul { padding: 0; list-style: none; }
code, pre, .pem-mono { font-family: var(--pem-font-mono); }
::selection { background: var(--pem-accent); color: var(--pem-shell); }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible,
[tabindex="0"]:focus-visible, [tabindex="-1"]:focus-visible {
  outline: 2px solid var(--pem-focus);
  outline-offset: 2px;
}

.pem-devtools-surface {
  position: fixed;
  inset: 0;
  pointer-events: none;
  color: var(--pem-text);
  font: 13px/1.4 var(--pem-font-body);
  font-variant-numeric: tabular-nums;
}
.pem-launcher-slot {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto;
}
.pem-launcher-slot[data-position="top-left"] { top: max(16px, env(safe-area-inset-top)); left: max(16px, env(safe-area-inset-left)); }
.pem-launcher-slot[data-position="top-right"] { top: max(16px, env(safe-area-inset-top)); right: max(16px, env(safe-area-inset-right)); }
.pem-launcher-slot[data-position="bottom-left"] { bottom: max(16px, env(safe-area-inset-bottom)); left: max(16px, env(safe-area-inset-left)); }
.pem-launcher-slot[data-position="bottom-right"] { right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); }
.pem-launcher, .pem-launcher-settings, .pem-panel-toolbar button {
  border: 1px solid var(--pem-line);
  background: var(--pem-surface);
  color: var(--pem-text);
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
  border-radius: 999px;
  padding: 6px 12px 6px 6px;
  font-weight: 600;
}
.pem-launcher:hover { border-color: var(--pem-accent); background: var(--pem-elevated); }
.pem-launcher-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid var(--pem-accent);
  border-radius: 50%;
  color: var(--pem-accent);
  font: 700 13px/1 var(--pem-font-mono);
}
.pem-launcher-badge {
  display: grid;
  min-width: 20px;
  min-height: 20px;
  place-items: center;
  border-radius: 10px;
  padding: 0 4px;
  background: var(--pem-accent);
  color: var(--pem-shell);
  font: 700 11px/1 var(--pem-font-mono);
  font-variant-numeric: tabular-nums;
}
.pem-launcher-settings {
  min-width: 36px;
  min-height: 36px;
  border-radius: 50%;
}
.pem-launcher-slot[data-form="edge-tab"] .pem-launcher {
  min-width: 38px;
  min-height: 48px;
  border-radius: 5px;
  padding: 4px;
}
.pem-launcher-slot[data-form="edge-tab"] .pem-launcher-label { display: none; }
.pem-launcher-slot[data-form="edge-tab"] .pem-launcher-mark { width: 28px; height: 34px; border: 0; }
.pem-launcher-slot[data-form="edge-tab"][data-position$="left"] { left: 0; }
.pem-launcher-slot[data-form="edge-tab"][data-position$="right"] { right: 0; }
.pem-launcher-slot[data-position^="bottom"] .pem-settings { top: auto; bottom: calc(100% + 8px); }

.pem-panel-frame {
  position: fixed;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: visible;
  border: 1px solid var(--pem-line);
  border-radius: var(--pem-radius-panel);
  background: var(--pem-shell);
  box-shadow: 0 28px 80px rgb(0 0 0 / 52%);
  pointer-events: auto;
  animation: pem-panel-reveal 200ms ease-out both;
}
@keyframes pem-panel-reveal {
  from { opacity: 0; translate: 0 8px; }
  to { opacity: 1; translate: 0 0; }
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
  border-radius: var(--pem-radius-panel) var(--pem-radius-panel) 0 0;
}
.pem-panel-toolbar {
  position: relative;
  z-index: 4;
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--pem-line);
  padding: 4px 8px 4px 12px;
  background: var(--pem-shell);
  color: var(--pem-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.pem-panel-toolbar > div { display: flex; gap: 4px; }
.pem-panel-toolbar button {
  min-width: 32px;
  min-height: 32px;
  border-radius: 4px;
  box-shadow: none;
}
.pem-panel-content { min-width: 0; min-height: 0; overflow: hidden; container-type: inline-size; }
.pem-settings {
  position: absolute;
  z-index: 7;
  top: calc(100% + 8px);
  right: 0;
  display: grid;
  width: min(310px, calc(100vw - 32px));
  gap: 12px;
  border: 1px solid var(--pem-line);
  border-radius: var(--pem-radius-panel);
  padding: 12px;
  background: var(--pem-elevated);
  box-shadow: 0 18px 52px rgb(0 0 0 / 50%);
  color: var(--pem-text);
  text-transform: none;
}
.pem-panel-frame > .pem-settings { top: 44px; right: 8px; }
.pem-launcher-slot[data-position$="left"] .pem-settings { right: auto; left: 0; }
.pem-settings header { display: flex; align-items: center; justify-content: space-between; }
.pem-settings header button {
  min-width: 32px;
  min-height: 32px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
}
.pem-settings label { display: grid; gap: 4px; color: var(--pem-muted); font-size: 11px; }
.pem-settings select {
  width: 100%;
  min-height: 36px;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 6px 8px;
  background: var(--pem-shell);
  color: var(--pem-text);
}
.pem-settings fieldset { display: flex; gap: 4px; margin: 0; border: 0; padding: 0; }
.pem-settings legend { margin-bottom: 4px; color: var(--pem-muted); font-size: 11px; }
.pem-settings fieldset button, .pem-settings-hide button {
  min-height: 32px;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 4px 8px;
  background: var(--pem-surface);
  color: var(--pem-text);
  cursor: pointer;
  font-size: 11px;
  text-transform: capitalize;
}
.pem-settings fieldset button[aria-pressed="true"] { border-color: var(--pem-accent); background: var(--pem-shell); color: var(--pem-accent); }
.pem-settings p { color: var(--pem-muted); font-size: 11px; }
.pem-settings kbd { border: 1px solid var(--pem-line); border-radius: 3px; padding: 2px 4px; background: var(--pem-shell); color: var(--pem-code); }
.pem-settings-hide { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px solid var(--pem-line); padding-top: 12px; }

.pem-inspector {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: var(--pem-shell);
  box-shadow: none;
  color: var(--pem-text);
  font-size: 13px;
  line-height: 1.4;
}
.pem-inspector[data-rewound="true"] {
  grid-template-rows: auto auto auto auto minmax(0, 1fr) auto;
  outline: 2px solid var(--pem-mod);
  outline-offset: -2px;
}

.pem-shell-header {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--pem-line);
  background: var(--pem-surface);
}
.pem-brand, .pem-shell-status, .pem-status-cluster, .pem-row-signals {
  display: flex;
  align-items: center;
}
.pem-brand { gap: 8px; }
.pem-brand strong { display: block; font-size: 13px; letter-spacing: .02em; }
.pem-brand small, .pem-shell-status small { color: var(--pem-muted); }
.pem-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid var(--pem-accent);
  border-radius: 5px;
  color: var(--pem-accent);
  font: 700 13px/1 var(--pem-font-mono);
}
.pem-shell-status { flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.pem-shell-status > span, .pem-shell-status > button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
}
.pem-shell-status > button { cursor: pointer; }
.pem-shell-status > button:disabled { cursor: default; }
.pem-shell-status > button:not(:disabled):hover { border-color: var(--pem-muted); background: var(--pem-shell); }
.pem-shell-status > span, .pem-shell-status > button,
.pem-status-cluster > span, .pem-live-status, .pem-registered-status {
  border: 1px solid var(--pem-line);
  border-radius: 999px;
  padding: 2px 8px;
  background: var(--pem-elevated);
  color: var(--pem-code);
  font-size: 11px;
  white-space: nowrap;
}
[data-tone="dirty"] { color: var(--pem-mod) !important; }
[data-tone="error"] { color: var(--pem-del) !important; }

.pem-workspace-tabs {
  display: flex;
  min-height: 40px;
  align-items: end;
  gap: 4px;
  padding: 0 12px;
  border-bottom: 1px solid var(--pem-line);
  background: var(--pem-surface);
}
.pem-workspace-tabs button, .pem-value-tabs button, .pem-filter-row button, .pem-pause {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.pem-workspace-tabs button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border-bottom: 2px solid transparent;
  color: var(--pem-muted);
  font-weight: 600;
}
.pem-workspace-tabs button:hover,
.pem-value-tabs button:hover,
.pem-filter-row button:hover,
.pem-pause:hover,
.pem-panel-toolbar button:hover,
.pem-settings button:hover,
.pem-detail-actions button:hover,
.pem-preview-actions button:hover,
.pem-time-travel-controls button:hover,
.pem-pulse-toggle:hover,
.pem-pulse-segments button:hover {
  border-color: var(--pem-muted);
  background: var(--pem-elevated);
  color: var(--pem-text);
}
.pem-workspace-tabs small {
  color: var(--pem-muted);
  font: 700 11px/1 var(--pem-font-mono);
  font-variant-numeric: tabular-nums;
}
.pem-workspace-tabs button[aria-selected="true"] {
  border-color: var(--pem-accent);
  color: var(--pem-text);
}

.pem-rewound-bar {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  padding: 4px 16px;
  border-bottom: 1px solid var(--pem-mod);
  background: var(--pem-surface);
  color: var(--pem-mod);
  font-size: 12px;
  font-weight: 600;
}
.pem-rewound-bar button {
  min-height: 32px;
  border: 1px solid var(--pem-mod);
  border-radius: 999px;
  padding: 4px 12px;
  background: var(--pem-shell);
  color: var(--pem-mod);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.pem-rewound-bar button:hover { background: var(--pem-elevated); color: var(--pem-text); }
.pem-rewound-bar button:disabled { cursor: default; opacity: .6; }

.pem-command-feedback {
  display: flex;
  min-height: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  overflow: hidden;
  border-bottom: 0 solid var(--pem-line);
  padding: 0 12px;
  background: var(--pem-surface);
  color: var(--pem-muted);
  font-size: 11px;
}
.pem-command-feedback[data-state="success"], .pem-command-feedback[data-state="error"] {
  min-height: 36px;
  border-bottom-width: 1px;
}
.pem-command-feedback[data-state="success"] { color: var(--pem-add); }
.pem-command-feedback[data-state="error"] { color: var(--pem-del); }
.pem-command-feedback button {
  min-height: 32px;
  border: 0;
  padding: 4px 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.pem-shell-main, .pem-workspace, .pem-navigator, .pem-entity-detail,
.pem-view-detail, .pem-activity-detail { min-width: 0; min-height: 0; }
.pem-shell-main { overflow: hidden; }
.pem-workspace { height: 100%; overflow: auto; scrollbar-color: var(--pem-line) var(--pem-shell); }
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
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.pem-overview-actions, .pem-detail-actions, .pem-preview-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.pem-store-select {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--pem-muted);
  font-size: 11px;
}
.pem-store-select select {
  max-width: 240px;
  min-height: 32px;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 4px 8px;
  background: var(--pem-shell);
  color: var(--pem-text);
}
.pem-policy-status {
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 4px 6px;
  color: var(--pem-muted);
  font: 11px var(--pem-font-mono);
}
.pem-primary-action, .pem-secondary-action, .pem-detail-actions button,
.pem-time-travel-controls button {
  min-height: 32px;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 4px 8px;
  background: var(--pem-surface);
  color: var(--pem-text);
  cursor: pointer;
  font-size: 12px;
}
.pem-primary-action { border-color: var(--pem-accent); background: var(--pem-shell); color: var(--pem-accent); }
.pem-primary-action:disabled, .pem-secondary-action:disabled, .pem-detail-actions button:disabled,
.pem-time-travel-controls button:disabled {
  cursor: not-allowed;
  opacity: .48;
}

.pem-overview { padding: 20px; }
.pem-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.pem-metric, .pem-card, .pem-detail-section {
  border: 1px solid var(--pem-line);
  border-radius: 6px;
  background: var(--pem-elevated);
}
.pem-metric { min-height: 82px; padding: 12px; }
button.pem-metric { width: 100%; text-align: left; cursor: pointer; }
button.pem-metric:hover { border-color: var(--pem-muted); background: var(--pem-shell); }
.pem-metric span { display: block; margin-bottom: 6px; color: var(--pem-muted); font-size: 11px; }
.pem-metric strong { font-size: 24px; line-height: 1; font-variant-numeric: tabular-nums; }
.pem-overview-grid {
  display: grid;
  grid-template-columns: minmax(240px, .7fr) minmax(420px, 1.3fr);
  gap: 12px;
  margin-top: 12px;
}
.pem-card, .pem-detail-section { padding: 12px; }
.pem-card-heading { margin-bottom: 8px; }
.pem-card-heading h3 { font-size: 12px; }
.pem-card-heading > span {
  color: var(--pem-muted);
  font: 11px var(--pem-font-mono);
}
.pem-readout-list { display: grid; gap: 8px; }
.pem-readout-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--pem-line);
  padding-bottom: 6px;
}
.pem-readout-list div:last-child { border: 0; padding-bottom: 0; }
.pem-readout-list dt, .pem-readout-list dd, .pem-empty { color: var(--pem-muted); }
.pem-trace-list { display: grid; gap: 4px; }
.pem-trace-list li {
  border-top: 1px solid var(--pem-line);
  padding: 8px 0 2px;
}
.pem-trace-list button {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) auto;
  width: 100%;
  min-height: 32px;
  align-items: baseline;
  gap: 8px;
  border: 0;
  padding: 0;
  background: var(--pem-elevated);
  color: inherit;
  cursor: pointer;
  text-align: left;
}
.pem-trace-type {
  color: var(--pem-accent);
  font: 11px var(--pem-font-mono);
  text-transform: uppercase;
}
.pem-trace-copy { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pem-trace-list time, .pem-compact-list time {
  color: var(--pem-muted);
  font: 11px var(--pem-font-mono);
  font-variant-numeric: tabular-nums;
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
  grid-template-columns: 40px minmax(0, 1fr) 240px;
}
.pem-entity-workspace[data-causal-rail-collapsed="true"] {
  grid-template-columns: 286px minmax(0, 1fr) 40px;
}
.pem-entity-workspace[data-navigator-collapsed="true"][data-causal-rail-collapsed="true"] {
  grid-template-columns: 40px minmax(0, 1fr) 40px;
}
.pem-navigator {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  padding: 12px 8px 8px;
  border-right: 1px solid var(--pem-line);
  background: var(--pem-surface);
}
.pem-navigator[data-collapsed="true"] { padding: 8px 4px; }
.pem-rail-collapse, .pem-rail-restore {
  display: inline-grid;
  min-width: 32px;
  min-height: 32px;
  place-items: center;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  background: var(--pem-elevated);
  color: var(--pem-muted);
  cursor: pointer;
}
.pem-rail-restore { width: 32px; margin: 0 auto; }
.pem-coverage-note {
  border-left: 2px solid var(--pem-line);
  padding: 2px 8px;
  color: var(--pem-muted);
  font-size: 11px;
}
.pem-search input, .pem-select-label select {
  width: 100%;
  min-height: 32px;
  border: 1px solid var(--pem-line);
  border-radius: 5px;
  padding: 6px 8px;
  background: var(--pem-shell);
  color: var(--pem-text);
}
.pem-filter-row { display: flex; gap: 4px; }
.pem-filter-row button, .pem-pause {
  min-height: 32px;
  border: 1px solid var(--pem-line);
  border-radius: 999px;
  padding: 4px 8px;
  color: var(--pem-muted);
  font-size: 11px;
  text-transform: capitalize;
}
.pem-filter-row button[aria-pressed="true"], .pem-pause[aria-pressed="true"] {
  border-color: var(--pem-accent);
  background: var(--pem-shell);
  color: var(--pem-accent);
}
.pem-scroll-list { min-height: 0; flex: 1; overflow: auto; scrollbar-color: var(--pem-line) var(--pem-surface); }
.pem-virtual-space, .pem-virtual-row { position: relative; width: 100%; }
.pem-virtual-row { position: absolute; inset: 0 0 auto; }
.pem-entity-row, .pem-view-row, .pem-event-row, .pem-membership-row,
.pem-compact-list button {
  width: 100%;
  border: 0;
  border-radius: 4px;
  background: var(--pem-surface);
  text-align: left;
  cursor: pointer;
}
.pem-entity-row, .pem-view-row, .pem-event-row {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 8px;
}
.pem-entity-row:hover, .pem-view-row:hover, .pem-event-row:hover,
.pem-membership-row:hover, .pem-compact-list button:hover { background: var(--pem-elevated); }
.pem-entity-row[data-selected="true"], .pem-view-row[data-selected="true"],
.pem-event-row[data-selected="true"] {
  background: var(--pem-elevated);
  box-shadow: inset 2px 0 var(--pem-accent);
}
.pem-entity-row[data-causal="true"], .pem-view-row[data-causal="true"],
.pem-membership-row[data-causal="true"], .pem-compact-list li[data-causal="true"] {
  box-shadow: inset 2px 0 var(--pem-accent);
  background: var(--pem-surface);
}
.pem-entity-copy, .pem-event-copy { display: grid; min-width: 0; }
.pem-entity-copy strong, .pem-event-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.pem-entity-copy code, .pem-event-copy small, .pem-view-row code {
  overflow: hidden;
  color: var(--pem-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pem-row-signals, .pem-status-cluster {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  color: var(--pem-muted);
  font-size: 11px;
}
.pem-entity-detail, .pem-view-detail, .pem-activity-detail { overflow: auto; padding: 16px; scrollbar-color: var(--pem-line) var(--pem-shell); }
.pem-entity-detail article > section, .pem-view-detail article > section,
.pem-activity-detail article > section { content-visibility: auto; contain-intrinsic-size: 120px; }
.pem-entity-confirmation { margin: -4px 0 12px; font-size: 11px; }
.pem-detail-header { margin-bottom: 12px; }
.pem-dirty-summary { margin-top: 4px; font-size: 12px; }
.pem-detail-tools { display: grid; justify-items: end; gap: 8px; }
.pem-detail-header h2 code { color: var(--pem-muted); font-size: .75em; font-weight: 500; }
.pem-error, .pem-expired {
  display: grid;
  gap: 2px;
  margin-bottom: 12px;
  border: 1px solid var(--pem-del);
  border-radius: 5px;
  padding: 8px 12px;
  background: var(--pem-surface);
  color: var(--pem-text);
}
.pem-error strong, .pem-expired strong { color: var(--pem-del); }

.pem-value-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--pem-line); }
.pem-value-tabs button {
  min-height: 32px;
  padding: 6px 8px;
  border-bottom: 2px solid transparent;
  color: var(--pem-muted);
  text-transform: capitalize;
}
.pem-value-tabs button[aria-selected="true"] { border-color: var(--pem-accent); color: var(--pem-text); }
.pem-value-panel {
  min-height: 160px;
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--pem-line);
  border-top: 0;
  border-radius: 0 0 5px 5px;
  background: var(--pem-shell);
  scrollbar-color: var(--pem-line) var(--pem-shell);
}
.pem-value {
  overflow: auto;
  margin: 0;
  padding: 12px;
  color: var(--pem-code);
  font-size: 11px;
  line-height: 1.55;
  font-variant-numeric: tabular-nums;
  white-space: pre-wrap;
  word-break: break-word;
}
.pem-preview-panel {
  margin-top: 12px;
  border: 1px solid var(--pem-line);
  border-radius: 6px;
  padding: 12px;
  background: var(--pem-surface);
}
.pem-preview-editor { display: grid; gap: 4px; color: var(--pem-muted); font-size: 11px; }
.pem-preview-editor textarea {
  min-height: 84px;
  resize: vertical;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 8px;
  background: var(--pem-shell);
  color: var(--pem-code);
  font: 11px/1.5 var(--pem-font-mono);
}
.pem-inline-error { margin-top: 8px; color: var(--pem-del); font-size: 11px; }
.pem-preview-diff { margin-top: 8px; border: 1px solid var(--pem-line); border-radius: 4px; overflow: hidden; }
.pem-preview-diff > p { padding: 6px 8px; background: var(--pem-elevated); color: var(--pem-muted); font-size: 11px; }
.pem-preview-actions { justify-content: flex-start; margin-top: 8px; }
.pem-preview-receipt { margin-top: 8px; color: var(--pem-muted); font-size: 11px; }
.pem-diff-table { display: grid; }
.pem-diff-row {
  display: grid;
  grid-template-columns: minmax(90px, .65fr) repeat(2, minmax(120px, 1fr));
  border-top: 1px solid var(--pem-line);
}
.pem-diff-row:first-child { border-top: 0; }
.pem-diff-row > * {
  min-width: 0;
  padding: 6px 8px;
  overflow-wrap: anywhere;
  font: 11px/1.4 var(--pem-font-mono);
  font-variant-numeric: tabular-nums;
}
.pem-diff-head { color: var(--pem-muted); background: var(--pem-elevated); font-weight: 700; }
.pem-diff-row[data-kind="changed"] > :first-child { color: var(--pem-mod); }
.pem-diff-row[data-kind="added"] > :first-child { color: var(--pem-add); }
.pem-diff-row[data-kind="removed"] > :first-child { color: var(--pem-del); }

.pem-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.pem-causal-rail {
  min-width: 0;
  overflow: auto;
  border-left: 1px solid var(--pem-line);
  padding: 12px 8px;
  background: var(--pem-surface);
  scrollbar-color: var(--pem-line) var(--pem-surface);
}
.pem-causal-rail[data-collapsed="true"] { overflow: hidden; padding: 8px 4px; }
.pem-causal-heading { display: flex; align-items: start; justify-content: space-between; gap: 8px; }
.pem-causal-heading h2 { font-size: 15px; }
.pem-causal-path { display: grid; gap: 0; margin-top: 12px; }
.pem-causal-path li {
  position: relative;
  display: grid;
  gap: 4px;
  border-left: 1px solid var(--pem-line);
  padding: 0 0 12px 12px;
}
.pem-causal-path li::before {
  position: absolute;
  top: 2px;
  left: -4px;
  width: 7px;
  height: 7px;
  border: 1px solid var(--pem-accent);
  border-radius: 50%;
  background: var(--pem-surface);
  content: "";
}
.pem-causal-path li > span { color: var(--pem-accent); font-size: 11px; font-weight: 700; text-transform: uppercase; }
.pem-causal-path button, .pem-causal-path code {
  display: grid;
  width: 100%;
  border: 0;
  padding: 2px 0;
  background: transparent;
  color: var(--pem-code);
  text-align: left;
  overflow-wrap: anywhere;
  font-size: 11px;
}
.pem-causal-path button { min-height: 32px; cursor: pointer; }
.pem-causal-path small { color: var(--pem-muted); font-size: 11px; }
.pem-compact-list { display: grid; gap: 2px; }
.pem-compact-list button, .pem-membership-row { display: grid; gap: 2px; padding: 6px; }
.pem-compact-list button { min-height: 32px; }
.pem-compact-list code, .pem-compact-list small, .pem-membership-row code {
  color: var(--pem-muted);
  font-size: 11px;
}
.pem-view-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 12px; }
.pem-readout { min-height: 70px; }
.pem-list-health { margin-bottom: 12px; }
.pem-membership .pem-scroll-list { max-height: min(420px, 50vh); }
.pem-membership-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}
.pem-membership-list:has(> .pem-virtual-space) { display: block; }
.pem-membership-row { border: 1px solid var(--pem-line); background: var(--pem-surface); }
.pem-membership-position { color: var(--pem-accent); font: 11px var(--pem-font-mono); font-variant-numeric: tabular-nums; }
.pem-last-change { margin-bottom: 12px; }
.pem-last-change-readout { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; }
.pem-last-change-readout code { grid-column: 1 / -1; color: var(--pem-muted); font-size: 11px; overflow-wrap: anywhere; }
.pem-activity-heading { align-items: start; }
.pem-select-label { display: grid; gap: 4px; color: var(--pem-muted); font-size: 11px; }
.pem-event-row { min-height: 50px; justify-content: start; }
.pem-correlation { color: var(--pem-muted); font-size: 11px; }
.pem-event-sequence {
  flex: 0 0 42px;
  color: var(--pem-accent);
  font: 11px var(--pem-font-mono);
  font-variant-numeric: tabular-nums;
}
.pem-time-travel {
  border: 1px solid var(--pem-line);
  border-radius: 5px;
  padding: 8px;
  background: var(--pem-surface);
}
.pem-time-travel .pem-card-heading { margin-bottom: 8px; }
.pem-time-travel-controls { display: grid; gap: 8px; }
.pem-time-travel-controls p { color: var(--pem-muted); font-size: 11px; }
.pem-event-readouts { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 12px; }
.pem-event-readouts div { border: 1px solid var(--pem-line); border-radius: 4px; padding: 8px; }
.pem-change-list { display: grid; gap: 4px; }
.pem-change-list li {
  display: grid;
  grid-template-columns: 70px minmax(120px, .8fr) minmax(0, 1fr);
  gap: 8px;
  border-top: 1px solid var(--pem-line);
  padding: 6px 0;
}
.pem-retention-warning {
  margin-bottom: 8px;
  border-left: 2px solid var(--pem-mod);
  padding: 6px 8px;
  background: var(--pem-surface);
  color: var(--pem-text);
  font-size: 11px;
}
.pem-impact-readouts { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 8px; }
.pem-impact-identities { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }
.pem-impact-identities strong { color: var(--pem-muted); font-size: 11px; }
.pem-impact-identities code { border: 1px solid var(--pem-line); border-radius: 3px; padding: 2px 4px; font-size: 11px; }

.pem-graph-pulse {
  display: grid;
  grid-template-columns: auto minmax(120px, 1fr) minmax(190px, .45fr);
  min-height: 54px;
  align-items: center;
  gap: 8px;
  border-top: 1px solid var(--pem-line);
  padding: 8px 12px;
  background: var(--pem-shell);
}
.pem-graph-pulse[data-collapsed="true"] { grid-template-columns: auto; min-height: 36px; }
.pem-pulse-toggle {
  min-height: 32px;
  border: 1px solid var(--pem-line);
  border-radius: 4px;
  padding: 4px 8px;
  background: var(--pem-elevated);
  color: var(--pem-accent);
  cursor: pointer;
  font-weight: 600;
}
.pem-pulse-segments { display: flex; min-width: 0; align-items: stretch; gap: 2px; overflow-x: auto; scrollbar-color: var(--pem-line) var(--pem-shell); }
.pem-pulse-segments li { flex: 1 0 32px; max-width: 48px; }
.pem-pulse-segments button {
  display: grid;
  width: 100%;
  min-height: 32px;
  place-items: center;
  border: 0;
  border-bottom: 2px solid var(--pem-muted);
  background: var(--pem-shell);
  color: var(--pem-muted);
  cursor: pointer;
}
.pem-pulse-segments button[data-event-type="mutation"] { border-color: var(--pem-accent); }
.pem-pulse-segments button[data-selected="true"] { background: var(--pem-elevated); color: var(--pem-text); }
.pem-pulse-segments button > span { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pem-pulse-segments small { font-size: 11px; font-variant-numeric: tabular-nums; }
.pem-pulse-empty { color: var(--pem-muted); font-size: 11px; }
.pem-pulse-readout { display: grid; min-width: 0; }
.pem-pulse-readout strong, .pem-pulse-readout span, .pem-pulse-readout code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pem-pulse-readout span, .pem-pulse-readout code { color: var(--pem-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.pem-empty { padding: 8px 2px; font-size: 11px; }
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
  border: 1px solid var(--pem-line);
  border-radius: var(--pem-radius-panel);
  padding: 12px 16px;
  background: var(--pem-shell);
  color: var(--pem-text);
  box-shadow: 0 16px 48px rgb(0 0 0 / 36%);
  font-size: 13px;
  line-height: 1.4;
}

.pem-mobile-back { display: none; min-height: 32px; }

/* Layout breakpoints follow the panel's own width, not the viewport. */
@container (width < 900px) {
  .pem-entity-workspace,
  .pem-entity-workspace[data-causal-rail-collapsed="true"] {
    grid-template-columns: 286px minmax(0, 1fr);
  }
  .pem-entity-workspace[data-navigator-collapsed="true"],
  .pem-entity-workspace[data-navigator-collapsed="true"][data-causal-rail-collapsed="true"] {
    grid-template-columns: 40px minmax(0, 1fr);
  }
  .pem-causal-rail { display: none; }
}

@container (width < 640px) {
  .pem-inspector { font-size: 12px; }
  .pem-shell-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    padding: 8px 12px;
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
  .pem-store-select select { max-width: none; flex: 1; }
  .pem-metric-grid, .pem-view-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pem-overview-grid, .pem-detail-grid { grid-template-columns: 1fr; }
  .pem-entity-workspace, .pem-view-workspace, .pem-activity-workspace {
    display: block;
    overflow: hidden;
  }
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
    border: 1px solid var(--pem-line);
    border-radius: 4px;
    margin-bottom: 8px;
    padding: 6px 12px;
    background: var(--pem-surface);
    color: var(--pem-text);
    cursor: pointer;
  }
  .pem-detail-header { align-items: flex-start; flex-direction: column; }
  .pem-detail-tools { width: 100%; justify-items: start; }
  .pem-detail-actions { justify-content: flex-start; }
  .pem-value-tabs { overflow-x: auto; }
  .pem-value-tabs button { flex: 0 0 auto; }
  .pem-value-panel { max-height: 42vh; }
  .pem-preview-panel { padding: 8px; }
  .pem-preview-editor textarea { min-height: 120px; }
  .pem-preview-diff { overflow-x: auto; }
  .pem-diff-table { min-width: 520px; }
  .pem-membership-list { grid-template-columns: 1fr; }
  .pem-event-readouts { grid-template-columns: 1fr; }
  .pem-change-list li { grid-template-columns: 62px minmax(0, 1fr); }
  .pem-change-list li small { grid-column: 2; }
}

/* Viewport-bound rules only: the full-screen frame, safe areas and touch targets. */
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
  .pem-panel-toolbar button, .pem-launcher-settings,
  .pem-primary-action, .pem-secondary-action, .pem-detail-actions button,
  .pem-time-travel-controls button,
  .pem-rail-collapse, .pem-rail-restore,
  .pem-filter-row button, .pem-pause,
  .pem-workspace-tabs button, .pem-value-tabs button,
  .pem-shell-status > button, .pem-rewound-bar button,
  .pem-command-feedback button, .pem-causal-path button,
  .pem-pulse-segments button, .pem-pulse-toggle,
  .pem-store-select select,
  .pem-settings fieldset button, .pem-settings-hide button, .pem-settings header button, .pem-settings select,
  .pem-trace-list button, .pem-compact-list button, .pem-mobile-back {
    min-width: 44px;
    min-height: 44px;
  }
  .pem-settings { position: fixed; top: calc(52px + env(safe-area-inset-top)); right: 16px; left: 16px; width: auto; }
  .pem-settings fieldset, .pem-settings-hide { grid-template-columns: 1fr; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
`;
