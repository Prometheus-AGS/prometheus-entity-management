import type {
  ComponentApi,
  MessageProcessor,
  SurfaceModel,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import { PROMETHEUS_A2UI_PROTOCOL_VERSION } from "./catalog-core.js";

/**
 * Replay the surfaces a live processor holds into a fresh shadow processor, so
 * `preflight` can apply a whole batch to a copy and discard it if anything is
 * rejected. Surface settings, components and the data model are all copied.
 */
export function seedShadowProcessor<Implementation extends ComponentApi>(
  shadow: MessageProcessor<Implementation>,
  surfaces: Iterable<readonly [string, SurfaceModel<Implementation>]>,
): void {
  for (const [surfaceId, surface] of surfaces) {
    shadow.processMessages([
      {
        version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
        createSurface: {
          surfaceId,
          catalogId: surface.catalog.id,
          theme: structuredClone(surface.theme),
          sendDataModel: surface.sendDataModel,
        },
      },
    ]);

    const components = [...surface.componentsModel.entries].map(
      ([id, component]) => ({
        ...structuredClone(component.properties),
        id,
        component: component.type,
      }),
    );
    if (components.length > 0) {
      shadow.processMessages([
        {
          version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
          updateComponents: { surfaceId, components },
        },
      ]);
    }

    const data = surface.dataModel.get("/");
    if (data !== undefined) {
      shadow.processMessages([
        {
          version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
          updateDataModel: {
            surfaceId,
            path: "/",
            value: structuredClone(data),
          },
        },
      ]);
    }
  }
}
