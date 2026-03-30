"use client";

/**
 * ReviewsClient.tsx
 *
 * Full CRUD demo using useEntityCRUD, EntityTable, EntityFormSheet,
 * EntityDetailSheet, and column helpers. Resolves related Product names
 * via useEntity for display in the table.
 *
 * Key patterns demonstrated:
 *  - useEntityCRUD orchestrates list + detail + edit + create
 *  - EntityTable renders data with useEntityView under the hood
 *  - Column helpers (textColumn, numberColumn, dateColumn, enumColumn)
 *  - EntityFormSheet / EntityDetailSheet for side-panel forms
 *  - useEntity for resolving foreign key relations inline
 */

import { useMemo } from "react";
import {
  useEntityCRUD,
  useEntity,
  EntityTable,
  EntityFormSheet,
  EntityDetailSheet,
  textColumn,
  numberColumn,
  dateColumn,
  actionsColumn,
} from "prometheus-entity-management";
import type { FieldDescriptor } from "prometheus-entity-management";
import { Btn } from "@/components/badges";
import { Plus, Star, Pencil, Trash2, Eye } from "lucide-react";
import type { Review, Product } from "@/lib/types";

// ── Product name resolver ─────────────────────────────────────────────────

function ProductNameCell({ productId }: { productId: string }) {
  const { data } = useEntity<Product, Product>({
    type: "Product",
    id: productId,
    fetch: async () => { throw new Error("Product should be hydrated from SSR"); },
    normalize: (p) => p,
    staleTime: Infinity,
  });
  return (
    <span className="text-sm text-[--color-ink]" title={data?.name}>
      {data?.name ?? "…"}
    </span>
  );
}

// ── Rating display ────────────────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < rating ? "text-amber-500 fill-amber-500" : "text-[--color-border]"}`}
        />
      ))}
    </span>
  );
}

// ── API helpers ───────────────────────────────────────────────────────────

