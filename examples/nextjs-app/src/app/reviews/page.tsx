/**
 * /reviews/page.tsx — Server Component
 *
 * Fetches all reviews and related products server-side, serializes them
 * as InitialEntities, and passes to GraphHydrationProvider. The client
 * ReviewsClient component reads from the entity graph immediately.
 */
import { fetchReviews, PRODUCTS, MAINTAINERS } from "@/lib/data";
import { GraphHydrationProvider, type InitialEntity } from "@/components/graph-hydration-provider";
import { ReviewsClient } from "./reviews-client";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const [reviews, products, maintainers] = await Promise.all([
    fetchReviews(),
    Promise.resolve(PRODUCTS),
    Promise.resolve(MAINTAINERS),
  ]);

  const initialEntities: InitialEntity[] = [
    ...reviews.map((r) => ({ type: "Review", id: r.id, data: r as Record<string, unknown> })),
    ...products.map((p) => ({ type: "Product", id: p.id, data: p as Record<string, unknown> })),
    ...maintainers.map((m) => ({ type: "Maintainer", id: m.id, data: m as Record<string, unknown> })),
  ];

  return (
    <GraphHydrationProvider initialEntities={initialEntities}>
      <ReviewsClient initialReviewIds={reviews.map((r) => r.id)} />
    </GraphHydrationProvider>
  );
}
