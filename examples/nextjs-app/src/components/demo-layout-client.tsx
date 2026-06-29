"use client";

// Register entity relation schemas on the client (drives useEntityCRUD cascade
// invalidation). Kept out of the server layout so the client-only entity library
// is never pulled into a React Server Component module.
import "@/schema";
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
