import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AgentConsolePage } from "./pages/agent-console-page";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AgentConsolePage />
  </StrictMode>,
);
