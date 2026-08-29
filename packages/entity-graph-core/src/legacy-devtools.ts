/** Deprecated in-process event shape retained by the package root. */
export type LegacyDevtoolsEvent =
  | { kind: "upsert"; type: string; id: string; data: Record<string, unknown>; at: string }
  | { kind: "patch"; type: string; id: string; patch: Record<string, unknown>; at: string }
  | { kind: "unpatch"; type: string; id: string; keys: string[]; at: string }
  | { kind: "clearPatch"; type: string; id: string; at: string }
  | { kind: "list"; key: string; idCount: number; at: string };

type LegacyListener = (event: LegacyDevtoolsEvent) => void;

const listeners = new Set<LegacyListener>();

function publish(event: LegacyDevtoolsEvent): void {
  if (listeners.size === 0) return;
  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // Keep the prior diagnostic without forwarding a potentially sensitive exception.
      console.warn("[engine] devtools subscriber threw");
    }
  }
}

/**
 * Deprecated op-site event API retained without loading the optional
 * versioned DevTools controller into the package root bundle. It stores no
 * history or cursor; new inspection surfaces use the versioned subpath.
 */
export function subscribeLegacyDevtoolsEvent(listener: LegacyListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @internal Deprecated manual injection used by legacy internal callers. */
export function emitLegacyDevtoolsEvent(event: LegacyDevtoolsEvent): void {
  publish(event);
}
