import React from "react";
import { createRoot } from "react-dom/client";
import { PrometheusA2uiProvider } from "@prometheus-ags/a2ui-react";
import { LabConsole } from "./features/lab/components/lab-console";
import { labRuntime } from "./features/lab/runtime";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("The application root element is missing.");

createRoot(root).render(
  <React.StrictMode>
    <PrometheusA2uiProvider runtime={labRuntime}>
      <LabConsole />
    </PrometheusA2uiProvider>
  </React.StrictMode>,
);
