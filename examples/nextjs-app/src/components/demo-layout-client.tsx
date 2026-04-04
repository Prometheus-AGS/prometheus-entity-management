"use client";

import { AppProviders } from "@/components/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import {
  GraphHydrationProvider,
  type InitialEntity,
} from "@/components/graph-hydration-provider";

export function DemoLayoutClient({
  initialEntities,
  children,
}: {
  initialEntities: InitialEntity[];
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <GraphHydrationProvider initialEntities={initialEntities}>
        <AppShell>{children}</AppShell>
      </GraphHydrationProvider>
    </AppProviders>
  );
}
