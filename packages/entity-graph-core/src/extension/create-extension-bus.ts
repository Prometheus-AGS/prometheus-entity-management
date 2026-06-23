/**
 * create-extension-bus — Chrome MV3 Extension Panel
 *
 * Creates a `DevtoolsEventBus` fed by events arriving over the Chrome
 * port-messaging bridge from the inspected page (via content script + background).
 *
 * Usage in panel.tsx:
 * ```tsx
 * const bus = createExtensionBus();
 * root.render(
 *   <EntityExplorerProvider bus={bus} forceOpen>
 *     <EntityExplorerPanel forceOpen />
 *   </EntityExplorerProvider>
 * );
 * ```
 */

import { createDevtoolsEventBus, type DevtoolsEventBus } from "../devtools-event-bus";
import type { DevtoolsEvent } from "../engine";

// Chrome extension API — only available in the extension context.
interface ChromeRuntimePort {
  onMessage: { addListener(cb: (msg: unknown) => void): void };
  onDisconnect: { addListener(cb: () => void): void };
}
interface ChromeApiShape {
  runtime?: {
    connect(options: { name: string }): ChromeRuntimePort;
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chromeApi: ChromeApiShape | undefined = (globalThis as any).chrome;

/**
 * Creates a DevtoolsEventBus wired to the Chrome MV3 background port.
 * Events arriving from the inspected page are injected directly into the bus.
 *
 * The caller should NOT destroy the bus manually — it is destroyed when
 * the port disconnects (DevTools panel closed / extension reloaded).
 */
export function createExtensionBus(): DevtoolsEventBus {
  const bus = createDevtoolsEventBus({ bufferSize: 500, coalesceBurstThreshold: 10 });

  // Connect to the background service worker — this port keeps the worker alive
  const port = chromeApi?.runtime
    ? chromeApi.runtime.connect({ name: "entity-explorer-panel" })
    : null;

  if (port) {
    port.onMessage.addListener((msg: unknown) => {
      bus.inject(msg as DevtoolsEvent);
    });

    port.onDisconnect.addListener(() => {
      bus.destroy();
    });
  }

  return bus;
}
