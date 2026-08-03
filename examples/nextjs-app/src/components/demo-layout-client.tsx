"use client";

// Register entity relation schemas on the client (drives useEntityCRUD cascade
// invalidation). Kept out of the server layout so the client-only entity library
// is never pulled into a React Server Component module.
import "@/schema";
import { AppProviders } from "@/components/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import {
  GraphHydrationProvider,
} from "@/components/graph-hydration-provider";
import type { DehydratedGraphSnapshot } from "@/features/next-runtime/graph-snapshot";

export function DemoLayoutClient({
  snapshot,
  children,
}: {
  snapshot: DehydratedGraphSnapshot;
  children: React.ReactNode;
}) {
  return (
    <AppProviders>
      <GraphHydrationProvider snapshot={snapshot}>
        <AppShell>{children}</AppShell>
      </GraphHydrationProvider>
    </AppProviders>
  );
}
