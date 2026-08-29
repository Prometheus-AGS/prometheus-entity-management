export type EntityGraphDevtoolsLauncherPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type EntityGraphDevtoolsLauncherForm = "button" | "edge-tab";
export type EntityGraphDevtoolsPanelLayout = "floating" | "dock-right" | "dock-bottom";

export interface EntityGraphDevtoolsPreferences {
  version: 1;
  hiddenForBrowser: boolean;
  launcherPosition: EntityGraphDevtoolsLauncherPosition;
  launcherForm: EntityGraphDevtoolsLauncherForm;
  panelLayout: EntityGraphDevtoolsPanelLayout;
}

/** Default versioned browser key for non-business launcher and panel preferences. */
export const ENTITY_GRAPH_DEVTOOLS_PREFERENCE_KEY =
  "prometheus.entity-graph.devtools.preferences.v1";

/** Default visible bottom-right launcher and floating panel preferences. */
export const DEFAULT_ENTITY_GRAPH_DEVTOOLS_PREFERENCES: EntityGraphDevtoolsPreferences = {
  version: 1,
  hiddenForBrowser: false,
  launcherPosition: "bottom-right",
  launcherForm: "button",
  panelLayout: "floating",
};

const positions: readonly EntityGraphDevtoolsLauncherPosition[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];
const forms: readonly EntityGraphDevtoolsLauncherForm[] = ["button", "edge-tab"];
const layouts: readonly EntityGraphDevtoolsPanelLayout[] = ["floating", "dock-right", "dock-bottom"];

/** Read and normalize version 1 display preferences from browser-local storage. */
export function readEntityGraphDevtoolsPreferences(
  key = ENTITY_GRAPH_DEVTOOLS_PREFERENCE_KEY,
): EntityGraphDevtoolsPreferences {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(key) ?? "null");
    if (typeof parsed !== "object" || parsed === null || (parsed as { version?: unknown }).version !== 1) {
      return DEFAULT_ENTITY_GRAPH_DEVTOOLS_PREFERENCES;
    }
    const candidate = parsed as Partial<EntityGraphDevtoolsPreferences>;
    return {
      version: 1,
      hiddenForBrowser: candidate.hiddenForBrowser === true,
      launcherPosition: positions.includes(candidate.launcherPosition as EntityGraphDevtoolsLauncherPosition)
        ? candidate.launcherPosition as EntityGraphDevtoolsLauncherPosition
        : DEFAULT_ENTITY_GRAPH_DEVTOOLS_PREFERENCES.launcherPosition,
      launcherForm: forms.includes(candidate.launcherForm as EntityGraphDevtoolsLauncherForm)
        ? candidate.launcherForm as EntityGraphDevtoolsLauncherForm
        : DEFAULT_ENTITY_GRAPH_DEVTOOLS_PREFERENCES.launcherForm,
      panelLayout: layouts.includes(candidate.panelLayout as EntityGraphDevtoolsPanelLayout)
        ? candidate.panelLayout as EntityGraphDevtoolsPanelLayout
        : DEFAULT_ENTITY_GRAPH_DEVTOOLS_PREFERENCES.panelLayout,
    };
  } catch {
    return DEFAULT_ENTITY_GRAPH_DEVTOOLS_PREFERENCES;
  }
}

/** Persist version 1 display preferences without storing graph or entity values. */
export function writeEntityGraphDevtoolsPreferences(
  preferences: EntityGraphDevtoolsPreferences,
  key = ENTITY_GRAPH_DEVTOOLS_PREFERENCE_KEY,
): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export interface EntityGraphDevtoolsShortcut {
  key?: string;
  modifier?: "mod" | "control" | "meta";
  shiftKey?: boolean;
}

/** Default cross-platform restore/toggle shortcut: Ctrl/Cmd+Shift+G. */
export const DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT: Required<EntityGraphDevtoolsShortcut> = {
  key: "g",
  modifier: "mod",
  shiftKey: true,
};

/** Return whether a keyboard event matches the configured DevTools shortcut. */
export function matchesEntityGraphDevtoolsShortcut(
  event: KeyboardEvent,
  shortcut: Required<EntityGraphDevtoolsShortcut>,
): boolean {
  const modifierMatches = shortcut.modifier === "control"
    ? event.ctrlKey && !event.metaKey
    : shortcut.modifier === "meta"
      ? event.metaKey && !event.ctrlKey
      : event.ctrlKey !== event.metaKey;
  return modifierMatches &&
    event.shiftKey === shortcut.shiftKey &&
    !event.altKey &&
    event.key.toLocaleLowerCase() === shortcut.key.toLocaleLowerCase();
}

/** Format a shortcut for the `aria-keyshortcuts` attribute. */
export function entityGraphDevtoolsAriaShortcut(
  shortcut: Required<EntityGraphDevtoolsShortcut>,
): string {
  const prefix = shortcut.modifier === "control"
    ? "Control"
    : shortcut.modifier === "meta"
      ? "Meta"
      : "Control";
  const ariaShortcut = [prefix, ...(shortcut.shiftKey ? ["Shift"] : []), shortcut.key.toLocaleUpperCase()].join("+");
  if (shortcut.modifier !== "mod") return ariaShortcut;
  return `${ariaShortcut} ${ariaShortcut.replace("Control", "Meta")}`;
}
