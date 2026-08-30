import {
  Suspense,
  createElement,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import type { AttachGraphDevtoolsOptions } from "@prometheus-ags/entity-graph-core/devtools";
import {
  EntityGraphDevtoolsProvider,
  useEntityGraphDevtoolsSnapshot,
  type EntityGraphDevtoolsStoreDefinition,
} from "./provider";
import { isEntityGraphDevtoolsEnabled, type EntityGraphDevtoolsMode } from "./mode";
import {
  DEFAULT_ENTITY_GRAPH_DEVTOOLS_PREFERENCES,
  DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT,
  ENTITY_GRAPH_DEVTOOLS_PREFERENCE_KEY,
  entityGraphDevtoolsAriaShortcut,
  matchesEntityGraphDevtoolsShortcut,
  readEntityGraphDevtoolsPreferences,
  writeEntityGraphDevtoolsPreferences,
  type EntityGraphDevtoolsPanelLayout,
  type EntityGraphDevtoolsPreferences,
  type EntityGraphDevtoolsShortcut,
} from "./preferences";
import { ENTITY_GRAPH_DEVTOOLS_STYLES } from "./styles";
import type { EntityGraphInspectorStateAdapter } from "./state";

let inspectorEntry: ReturnType<typeof importInspector> | null = null;

function importInspector() {
  return import("./inspector-entry");
}

function loadInspector() {
  inspectorEntry ??= importInspector();
  return inspectorEntry;
}

const LazyInspector = lazy(loadInspector);

/** Preload the optional inspector chunk after the host has established enablement. */
export function preloadEntityGraphDevtools(): Promise<unknown> {
  return loadInspector();
}

export interface EntityGraphDevtoolsProps {
  mode?: EntityGraphDevtoolsMode;
  store?: GraphStore;
  stores?: readonly EntityGraphDevtoolsStoreDefinition[];
  options?: Omit<AttachGraphDevtoolsOptions, "enabled">;
  fallback?: ReactNode;
  preferenceKey?: string;
  shortcut?: EntityGraphDevtoolsShortcut | false;
  stateAdapter?: EntityGraphInspectorStateAdapter;
  enableWindowBridge?: boolean;
}

/** SSR-safe explicit host that isolates the opt-in launcher and lazy inspector in one Shadow Root. */
export function EntityGraphDevtools({
  mode = "auto",
  store,
  stores,
  options,
  fallback = <div className="pem-devtools-loading" role="status">Loading Graph DevTools…</div>,
  preferenceKey = ENTITY_GRAPH_DEVTOOLS_PREFERENCE_KEY,
  shortcut = DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT,
  stateAdapter,
  enableWindowBridge = true,
}: EntityGraphDevtoolsProps) {
  const enabled = isEntityGraphDevtoolsEnabled(mode);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    const root = hostRef.current.shadowRoot ?? hostRef.current.attachShadow({ mode: "open" });
    if (!root.querySelector("style[data-pem-devtools-styles]")) {
      const style = document.createElement("style");
      style.dataset.pemDevtoolsStyles = "";
      style.textContent = ENTITY_GRAPH_DEVTOOLS_STYLES;
      root.prepend(style);
    }
    setShadowRoot(root);
  }, [enabled]);

  if (!enabled) return null;

  return createElement(
    "div",
    { ref: hostRef, "data-pem-devtools-host": "" },
    shadowRoot && createPortal(
      <EntityGraphDevtoolsProvider
        store={store}
        stores={stores}
        options={options}
        enableWindowBridge={enableWindowBridge}
      >
        <EntityGraphDevtoolsSurface
          fallback={fallback}
          preferenceKey={preferenceKey}
          shortcut={shortcut}
          stateAdapter={stateAdapter}
        />
      </EntityGraphDevtoolsProvider>,
      shadowRoot,
    ),
  );
}

interface EntityGraphDevtoolsSurfaceProps {
  fallback: ReactNode;
  preferenceKey: string;
  shortcut: EntityGraphDevtoolsShortcut | false;
  stateAdapter?: EntityGraphInspectorStateAdapter;
}

