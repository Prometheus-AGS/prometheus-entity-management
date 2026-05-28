import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { createDevtoolsEventBus, type DevtoolsEventBus } from "../../devtools-event-bus";

// ── State & actions ────────────────────────────────────────────────────────────

export interface EntityExplorerState {
  open: boolean;
  activeTab: "entities" | "patches" | "events" | "performance";
  selectedEntityId: string | null;
  selectedEntityType: string | null;
}

export type EntityExplorerAction =
  | { type: "TOGGLE" }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_TAB"; tab: EntityExplorerState["activeTab"] }
  | { type: "SELECT_ENTITY"; entityType: string; id: string }
  | { type: "CLEAR_SELECTION" };

const initialState: EntityExplorerState = {
  open: false,
  activeTab: "entities",
  selectedEntityId: null,
  selectedEntityType: null,
};

function reducer(state: EntityExplorerState, action: EntityExplorerAction): EntityExplorerState {
  switch (action.type) {
    case "TOGGLE": return { ...state, open: !state.open };
    case "OPEN":   return { ...state, open: true };
    case "CLOSE":  return { ...state, open: false };
    case "SET_TAB":
      return { ...state, activeTab: action.tab, selectedEntityId: null, selectedEntityType: null };
    case "SELECT_ENTITY":
      return { ...state, selectedEntityId: action.id, selectedEntityType: action.entityType };
    case "CLEAR_SELECTION":
      return { ...state, selectedEntityId: null, selectedEntityType: null };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

interface EntityExplorerContextValue {
  state: EntityExplorerState;
  dispatch: React.Dispatch<EntityExplorerAction>;
  bus: DevtoolsEventBus;
}

const EntityExplorerContext = createContext<EntityExplorerContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

interface EntityExplorerProviderProps {
  children: ReactNode;
  busOptions?: Parameters<typeof createDevtoolsEventBus>[0];
  /**
   * When true, each DevtoolsEvent is re-broadcast via `window.postMessage`
   * with `{ type: "__entity_explorer_event__", payload: event }`.
   * Enables the Chrome MV3 extension content-script bridge without requiring
   * MAIN-world script injection from the extension side.
   */
  enableWindowBridge?: boolean;
}

export function EntityExplorerProvider({ children, busOptions, enableWindowBridge }: EntityExplorerProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Create bus once; destroy on unmount
  const busRef = useRef<DevtoolsEventBus | null>(null);
  if (!busRef.current) {
    busRef.current = createDevtoolsEventBus(busOptions ?? { bufferSize: 500, coalesceBurstThreshold: 10 });
  }

  // Keyboard shortcut: Alt+Shift+E
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.shiftKey && e.key === "E") {
        dispatch({ type: "TOGGLE" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Optional window.postMessage bridge for Chrome MV3 extension content-script relay
  useEffect(() => {
    if (!enableWindowBridge || !busRef.current) return;
    const unsubscribe = busRef.current.subscribe((event) => {
      window.postMessage({ type: "__entity_explorer_event__", payload: event }, "*");
    });
    return unsubscribe;
  }, [enableWindowBridge]);

  // Destroy bus on unmount
  useEffect(() => {
    return () => {
      busRef.current?.destroy();
    };
  }, []);

  return (
    <EntityExplorerContext.Provider value={{ state, dispatch, bus: busRef.current }}>
      {children}
    </EntityExplorerContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useEntityExplorer(): EntityExplorerContextValue {
  const ctx = useContext(EntityExplorerContext);
  if (!ctx) {
    throw new Error(
      "[EntityExplorer] useEntityExplorer() must be called inside an <EntityExplorerProvider>.",
    );
  }
  return ctx;
}
