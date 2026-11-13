import type {
  ComponentApi,
  MessageProcessor,
  SurfaceModel,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import { PROMETHEUS_A2UI_PROTOCOL_VERSION, PROMETHEUS_A2UI_V1_PROTOCOL_VERSION } from "./catalog-core.js";
import { defaultCatalogIdOf, isV1Surface } from "./v1-messages.js";

/**
 * Replay the surfaces a live processor holds into a fresh shadow processor, so
 * `preflight` can apply a whole batch to a copy and discard it if anything is
 * rejected. Surface settings, components and the data model are all copied, in
 * the protocol version the surface was created with: a v0.9.1 surface with its
 * theme, an A2UI 1.0 surface without one (1.0 removed it) and with each
 * component's own catalog where it differs from the surface default.
 */
export function seedShadowProcessor<Implementation extends ComponentApi>(
  shadow: MessageProcessor<Implementation>,
  surfaces: Iterable<readonly [string, SurfaceModel<Implementation>]>,
): void {
  for (const [surfaceId, surface] of surfaces) {
    const v1 = isV1Surface(surface);
    const version = v1 ? PROMETHEUS_A2UI_V1_PROTOCOL_VERSION : PROMETHEUS_A2UI_PROTOCOL_VERSION;
    const catalogId = v1 ? defaultCatalogIdOf(surface) : surface.catalog.id;
    const apply = (message: Record<string, unknown>): void => {
      shadow.processMessages([{ version, ...message }] as never);
    };

    apply({
      createSurface: {
        surfaceId,
        ...(catalogId === undefined ? {} : { catalogId }),
        ...(v1 ? {} : { theme: structuredClone(surface.theme) }),
        sendDataModel: surface.sendDataModel,
      },
    });

    const components = [...surface.componentsModel.entries].map(([id, component]) => ({
      ...structuredClone(component.properties),
      id,
      component: component.type,
      ...(v1 && component.catalog && component.catalog.id !== catalogId
        ? { catalogId: component.catalog.id }
        : {}),
    }));
    if (components.length > 0) apply({ updateComponents: { surfaceId, components } });

    const data = surface.dataModel.get("/");
    if (data !== undefined) {
      apply({ updateDataModel: { surfaceId, path: "/", value: structuredClone(data) } });
    }
  }
}
