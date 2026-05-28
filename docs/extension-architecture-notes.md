# Chrome MV3 Extension Architecture Notes

## Context

The Entity Explorer panel (`EntityExplorerPanel`) is designed to run in two modes:

1. **Injected mode** — embedded directly in a React app via `EntityExplorerProvider`
2. **Chrome DevTools extension** — a standalone MV3 DevTools panel that inspects
   any running web app using the entity management library

This document covers the architecture for mode 2.

---

## Message Bridge Architecture

Chrome MV3 extensions operate in isolated JavaScript worlds. A 4-layer message
bridge is required to get `DevtoolsEvent` objects from the inspected page into the
DevTools panel:

```
┌─────────────────────┐    window.postMessage    ┌─────────────────────┐
│   Inspected Page    │ ──────────────────────>  │   Content Script    │
│                     │                          │ (ISOLATED world)    │
│  DevtoolsEventBus   │                          │                     │
│  (enableWindowBridge│                          │ chrome.runtime      │
│   = true)           │                          │   .sendMessage()    │
└─────────────────────┘                          └──────────┬──────────┘
                                                            │
                                                            ▼
                                                 ┌─────────────────────┐
                                                 │  Service Worker     │
                                                 │  (background.js)    │
                                                 │                     │
                                                 │  Port relay:        │
                                                 │  content → panel    │
                                                 └──────────┬──────────┘
                                                            │
                                                            ▼
                                                 ┌─────────────────────┐
                                                 │   DevTools Panel    │
                                                 │   (panel.html)      │
                                                 │                     │
                                                 │  EntityExplorer     │
                                                 │  Provider + Panel   │
                                                 └─────────────────────┘
```

---

## window.postMessage Bridge (Library Side)

`EntityExplorerProvider` accepts an optional `enableWindowBridge` prop:

```tsx
<EntityExplorerProvider enableWindowBridge>
  <App />
</EntityExplorerProvider>
```

When `enableWindowBridge={true}`, the provider adds a `useEffect` that subscribes
to the internal `DevtoolsEventBus` and re-broadcasts each event as:

```js
window.postMessage({ type: "__entity_explorer_event__", payload: event }, "*");
```

This keeps the library self-contained. No MAIN-world script injection from the
extension side is required.

---

## Content Script

`content.js` listens for the window message and forwards to the service worker:

```js
window.addEventListener("message", (e) => {
  if (e.source !== window) return;
  if (e.data?.type !== "__entity_explorer_event__") return;
  chrome.runtime.sendMessage({ event: e.data.payload });
});
```

---

## Service Worker (background.js)

The service worker maintains a `chrome.runtime.connect()` port to the DevTools panel.
It is intentionally stateless — it does **not** buffer events. MV3 service workers
are ephemeral; buffering would require the worker to stay alive (defeating MV3 goals).

If the DevTools panel is not open, events are silently dropped.

```js
let panelPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "entity-explorer-panel") return;
  panelPort = port;
  port.onDisconnect.addListener(() => { panelPort = null; });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.event && panelPort) {
    panelPort.postMessage(msg.event);
  }
});
```

The `chrome.runtime.connect()` port from the panel to the service worker keeps the
worker alive while the DevTools panel is open.

---

## DevTools Panel Side

`panel.html` loads a bundled React app. `createExtensionBus()` creates a
`DevtoolsEventBus` and wires it to incoming port messages:

```ts
// src/extension/create-extension-bus.ts
import { createDevtoolsEventBus } from "../devtools-event-bus";

export function createExtensionBus() {
  const bus = createDevtoolsEventBus({ bufferSize: 500 });
  const port = chrome.runtime.connect({ name: "entity-explorer-panel" });

  port.onMessage.addListener((event) => {
    // Inject raw DevtoolsEvent into the bus
    // (uses the _busInjectMap WeakMap from the factory)
    bus.inject(event);
  });

  port.onDisconnect.addListener(() => bus.destroy());
  return bus;
}
```

Note: `DevtoolsEventBus` needs a public `inject(event)` method exposed (or the
WeakMap-based inject mechanism extended) for the extension context.

The React root mounts:
```tsx
const bus = createExtensionBus();
ReactDOM.createRoot(document.getElementById("root")).render(
  <EntityExplorerProvider bus={bus}>
    <EntityExplorerPanel forceOpen />
  </EntityExplorerProvider>
);
```

This requires `EntityExplorerProvider` to accept an external `bus` prop.

---

## MV3 Constraints

| Constraint | Impact |
|------------|--------|
| Service worker sleeps after ~30s idle | Use port messaging to keep alive while panel open |
| No shared DOM between worlds | Use `window.postMessage` for page → content bridge |
| `chrome.scripting.executeScript` needs `scripting` permission | Not needed with `enableWindowBridge` approach |
| No `eval` in MV3 | Not needed in our design |
| Manifest V2 deprecated | Target MV3 exclusively |

---

## File Layout for W8 Scaffold

```
extension/
  manifest.json          # MV3 manifest
  background.js          # Service worker: port relay only
  content.js             # window.postMessage → chrome.runtime relay
  devtools.html          # Chrome devtools page (just loads devtools.js)
  devtools.js            # Calls chrome.devtools.panels.create(...)
  panel.html             # React root for entity explorer
  panel.tsx              # Entry: createExtensionBus + React render
  build.ts               # Bun/esbuild build script
src/
  extension/
    create-extension-bus.ts   # Thin wrapper over DevtoolsEventBus for port input
```

---

## Library Changes Required for W8

| Change | File | Notes |
|--------|------|-------|
| `enableWindowBridge` prop | `context.tsx` | Added in W7b |
| Accept external `bus` prop | `context.tsx` | Allows panel to receive pre-constructed bus |
| `forceOpen` prop | `panel.tsx` | Skips FAB; panel always visible in extension |
| `bus.inject(event)` | `devtools-event-bus.ts` | Public inject method for port-fed events |
