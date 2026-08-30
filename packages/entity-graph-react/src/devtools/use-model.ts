import { useEffect, useState, useSyncExternalStore } from "react";
import {
  createEntityGraphInspectorModelStore,
  type EntityGraphInspectorModel,
  type EntityGraphInspectorModelStore,
} from "./model";
import { useEntityGraphDevtools } from "./provider";

interface ModelBinding {
  controller: NonNullable<ReturnType<typeof useEntityGraphDevtools>["controller"]>;
  store: NonNullable<ReturnType<typeof useEntityGraphDevtools>["store"]>;
  model: EntityGraphInspectorModelStore;
}

const subscribeToNothing = () => () => {};
const getNoModel = (): EntityGraphInspectorModel | null => null;

/** Subscribe to the selected controller's frame-bounded local inspector projection. */
export function useEntityGraphInspectorModel(): EntityGraphInspectorModel | null {
  const runtime = useEntityGraphDevtools();
  const [binding, setBinding] = useState<ModelBinding | null>(null);

  useEffect(() => {
    if (!runtime.controller || !runtime.store) return;
    const model = createEntityGraphInspectorModelStore(runtime.controller, runtime.store);
    const next: ModelBinding = {
      controller: runtime.controller,
      store: runtime.store,
      model,
    };
    setBinding(next);
    return model.dispose;
  }, [runtime.controller, runtime.store]);

  const current = runtime.inspectorModel ?? (
    binding?.controller === runtime.controller && binding.store === runtime.store ? binding.model : null
  );

  return useSyncExternalStore(
    current?.subscribe ?? subscribeToNothing,
    current?.getSnapshot ?? getNoModel,
    getNoModel,
  );
}
