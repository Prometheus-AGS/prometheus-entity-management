import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlatformDashboard } from "@/features/platform/components/platform-dashboard";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("The universal Tauri root element is missing.");

createRoot(root).render(
  <StrictMode>
    <PlatformDashboard />
  </StrictMode>,
);
