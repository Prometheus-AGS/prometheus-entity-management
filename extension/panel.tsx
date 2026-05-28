/**
 * panel.tsx — Chrome MV3 Extension DevTools Panel Entry Point
 *
 * Bundled into extension/panel.js by tsup (separate entry point).
 * Mounts the EntityExplorer panel full-screen in the DevTools panel page.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { EntityExplorerProvider } from "../src/ui/entity-explorer/context";
import { EntityExplorerPanel } from "../src/ui/entity-explorer/panel";
import { createExtensionBus } from "../src/extension/create-extension-bus";
import "../src/ui/entity-explorer/entity-explorer.css";

const bus = createExtensionBus();

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <EntityExplorerProvider bus={bus}>
      <EntityExplorerPanel forceOpen />
    </EntityExplorerProvider>
  </React.StrictMode>
);
