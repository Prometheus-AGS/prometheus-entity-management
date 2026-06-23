import React from "react";
import ReactDOM from "react-dom";
import { useEntityExplorer } from "./context";

/**
 * Floating Action Button — portal-mounted into document.body.
 * Toggles the Entity Explorer panel. Keyboard shortcut: Alt+Shift+E (wired in provider).
 */
export function EntityExplorerFAB() {
  const { state, dispatch } = useEntityExplorer();

  const button = (
    <button
      className="ee-fab"
      aria-label={state.open ? "Close Entity Explorer" : "Open Entity Explorer"}
      aria-expanded={state.open}
      onClick={() => dispatch({ type: "TOGGLE" })}
      title="Entity Explorer (Alt+Shift+E)"
    >
      EE
    </button>
  );

  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(button, document.body);
}
