import { describe, expect, it } from "vitest";

import {
  DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT,
  entityGraphDevtoolsAriaShortcut,
  isEditableShortcutTarget,
  matchesEntityGraphDevtoolsShortcut,
} from "./preferences";

function keyEvent(init: KeyboardEventInit & { target?: Element | null }): KeyboardEvent {
  const event = new KeyboardEvent("keydown", init);
  if (init.target !== undefined) Object.defineProperty(event, "target", { value: init.target });
  return event;
}

/**
 * Mod+Shift+G was the previous default: on macOS that is the browser's "Find previous", and the
 * host blocked it globally with preventDefault, even while the user typed in a form field.
 * The shortcut defaults to Alt+Shift+E and never fires from an editable element.
 */
describe("DevTools shortcut", () => {
  it("defaults to Alt+Shift+E", () => {
    expect(DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT).toEqual({ key: "e", modifier: "alt", shiftKey: true });
  });

  it("matches the alt modifier and still rejects Mod+Shift+G", () => {
    const shortcut = DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT;
    expect(matchesEntityGraphDevtoolsShortcut(keyEvent({ key: "E", altKey: true, shiftKey: true }), shortcut)).toBe(true);
    expect(matchesEntityGraphDevtoolsShortcut(keyEvent({ key: "e", altKey: true, shiftKey: true, metaKey: true }), shortcut)).toBe(false);
    expect(matchesEntityGraphDevtoolsShortcut(keyEvent({ key: "g", metaKey: true, shiftKey: true }), shortcut)).toBe(false);
  });

  it("keeps the legacy mod shortcut working when an app configured it", () => {
    const legacy = { key: "g", modifier: "mod", shiftKey: true } as const;
    expect(matchesEntityGraphDevtoolsShortcut(keyEvent({ key: "g", metaKey: true, shiftKey: true }), legacy)).toBe(true);
    expect(matchesEntityGraphDevtoolsShortcut(keyEvent({ key: "g", ctrlKey: true, shiftKey: true }), legacy)).toBe(true);
  });

  it("formats the alt shortcut for aria-keyshortcuts", () => {
    expect(entityGraphDevtoolsAriaShortcut(DEFAULT_ENTITY_GRAPH_DEVTOOLS_SHORTCUT)).toBe("Alt+Shift+E");
  });

  it("recognises editable targets so the host can ignore them", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const button = document.createElement("button");
    expect(isEditableShortcutTarget(input)).toBe(true);
    expect(isEditableShortcutTarget(textarea)).toBe(true);
    expect(isEditableShortcutTarget(editable)).toBe(true);
    expect(isEditableShortcutTarget(button)).toBe(false);
    expect(isEditableShortcutTarget(null)).toBe(false);
  });
});