function EntityGraphDevtoolsSurface({
  fallback,
  preferenceKey,
  shortcut,
  stateAdapter,
}: EntityGraphDevtoolsSurfaceProps) {
  const snapshot = useEntityGraphDevtoolsSnapshot();
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [preferences, setPreferences] = useState<EntityGraphDevtoolsPreferences>(
    DEFAULT_ENTITY_GRAPH_DEVTOOLS_PREFERENCES,
  );
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [hiddenUntilReload, setHiddenUntilReload] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const resolvedShortcut = useMemo<Required<EntityGraphDevtoolsShortcut> | null>(() => {
    if (shortcut === false) return null;
    return {
      key: shortcut.key ?? DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT.key,
      modifier: shortcut.modifier ?? DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT.modifier,
      shiftKey: shortcut.shiftKey ?? DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT.shiftKey,
    };
  }, [shortcut]);
  const shortcutLabel = resolvedShortcut
    ? entityGraphDevtoolsAriaShortcut(resolvedShortcut)
    : undefined;
  const visible = preferencesReady && !hiddenUntilReload && !preferences.hiddenForBrowser;
  const attentionCount = (snapshot?.counts.patchedEntities ?? 0) + (snapshot?.counts.errors ?? 0);

  useEffect(() => {
    setPreferences(readEntityGraphDevtoolsPreferences(preferenceKey));
    setPreferencesReady(true);
  }, [preferenceKey]);

  const updatePreferences = useCallback((
    update: Partial<Omit<EntityGraphDevtoolsPreferences, "version">>,
  ) => {
    setPreferences((current) => {
      const next = { ...current, ...update, version: 1 } as EntityGraphDevtoolsPreferences;
      writeEntityGraphDevtoolsPreferences(next, preferenceKey);
      return next;
    });
  }, [preferenceKey]);

  const openPanel = useCallback(() => {
    setHiddenUntilReload(false);
    updatePreferences({ hiddenForBrowser: false });
    setPanelOpen(true);
  }, [updatePreferences]);

  const closePanel = useCallback(() => {
    setSettingsOpen(false);
    setPanelOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    requestAnimationFrame(() => settingsTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!resolvedShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchesEntityGraphDevtoolsShortcut(event, resolvedShortcut)) return;
      event.preventDefault();
      if (panelOpen && visible) closePanel();
      else openPanel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closePanel, openPanel, panelOpen, resolvedShortcut, visible]);

  useEffect(() => {
    if (!panelOpen) return;
    requestAnimationFrame(() => panelRef.current?.focus());
  }, [panelOpen]);

  const onSurfaceKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    if (settingsOpen) closeSettings();
    else if (panelOpen) closePanel();
  };

  const hideUntilReload = () => {
    setSettingsOpen(false);
    setPanelOpen(false);
    setHiddenUntilReload(true);
  };

  const hideForBrowser = () => {
    setSettingsOpen(false);
    setPanelOpen(false);
    updatePreferences({ hiddenForBrowser: true });
  };

  if (!preferencesReady) return null;

  return (
    <div className="pem-devtools-surface" onKeyDown={onSurfaceKeyDown}>
      {visible && (
        <div
          className="pem-launcher-slot"
          data-position={preferences.launcherPosition}
          data-form={preferences.launcherForm}
        >
          <button
            ref={launcherRef}
            type="button"
            className="pem-launcher"
            aria-label={`${panelOpen ? "Close" : "Open"} Prometheus Graph DevTools${attentionCount > 0 ? `, ${attentionCount} dirty entities or errors` : ""}`}
            aria-keyshortcuts={shortcutLabel}
            aria-expanded={panelOpen}
            aria-controls="pem-devtools-panel"
            onClick={() => panelOpen ? closePanel() : openPanel()}
            onFocus={() => void preloadEntityGraphDevtools()}
            onPointerEnter={() => void preloadEntityGraphDevtools()}
          >
            <span className="pem-launcher-mark" aria-hidden="true">P</span>
            <span className="pem-launcher-label">Graph</span>
            {attentionCount > 0 && (
              <span className="pem-launcher-badge" aria-hidden="true">
                {new Intl.NumberFormat().format(attentionCount)}
              </span>
            )}
          </button>
          {!panelOpen && (
            <button
              ref={settingsTriggerRef}
              type="button"
              className="pem-launcher-settings"
              aria-label="Configure Graph DevTools launcher"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((current) => !current)}
            >
              ⚙
            </button>
          )}
          {!panelOpen && settingsOpen && (
            <DevtoolsSettings
              preferences={preferences}
              shortcutLabel={shortcutLabel}
              onUpdate={updatePreferences}
              onHideUntilReload={hideUntilReload}
              onHideForBrowser={hideForBrowser}
              onClose={closeSettings}
            />
          )}
        </div>
      )}

      {visible && panelOpen && (
        <section
          ref={panelRef}
          id="pem-devtools-panel"
          className="pem-panel-frame"
          data-layout={preferences.panelLayout}
          role="dialog"
          aria-modal="false"
          aria-label="Prometheus Graph DevTools"
          tabIndex={-1}
        >
          <div className="pem-panel-toolbar">
            <span>Graph DevTools</span>
            <div>
              <button
                ref={settingsTriggerRef}
                type="button"
                aria-label="Configure Graph DevTools panel"
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((current) => !current)}
              >
                ⚙
              </button>
              <button type="button" aria-label="Close Graph DevTools" onClick={closePanel}>×</button>
            </div>
          </div>
          {settingsOpen && (
            <DevtoolsSettings
              preferences={preferences}
              shortcutLabel={shortcutLabel}
              onUpdate={updatePreferences}
              onHideUntilReload={hideUntilReload}
              onHideForBrowser={hideForBrowser}
              onClose={closeSettings}
            />
          )}
          <div className="pem-panel-content">
            <Suspense fallback={fallback}>
              <LazyInspector stateAdapter={stateAdapter} />
            </Suspense>
          </div>
        </section>
      )}
    </div>
  );
}

