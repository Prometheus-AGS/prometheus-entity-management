import type {
  ComponentApi,
  ComponentContext,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import type { FC, ReactNode } from "react";

/**
 * Structural view of the official React catalog implementation.
 *
 * This keeps Prometheus declarations on the clean `web_core/v0_9` type path;
 * official `@a2ui/react@0.10.2` currently routes one public type through an
 * extensionless v0.8 declaration that breaks strict NodeNext consumers.
 * Runtime ownership remains entirely with the official implementation.
 */
export interface PrometheusA2uiComponentImplementation extends ComponentApi {
  render: FC<{
    context: ComponentContext;
    buildChild: (id: string, basePath?: string) => ReactNode;
  }>;
}
