import React from "react";
import { createRoot } from "react-dom/client";
import { PrometheusA2uiProvider } from "@prometheus-ags/a2ui-react";
import { AgentConsole } from "./features/agentic/components/agent-console";
import { agentA2uiRuntime } from "./features/agentic/runtime";
import { taskCommandStore } from "./features/tasks/task-command-store";
import "./styles.css";

taskCommandStore.getState().seedSharedScenario();

const root = document.getElementById("root");
if (!root) throw new Error("The application root element is missing.");

createRoot(root).render(
  <React.StrictMode>
    <PrometheusA2uiProvider runtime={agentA2uiRuntime}>
      <AgentConsole />
    </PrometheusA2uiProvider>
  </React.StrictMode>,
);
