"use client";

/**
 * ProductsClient.tsx
 *
 * Client component for the product catalog.
 *
 * Key pattern — SSR hydration:
 *   The Server Component (page.tsx) fetches products + maintainers at request
 *   time and passes them to GraphHydrationProvider, which synchronously writes
 *   them into the Zustand entity graph before this component first renders.
 *   useEntityView therefore returns items immediately — no isLoading flash.
 *
 *   Subsequent category filter changes use URL params → server re-fetch →
 *   re-hydration. Text search uses useEntityView hybrid mode: local results
 *   show instantly, a remote fetch fires in parallel for accurate results.
 */

import { useState, useCallback, Suspense } from "react";
import { useEntityView, useEntity, useEntityAugment, useEntityMutation, useSuspenseEntity } from "prometheus-entity-management";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  StatusBadge,
  CategoryChip,
  PricingBadge,
  StatPill,
  Btn,
  Skeleton,
} from "@/components/badges";
import { Star, Download, Users, Search, X, Pencil } from "lucide-react";
import type { Product, Maintainer } from "@/lib/types";
import type { ViewFetchParams } from "prometheus-entity-management";

// ── API helper ────────────────────────────────────────────────────────────

async function fetchProductsFromApi(
  params: ViewFetchParams
): Promise<{ items: Product[]; total: number }> {
  const qs = new URLSearchParams(params.rest).toString();
  const res = await fetch(`/api/products${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Product card ──────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
}: {
  product: Product;
  onEdit: (p: Product) => void;
}) {
  const { data: graphMaintainer } = useEntity<Maintainer, Maintainer>({
    type: "Maintainer",
    id: product.maintainerId,
    fetch: async () => { throw new Error("Maintainer should be hydrated from SSR"); },
    normalize: (m) => m,
    staleTime: Infinity,
  });

  return (
    <div className="group bg-[--color-surface] border border-[--color-border] rounded-xl p-5 flex flex-col gap-3 hover:border-[--color-fire]/40 hover:shadow-md transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-[--color-ink] text-base">
              {product.name}
            </h3>
            <StatusBadge status={product.status} />
          </div>
          <p className="text-sm text-[--color-ink-3] leading-relaxed line-clamp-2">
            {product.tagline}
          </p>
        </div>
        <button
          onClick={() => onEdit(product)}
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[--color-surface-2] text-[--color-ink-3] hover:text-[--color-ink] transition-all shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
        <CategoryChip category={product.category} />
        <PricingBadge pricing={product.pricing} />
        {product.tags.slice(0, 3).map((t) => (
          <span
            key={t}
            className="text-[10px] px-1.5 py-0.5 rounded bg-[--color-surface-2] text-[--color-ink-3] font-mono"
          >
            {t}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 pt-1 border-t border-[--color-border]">
        <StatPill icon={<Star className="w-3.5 h-3.5" />} value={product.stars} label="stars" />
        <StatPill icon={<Download className="w-3.5 h-3.5" />} value={product.downloads} label="dl" />
        <StatPill icon={<Users className="w-3.5 h-3.5" />} value={product.monthlyActiveUsers} label="MAU" />
        <span className="ml-auto text-xs text-[--color-ink-3] font-mono">
          {product.version}
        </span>
      </div>

      {/* Maintainer */}
      {graphMaintainer && (
        <div className="flex items-center gap-2 text-xs text-[--color-ink-3]">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ background: graphMaintainer.avatarColor }}
          >
            {graphMaintainer.avatarInitials}
          </span>
          <span>
            {graphMaintainer.name} · {graphMaintainer.company}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Edit sheet ────────────────────────────────────────────────────────────

function EditSheet({
  product,
  onClose,
  onSave,
  isSaving,
}: {
  product: Product;
  onClose: () => void;
  onSave: (patch: Partial<Product>) => Promise<void>;
  isSaving: boolean;
}) {
  const [buf, setBuf] = useState<Partial<Product>>({ ...product });
  const set = (k: keyof Product, v: unknown) =>
    setBuf((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />
      <div className="relative bg-[--color-surface] border border-[--color-border] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--color-border]">
          <h2 className="font-semibold text-[--color-ink]">Edit {product.name}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[--color-surface-2] text-[--color-ink-3] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {(["name", "tagline", "version"] as const).map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[--color-ink-3] capitalize">
                {field}
              </label>
              <input
                value={String(buf[field] ?? "")}
                onChange={(e) => set(field, e.target.value)}
                className="h-9 px-3 rounded-lg border border-[--color-border] bg-[--color-surface-2] text-sm text-[--color-ink] focus:outline-none focus:border-[--color-fire]/60 transition-colors"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[--color-ink-3]">Status</label>
              <select
                value={String(buf.status ?? "")}
                onChange={(e) => set("status", e.target.value)}
                className="h-9 px-3 rounded-lg border border-[--color-border] bg-[--color-surface-2] text-sm text-[--color-ink] focus:outline-none focus:border-[--color-fire]/60"
              >
                {(["ga", "beta", "alpha", "deprecated", "planned"] as const).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[--color-ink-3]">Stars</label>
              <input
                type="number"
                value={String(buf.stars ?? 0)}
                onChange={(e) => set("stars", Number(e.target.value))}
                className="h-9 px-3 rounded-lg border border-[--color-border] bg-[--color-surface-2] text-sm text-[--color-ink] focus:outline-none focus:border-[--color-fire]/60"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[--color-ink-3]">Description</label>
            <textarea
              value={String(buf.description ?? "")}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="px-3 py-2 rounded-lg border border-[--color-border] bg-[--color-surface-2] text-sm text-[--color-ink] resize-none focus:outline-none focus:border-[--color-fire]/60"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[--color-border] flex gap-2">
          <Btn variant="ghost" size="sm" onClick={onClose} className="flex-1">Cancel</Btn>
          <Btn
            variant="primary"
            size="sm"
            loading={isSaving}
            onClick={() => onSave(buf)}
            className="flex-1"
          >
            Save Changes
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Category filter list ──────────────────────────────────────────────────

const CATEGORIES = [
  "infrastructure",
  "developer-tools",
  "ai-ml",
  "security",
  "data",
  "mobile",
] as const;

// ── Main exported component ───────────────────────────────────────────────

export function ProductsClient({
  initialProductIds,
  initialTotal,
  serverFilters,
}: {
  initialProductIds: string[];
  initialTotal: number;
  serverFilters: { category?: string; status?: string; q?: string };
}) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [search, setSearch] = useState(serverFilters.q ?? "");

  const viewResult = useEntityView<Product>({
    type: "Product",
    baseQueryKey: ["products"],
    initialIds: initialProductIds,
    initialTotal,
    view: {
      filter: serverFilters.category
        ? [{ field: "category", op: "eq", value: serverFilters.category }]
        : undefined,
      sort: [{ field: "stars", direction: "desc" }],
      search: search
        ? { query: search, fields: ["name", "tagline", "description"] }
        : undefined,
    },
    remoteFetch: fetchProductsFromApi,
    normalize: (p) => ({ id: p.id, data: p as Record<string, unknown> }),
    remoteDebounce: 300,
  });

  const editAugment = useEntityAugment<Product>("Product", editTarget?.id);
  const saveMutation = useEntityMutation<{ id: string; patch: Partial<Product> }, Product, Product>({
    type: "Product",
    mutate: async ({ id, patch }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      return res.json();
    },
    normalize: (raw) => ({ id: raw.id, data: raw }),
    optimistic: ({ id, patch }) => ({ id, patch }),
  });

  const handleSave = useCallback(
    async (patch: Partial<Product>) => {
      if (!editTarget) return;
      editAugment.augment(patch);
      try {
        await saveMutation.mutate({ id: editTarget.id, patch });
        editAugment.clear();
      } catch {
        editAugment.clear();
      } finally {
        setEditTarget(null);
      }
    },
    [editTarget, editAugment, saveMutation]
  );

  const handleCategoryClick = (cat: string) => {
    const params = new URLSearchParams(
      serverFilters as Record<string, string>
    );
    if (params.get("category") === cat) params.delete("category");
    else params.set("category", cat);
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[--color-canvas]">
      {/* Sticky header */}
      <div className="border-b border-[--color-border] bg-[--color-surface]/90 backdrop-blur sticky top-12 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {/* Title + search */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl font-semibold text-[--color-ink] flex items-center gap-2">
                <span className="text-[--color-fire]">⬡</span> Product Catalog
              </h1>
              <p className="text-sm text-[--color-ink-3] mt-0.5">
                {viewResult.viewTotal ?? initialTotal} packages
                <span className="mx-1.5 opacity-30">·</span>
                <span className="font-mono text-xs">SSR → entity graph → client</span>
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--color-ink-3]" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  viewResult.setSearch(e.target.value);
                }}
                placeholder="Search packages…"
                className="h-9 pl-9 pr-8 rounded-lg border border-[--color-border] bg-[--color-surface] text-sm text-[--color-ink] placeholder:text-[--color-ink-3] focus:outline-none focus:border-[--color-fire]/60 w-56 transition-colors"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    viewResult.setSearch("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[--color-ink-3] hover:text-[--color-ink]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                  serverFilters.category === cat
                    ? "bg-[--color-fire] text-white border-[--color-fire]"
                    : "bg-white text-[--color-ink-3] border-[--color-border] hover:border-[--color-ink-3]"
                )}
              >
                {cat}
              </button>
            ))}
            {(serverFilters.category || serverFilters.q) && (
              <button
                onClick={() => router.push("/products")}
                className="px-2.5 py-1 rounded-full text-xs text-[--color-ink-3] hover:text-[--color-ink] flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {viewResult.isShowingLocalPending && (
          <p className="text-xs text-[--color-ink-3] mb-4 flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-[--color-fire] border-t-transparent rounded-full animate-spin" />
            Showing local results — fetching from server…
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {viewResult.isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[--color-surface] border border-[--color-border] rounded-xl p-5 flex flex-col gap-3"
                >
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-1/2 mt-auto" />
                </div>
              ))
            : viewResult.items.map((p) => (
                <ProductCard key={p.id} product={p} onEdit={setEditTarget} />
              ))}
        </div>

        {viewResult.items.length === 0 && !viewResult.isLoading && (
          <div className="text-center py-20 text-[--color-ink-3]">
            <p className="text-lg font-medium mb-1">No packages found</p>
            <p className="text-sm">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Suspense demo */}
      <SuspenseDemo />

      {/* Edit sheet */}
      {editTarget && (
        <EditSheet
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
          isSaving={saveMutation.state.isPending}
        />
      )}
    </div>
  );
}

// ── Suspense demo section ────────────────────────────────────────────────

function SuspenseDemo() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-6 pb-8">
      <div className="border border-[--color-border] rounded-xl bg-[--color-surface] overflow-hidden">
        <div className="px-5 py-4 border-b border-[--color-border]">
          <h2 className="text-sm font-display font-semibold text-[--color-ink] flex items-center gap-2">
            <span className="text-[--color-fire]">⚡</span>
            Suspense Demo
          </h2>
          <p className="text-xs text-[--color-ink-3] mt-0.5 font-body">
            <code className="font-mono text-[10px] bg-[--color-surface-2] px-1 py-0.5 rounded">useSuspenseEntity</code>
            {" "}throws a promise while loading, letting React Suspense boundaries handle the fallback UI.
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {["prod1", "prod2", "prod3", "prod4", "prod5"].map((id) => (
              <button
                key={id}
                onClick={() => setSelectedId(selectedId === id ? null : id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  selectedId === id
                    ? "bg-[--color-fire] text-white border-[--color-fire]"
                    : "bg-[--color-surface-2] text-[--color-ink-3] border-[--color-border] hover:border-[--color-ink-3]"
                )}
              >
                {id}
              </button>
            ))}
          </div>

          {selectedId && (
            <Suspense fallback={<SuspenseFallback />}>
              <SuspenseProductCard productId={selectedId} />
            </Suspense>
          )}

          {!selectedId && (
            <p className="text-xs text-[--color-ink-3] py-3">
              Select a product ID above to see Suspense in action
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SuspenseFallback() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-[--color-surface-2] rounded-lg animate-pulse">
      <span className="w-3 h-3 border-2 border-[--color-fire] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-[--color-ink-3]">
        Suspense boundary active — waiting for entity…
      </span>
    </div>
  );
}

async function fetchProductById(id: string): Promise<Product> {
  const res = await globalThis.fetch(`/api/products/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function SuspenseProductCard({ productId }: { productId: string }) {
  const { data: product, isFetching, isStale } = useSuspenseEntity<Product, Product>({
    type: "Product",
    id: productId,
    fetch: fetchProductById,
    normalize: (p) => p,
    staleTime: 30_000,
  });

  return (
    <div className="bg-[--color-surface-2] rounded-lg p-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[--color-ink]">{product.name}</h3>
            {isFetching && (
              <span className="w-2.5 h-2.5 border border-[--color-fire] border-t-transparent rounded-full animate-spin" />
            )}
            {isStale && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                stale
              </span>
            )}
          </div>
          <p className="text-xs text-[--color-ink-3] leading-relaxed">{product.tagline}</p>
        </div>
        <span className="text-[10px] font-mono text-[--color-ink-3] shrink-0">{product.version}</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-[--color-ink-3]">
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          {product.stars.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          {product.downloads.toLocaleString()}
        </span>
        <span className="ml-auto font-mono bg-[--color-surface] px-2 py-0.5 rounded text-[--color-fire]">
          useSuspenseEntity
        </span>
      </div>
    </div>
  );
}
