/**
 * Export a surface as messages that rebuild it in a fresh runtime.
 *
 * A host that mirrors or compacts a long-lived surface needs its state back as
 * messages, without losing anything. The official processor offers no such
 * export, and the runtime's own shadow rebuild (in `shadow-seed.ts`) is private
 * and reproduces only what `preflight` needs.
 *
 * - A v0.9.1 surface exports as three official messages: `createSurface` (catalog,
 *   theme, `sendDataModel`), `updateComponents` (every component, with its own
 *   `catalogId` where it differs from the surface's) and `updateDataModel` at `/`.
 * - A v1.0 surface exports as ONE inline `createSurface` carrying its components
 *   and data model, with the `wantResponse` / `responsePath` action metadata put
 *   back where the producer wrote it. The v1.0 schema cannot express a theme, so
 *   a v1.0 surface has none to lose.
 *
 * The root is the component with id `root`, by A2UI convention, and is preserved
 * by id. Components nothing reachable from the root refers to are orphans: the
 * official processor never removes a component the producer stops mentioning, so
 * they accumulate, and they are pruned from the export (and reported) unless the
 * caller asks to keep them.
 */

import { PROMETHEUS_A2UI_PROTOCOL_VERSION } from "./catalog-core.js";
import {
  PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  restoreV1ActionMetadata,
  type PrometheusA2uiV1ActionMetadata,
} from "./v1-compat.js";

/** The parts of an official surface model the export reads. */
export interface ExportableSurface {
  readonly catalog: { readonly id: string };
  readonly theme: unknown;
  readonly sendDataModel: boolean | undefined;
  readonly componentsModel: {
    readonly entries: Iterable<
      readonly [
        string,
        {
          readonly type: string;
          readonly properties: unknown;
          readonly catalog?: { readonly id: string };
        },
      ]
    >;
    getChildIds(componentId: string): readonly string[];
  };
  readonly dataModel: { get(path: string): unknown };
}

export interface SurfaceExportOptions {
  /** Drop components unreachable from the root. Defaults to `true`. */
  readonly pruneOrphans?: boolean;
}

export interface PrometheusA2uiSurfaceExport {
  readonly surfaceId: string;
  /** Messages that rebuild the surface; feed them to `processMessages` of a fresh runtime. */
  readonly messages: readonly unknown[];
  /**
   * Ids of components no reachable component refers to, in surface order. They
   * are left out of `messages` unless `pruneOrphans` was `false`. Empty when the
   * surface has no `root` component, since there is nothing to anchor to.
   */
  readonly orphans: readonly string[];
}

export interface ExportSurfaceInput {
  readonly surfaceId: string;
  readonly surface: ExportableSurface;
  /** The surface was created by a v1.0 message. */
  readonly v1: boolean;
  /** `wantResponse` / `responsePath` metadata of this surface's v1.0 actions. */
  readonly actions: readonly PrometheusA2uiV1ActionMetadata[];
  readonly options?: SurfaceExportOptions;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Ids reachable from `root`, walked iteratively so a long chain cannot overflow the stack. */
function reachableFromRoot(
  ids: readonly string[],
  childIdsOf: (componentId: string) => readonly string[],
): Set<string> | undefined {
  if (!ids.includes("root")) return undefined;
  const known = new Set(ids);
  const reached = new Set<string>(["root"]);
  const pending = ["root"];
  while (pending.length > 0) {
    const current = pending.pop() as string;
    for (const child of childIdsOf(current)) {
      if (known.has(child) && !reached.has(child)) {
        reached.add(child);
        pending.push(child);
      }
    }
  }
  return reached;
}

export function exportSurface(input: ExportSurfaceInput): PrometheusA2uiSurfaceExport {
  const { surfaceId, surface, v1, actions } = input;
  const prune = input.options?.pruneOrphans ?? true;

  const entries = [...surface.componentsModel.entries];
  const ids = entries.map(([id]) => id);
  const reached = reachableFromRoot(ids, (id) => surface.componentsModel.getChildIds(id));
  const orphans = reached ? ids.filter((id) => !reached.has(id)) : [];
  const kept = prune && reached ? entries.filter(([id]) => reached.has(id)) : entries;

  const components = kept.map(([id, component]) => ({
    ...(isPlainObject(component.properties) ? structuredClone(component.properties) : {}),
    id,
    component: component.type,
    ...(component.catalog && component.catalog.id !== surface.catalog.id
      ? { catalogId: component.catalog.id }
      : {}),
  }));
  const data = surface.dataModel.get("/");

  if (v1) {
    const inlineData = isPlainObject(data);
    const restored = restoreV1ActionMetadata(components, actions);
    return {
      surfaceId,
      orphans,
      messages: [
        {
          version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
          createSurface: {
            surfaceId,
            catalogId: surface.catalog.id,
            ...(surface.sendDataModel === undefined ? {} : { sendDataModel: surface.sendDataModel }),
            ...(restored.length > 0 ? { components: restored } : {}),
            ...(inlineData ? { dataModel: structuredClone(data) } : {}),
          },
        },
        // The v1.0 inline form takes an object data model; any other root value
        // follows as its own message.
        ...(data !== undefined && !inlineData
          ? [
              {
                version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
                updateDataModel: { surfaceId, path: "/", value: structuredClone(data) },
              },
            ]
          : []),
      ],
    };
  }

  const version = PROMETHEUS_A2UI_PROTOCOL_VERSION;
  return {
    surfaceId,
    orphans,
    messages: [
      {
        version,
        createSurface: {
          surfaceId,
          catalogId: surface.catalog.id,
          theme: structuredClone(surface.theme),
          ...(surface.sendDataModel === undefined ? {} : { sendDataModel: surface.sendDataModel }),
        },
      },
      ...(components.length > 0
        ? [{ version, updateComponents: { surfaceId, components } }]
        : []),
      ...(data !== undefined
        ? [{ version, updateDataModel: { surfaceId, path: "/", value: structuredClone(data) } }]
        : []),
    ],
  };
}