async function fetchReviewsApi(
  params: Record<string, string>
): Promise<{ items: Review[]; total: number }> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/reviews${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchOneReview(id: string): Promise<Review> {
  const res = await fetch(`/api/reviews/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiCreateReview(data: Partial<Review>): Promise<Review> {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiUpdateReview(id: string, patch: Partial<Review>): Promise<Review> {
  const res = await fetch(`/api/reviews/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiDeleteReview(id: string): Promise<void> {
  const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ── Column definitions ───────────────────────────────────────────────────

const RATING_OPTIONS = [
  { value: "1", label: "1 Star", className: "bg-red-50 text-red-700 border-red-200" },
  { value: "2", label: "2 Stars", className: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "3", label: "3 Stars", className: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "4", label: "4 Stars", className: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "5", label: "5 Stars", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

function useReviewColumns() {
  return useMemo(() => [
    textColumn<Review>({
      field: "title",
      header: "Title",
      size: 280,
      editable: true,
      cell: (v) => <span className="font-medium text-[--color-ink] truncate block">{v}</span>,
    }),
    textColumn<Review>({
      field: "productId",
      header: "Product",
      size: 180,
      filterType: "none",
      cell: (_v, row) => <ProductNameCell productId={row.productId} />,
    }),
    numberColumn<Review>({
      field: "rating",
      header: "Rating",
      size: 100,
      format: (v) => `${"★".repeat(v)}${"☆".repeat(5 - v)}`,
    }),
    numberColumn<Review>({
      field: "helpfulVotes",
      header: "Helpful",
      size: 90,
    }),
    dateColumn<Review>({
      field: "createdAt",
      header: "Date",
      size: 130,
    }),
    actionsColumn<Review>([
      { label: "View", icon: Eye, onClick: () => {} },
      { label: "Edit", icon: Pencil, onClick: () => {} },
      { label: "Delete", icon: Trash2, onClick: () => {}, destructive: true },
    ]),
  ], []);
}

// ── Field descriptors for form sheets ────────────────────────────────────

const PRODUCT_OPTIONS = [
  { value: "prod1", label: "Prometheus Core" },
  { value: "prod2", label: "Flint IDE" },
  { value: "prod3", label: "WISC CLI" },
  { value: "prod4", label: "Flint Gate" },
  { value: "prod5", label: "surreal-memory" },
  { value: "prod6", label: "Universal Agent Runtime" },
  { value: "prod7", label: "entity-store" },
];

function useReviewFields(): FieldDescriptor<Review>[] {
  return useMemo(() => [
    { field: "title", label: "Title", type: "text", required: true, placeholder: "Review title" },
    { field: "productId", label: "Product", type: "enum", required: true, options: PRODUCT_OPTIONS },
    { field: "rating", label: "Rating", type: "enum", required: true, options: RATING_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
    { field: "body", label: "Body", type: "textarea", required: true, placeholder: "Write your review…" },
    { field: "helpfulVotes", label: "Helpful Votes", type: "number", hideOnCreate: true, readonlyOnEdit: true },
    {
      field: "createdAt",
      label: "Created",
      type: "date",
      hideOnCreate: true,
      readonlyOnEdit: true,
      render: (v) => v ? new Date(v as string).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—",
    },
  ], []);
}

// ── Main component ───────────────────────────────────────────────────────

export function ReviewsClient({ initialReviewIds }: { initialReviewIds: string[] }) {
  const columns = useReviewColumns();
  const fields = useReviewFields();

  const crud = useEntityCRUD<Review>({
    type: "Review",
    listQueryKey: ["reviews"],
    listFetch: async (params) => {
      const result = await fetchReviewsApi(params.rest);
      return result;
    },
    normalize: (raw) => ({ id: raw.id, data: raw }),
    detailFetch: fetchOneReview,
    onCreate: apiCreateReview,
    onUpdate: (id, patch) => apiUpdateReview(id, patch),
    onDelete: apiDeleteReview,
    createDefaults: { rating: 4, productId: "prod1", authorId: "m1" } as Partial<Review>,
    initialView: {
      sort: [{ field: "createdAt", direction: "desc" }],
    },
  });

  const actionColumns = useMemo(() => {
    const cols = [...columns];
    cols[cols.length - 1] = actionsColumn<Review>([
      { label: "View", icon: Eye, onClick: (row) => crud.openDetail(row.id) },
      { label: "Edit", icon: Pencil, onClick: (row) => crud.startEdit(row.id) },
      { label: "Delete", icon: Trash2, onClick: (row) => crud.deleteEntity(row.id), destructive: true },
    ]);
    return cols;
  }, [columns, crud]);

  return (
    <div className="min-h-screen bg-[--color-canvas]">
      {/* Header */}
      <div className="border-b border-[--color-border] bg-[--color-surface]/90 backdrop-blur sticky top-12 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-display font-semibold text-[--color-ink] flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Reviews
              </h1>
              <p className="text-sm text-[--color-ink-3] mt-0.5">
                {crud.list.viewTotal ?? initialReviewIds.length} reviews
                <span className="mx-1.5 opacity-30">·</span>
                <span className="font-mono text-xs">useEntityCRUD + EntityTable demo</span>
              </p>
            </div>
            <Btn variant="primary" size="sm" onClick={() => crud.startCreate()}>
              <Plus className="w-3.5 h-3.5" />
              New Review
            </Btn>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="bg-[--color-surface] border border-[--color-border] rounded-xl overflow-hidden">
          <EntityTable<Review>
            viewResult={crud.list}
            columns={actionColumns}
            getRowId={(r) => r.id}
            selectedId={crud.selectedId}
            onRowClick={(row) => crud.openDetail(row.id)}
            paginationMode="loadMore"
            searchPlaceholder="Search reviews…"
            emptyState={
              <div className="py-8 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 text-[--color-ink-3]/40" />
                <p className="text-sm font-medium text-[--color-ink-3] mb-1">No reviews yet</p>
                <p className="text-xs text-[--color-ink-3]/70">Create the first review to get started</p>
              </div>
            }
          />
        </div>

        {/* Architecture notes */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ArchNote
            title="useEntityCRUD"
            description="Orchestrates list + detail + edit + create modes with isolated edit buffers. Mutations trigger cascadeInvalidation via registered schemas."
          />
          <ArchNote
            title="EntityTable"
            description="Powered by TanStack Table + useEntityView. Column helpers generate sort headers, filter metadata, and typed cell renderers."
          />
          <ArchNote
            title="Cross-view reactivity"
            description="Editing a review here updates every other view showing that entity — no manual refetch needed. Lists store IDs, not data copies."
          />
        </div>
      </div>

      {/* Detail sheet */}
      <EntityDetailSheet<Review>
        crud={crud}
        fields={fields}
        title={(r) => r.title}
        description={(r) => {
          const rating = Number(r.rating);
          return `${rating} star${rating !== 1 ? "s" : ""} · ${r.helpfulVotes} helpful votes`;
        }}
      >
        {(review) => (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Rating</p>
            <RatingStars rating={Number(review.rating)} />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-2">Product</p>
            <ProductNameCell productId={review.productId} />
          </div>
        )}
      </EntityDetailSheet>

      {/* Create / Edit form sheet */}
      <EntityFormSheet<Review>
        crud={crud}
        fields={fields}
        createTitle="Write a Review"
        editTitle={(r) => `Edit: ${r.title}`}
      />
    </div>
  );
}

// ── Architecture note card ───────────────────────────────────────────────

function ArchNote({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-[--color-surface] border border-[--color-border] rounded-lg p-4">
      <h3 className="text-xs font-semibold font-mono text-[--color-fire] mb-1.5">{title}</h3>
      <p className="text-xs text-[--color-ink-3] leading-relaxed font-body">{description}</p>
    </div>
  );
}
