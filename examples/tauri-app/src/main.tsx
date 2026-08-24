/**
 * main.tsx — boot: start the local-first runtime (durable SQL storage on
 * native, localStorage on web), then render. The runtime awaits hydration
 * before first paint so offline restart state is visible immediately.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startGraphRuntime } from "./graph/runtime";
import "./styles.css";

async function boot(): Promise<void> {
  await startGraphRuntime();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
