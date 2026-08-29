import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./route-tree";
import { ThemeProvider } from "./components/theme/theme-context";
import "./index.css";
import "./schema";

// Explicit debug opt-in. Vite replaces this condition and removes the import
// from production builds; the public auto entry mounts the development FAB.
if (import.meta.env.DEV) {
  void import("@prometheus-ags/prometheus-entity-management/devtools/auto");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router; }
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error('Missing #root element');
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