interface DevtoolsSettingsProps {
  preferences: EntityGraphDevtoolsPreferences;
  shortcutLabel?: string;
  onUpdate(update: Partial<Omit<EntityGraphDevtoolsPreferences, "version">>): void;
  onHideUntilReload(): void;
  onHideForBrowser(): void;
  onClose(): void;
}

function DevtoolsSettings({
  preferences,
  shortcutLabel,
  onUpdate,
  onHideUntilReload,
  onHideForBrowser,
  onClose,
}: DevtoolsSettingsProps) {
  return (
    <section className="pem-settings" role="dialog" aria-label="Graph DevTools display settings">
      <header>
        <strong>Display settings</strong>
        <button type="button" aria-label="Close display settings" onClick={onClose}>×</button>
      </header>
      <label>
        <span>Launcher position</span>
        <select
          value={preferences.launcherPosition}
          onChange={(event) => onUpdate({
            launcherPosition: event.currentTarget.value as EntityGraphDevtoolsPreferences["launcherPosition"],
          })}
        >
          <option value="top-left">Top left</option>
          <option value="top-right">Top right</option>
          <option value="bottom-left">Bottom left</option>
          <option value="bottom-right">Bottom right</option>
        </select>
      </label>
      <label>
        <span>Launcher form</span>
        <select
          value={preferences.launcherForm}
          onChange={(event) => onUpdate({
            launcherForm: event.currentTarget.value as EntityGraphDevtoolsPreferences["launcherForm"],
          })}
        >
          <option value="button">Floating button</option>
          <option value="edge-tab">Compact edge tab</option>
        </select>
      </label>
      <fieldset>
        <legend>Panel layout</legend>
        {(["floating", "dock-right", "dock-bottom"] as const).map((layout: EntityGraphDevtoolsPanelLayout) => (
          <button
            type="button"
            key={layout}
            aria-pressed={preferences.panelLayout === layout}
            onClick={() => onUpdate({ panelLayout: layout })}
          >
            {layout.replace("-", " ")}
          </button>
        ))}
      </fieldset>
      {shortcutLabel && <p>Toggle with <kbd>{shortcutLabel}</kbd></p>}
      <div className="pem-settings-hide">
        <button type="button" onClick={onHideUntilReload}>Hide until reload</button>
        <button type="button" onClick={onHideForBrowser}>Hide for this browser</button>
      </div>
    </section>
  );
}
