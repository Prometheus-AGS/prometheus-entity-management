/**
 * /products/page.tsx — Server Component
 *
 * Fetches all products server-side (zero network round-trip for the client),
 * serialises them as InitialEntities, and passes to GraphHydrationProvider.
 * The client ProductsClient component reads from the entity graph immediately
 * with no loading state.
 */
import { fetchProducts, MAINTAINERS } from "@/lib/data";
import { GraphHydrationProvider, type InitialEntity } from "@/components/graph-hydration-provider";
import { ProductsClient } from "./products-client";

export const dynamic = "force-dynamic"; // always fresh in dev

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;

  // ── Server-side data fetch ─────────────────────────────────────────────
  const [products, maintainers] = await Promise.all([
    fetchProducts(params),
    Promise.resolve(MAINTAINERS),
  ]);

  // ── Serialize into InitialEntity format ──────────────────────────────
  const initialEntities: InitialEntity[] = [
    ...products.map((p) => ({ type: "Product", id: p.id, data: p as Record<string, unknown> })),
    ...maintainers.map((m) => ({ type: "Maintainer", id: m.id, data: m as Record<string, unknown> })),
  ];

  return (
    <GraphHydrationProvider initialEntities={initialEntities}>
      <ProductsClient
        initialProductIds={products.map((p) => p.id)}
        initialTotal={products.length}
        serverFilters={params}
      />
    </GraphHydrationProvider>
  );
}
