import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { A2uiSurface, MarkdownContext } from "@a2ui/react/v0_9";
import { renderMarkdown } from "@a2ui/markdown-it";
import type {
  A2uiClientCapabilities,
  A2uiClientDataModel,
  SurfaceModel,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import type {
  PrometheusA2uiMessageInput,
  PrometheusA2uiRuntime,
} from "../official/runtime.js";
import type { PrometheusA2uiComponentImplementation } from "../official/types.js";

const A2uiRuntimeContext = createContext<PrometheusA2uiRuntime | null>(null);
const subscribeToHydration = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * The official v0.9 renderer currently omits `getServerSnapshot` in an
 * internal external-store subscription. Gate it until hydration so Next.js
 * and other SSR consumers receive deterministic server markup instead of a
 * runtime exception.
 */
function useA2uiClientReady(): boolean {
  return useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
}

export interface PrometheusA2uiProviderProps {
  /** Runtime ownership stays with the application so lifecycle is explicit. */
  runtime: PrometheusA2uiRuntime;
  children: ReactNode;
}

export function PrometheusA2uiProvider({
  runtime,
  children,
}: PrometheusA2uiProviderProps) {
  return (
    <A2uiRuntimeContext.Provider value={runtime}>
      <MarkdownContext.Provider value={renderMarkdown}>
        {children}
      </MarkdownContext.Provider>
    </A2uiRuntimeContext.Provider>
  );
}

/** Read the nearest official A2UI runtime. */
export function usePrometheusA2uiRuntime(): PrometheusA2uiRuntime {
  const runtime = useContext(A2uiRuntimeContext);
  if (!runtime) {
    throw new Error("usePrometheusA2uiRuntime must be used inside PrometheusA2uiProvider.");
  }
  return runtime;
}

/** Subscribe to the official processor's surface collection. */
export function usePrometheusA2uiSurfaces(): readonly SurfaceModel<PrometheusA2uiComponentImplementation>[] {
  const runtime = usePrometheusA2uiRuntime();
  return useSyncExternalStore(runtime.subscribe, runtime.getSurfaces, runtime.getSurfaces);
}

export interface UsePrometheusA2uiResult {
  runtime: PrometheusA2uiRuntime;
  surfaces: readonly SurfaceModel<PrometheusA2uiComponentImplementation>[];
  processMessages(input: PrometheusA2uiMessageInput): void;
  getClientCapabilities(options?: { includeInlineCatalogs?: boolean }): A2uiClientCapabilities;
  getClientDataModel(): A2uiClientDataModel | undefined;
}

/** Orchestrate official message ingestion and surface reads from React. */
export function usePrometheusA2ui(): UsePrometheusA2uiResult {
  const runtime = usePrometheusA2uiRuntime();
  const surfaces = usePrometheusA2uiSurfaces();
  const processMessages = useCallback(
    (input: PrometheusA2uiMessageInput) => runtime.processMessages(input),
    [runtime],
  );
  const getClientCapabilities = useCallback(
    (options?: { includeInlineCatalogs?: boolean }) =>
      runtime.getClientCapabilities(options),
    [runtime],
  );
  const getClientDataModel = useCallback(
    () => runtime.getClientDataModel(),
    [runtime],
  );

  return {
    runtime,
    surfaces,
    processMessages,
    getClientCapabilities,
    getClientDataModel,
  };
}

export interface PrometheusA2uiSurfaceProps {
  surfaceId: string;
  fallback?: ReactNode;
  className?: string;
}

/** Render one official catalog-backed A2UI surface. */
export function PrometheusA2uiSurface({
  surfaceId,
  fallback = null,
  className,
}: PrometheusA2uiSurfaceProps) {
  const runtime = usePrometheusA2uiRuntime();
  const surfaces = usePrometheusA2uiSurfaces();
  const clientReady = useA2uiClientReady();
  const surface = surfaces.find((candidate) => candidate.id === surfaceId)
    ?? runtime.getSurface(surfaceId);

  if (!surface) return <>{fallback}</>;
  return (
    <div
      className={className}
      data-prometheus-a2ui-client-ready={clientReady ? "true" : "false"}
      data-prometheus-a2ui-surface={surface.id}
    >
      {clientReady ? <A2uiSurface surface={surface} /> : fallback}
    </div>
  );
}

export interface PrometheusA2uiSurfacesProps {
  empty?: ReactNode;
  className?: string;
  surfaceClassName?: string;
}

/** Render every surface currently owned by the official processor. */
export function PrometheusA2uiSurfaces({
  empty = null,
  className,
  surfaceClassName,
}: PrometheusA2uiSurfacesProps) {
  const surfaces = usePrometheusA2uiSurfaces();
  const clientReady = useA2uiClientReady();
  if (surfaces.length === 0) return <>{empty}</>;

  return (
    <div className={className} data-prometheus-a2ui-surfaces>
      {surfaces.map((surface) => (
        <div
          className={surfaceClassName}
          data-prometheus-a2ui-client-ready={clientReady ? "true" : "false"}
          data-prometheus-a2ui-surface={surface.id}
          key={surface.id}
        >
          {clientReady ? <A2uiSurface surface={surface} /> : null}
        </div>
      ))}
    </div>
  );
}
