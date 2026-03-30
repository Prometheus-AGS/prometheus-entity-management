/**
 * Server-side mock data store for the Next.js example.
 * In a real app this would be a database (Postgres, Supabase, etc.)
 * Products are fetched in Server Components and hydrated into the entity graph.
 */
import { generateId } from "./utils";
import type { Product, Maintainer, Review } from "./types";

export const MAINTAINERS: Maintainer[] = [
  { id: "m1", name: "Travis James", handle: "travis", email: "travis@prometheus.dev", avatarInitials: "TJ", avatarColor: "#e85d04", company: "Prometheus AGS", productsOwned: ["prod1","prod2","prod3"] },
  { id: "m2", name: "Sarah Chen",   handle: "schen",  email: "sarah@prometheus.dev",  avatarInitials: "SC", avatarColor: "#4f46e5", company: "Prometheus AGS", productsOwned: ["prod4","prod5"] },
  { id: "m3", name: "Marcus Webb",  handle: "mwebb",  email: "marcus@prometheus.dev", avatarInitials: "MW", avatarColor: "#059669", company: "Prometheus AGS", productsOwned: ["prod6","prod7"] },
];

export const PRODUCTS: Product[] = [
  {
    id: "prod1", name: "Prometheus Core", tagline: "Decentralized agentic infrastructure",
    description: "Peer-to-peer agent orchestration using Iroh QUIC transport with DID-based identity, CRDT sync, and Cedar policy governance. Zero-registration, fully offline-capable.",
    category: "infrastructure", status: "beta", pricing: "open-source",
    stars: 4821, downloads: 18400, version: "0.8.2", language: "Rust",
    tags: ["p2p","agents","did","crdt","cedar"], maintainerId: "m1",
    license: "Apache-2.0", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2025-01-15T10:00:00Z",
    monthlyActiveUsers: 2100, openIssues: 34,
  },
  {
    id: "prod2", name: "Flint IDE", tagline: "Local-first AI development studio",
    description: "Model-agnostic AI development platform with BYOK, agentic code generation, and live collaboration. Built on Tauri 2 + React 19 with a Rust inference core.",
    category: "developer-tools", status: "alpha", pricing: "freemium",
    stars: 3102, downloads: 9800, version: "0.3.0", language: "Rust / TypeScript",
    tags: ["tauri","ai","ide","local-first"], maintainerId: "m1",
    license: "MIT", createdAt: "2024-06-01T00:00:00Z", updatedAt: "2025-01-14T15:00:00Z",
    monthlyActiveUsers: 860, openIssues: 51,
  },
  {
    id: "prod3", name: "WISC CLI", tagline: "Context management for Claude Code",
    description: "Write-Isolate-Select-Compress methodology CLI. Dramatically reduces context window waste in long agentic sessions. Distributable as a Claude Code plugin.",
    category: "developer-tools", status: "ga", pricing: "open-source",
    stars: 1230, downloads: 42000, version: "1.2.1", language: "Rust",
    tags: ["cli","claude","context","ai-tooling"], maintainerId: "m1",
    license: "MIT", createdAt: "2024-08-01T00:00:00Z", updatedAt: "2024-12-15T17:00:00Z",
    monthlyActiveUsers: 5800, openIssues: 12,
  },
  {
    id: "prod4", name: "Flint Gate", tagline: "Rust API gateway with AG-UI support",
    description: "Drop-in Ory Oathkeeper replacement. JWT auth via Kratos, hot-reload YAML config backed by Postgres, SSE stream processing, and native AG-UI/A2UI protocol support.",
    category: "security", status: "beta", pricing: "open-source",
    stars: 892, downloads: 6700, version: "0.5.4", language: "Rust",
    tags: ["gateway","auth","ory","ag-ui"], maintainerId: "m2",
    license: "Apache-2.0", createdAt: "2024-03-01T00:00:00Z", updatedAt: "2025-01-13T12:00:00Z",
    monthlyActiveUsers: 430, openIssues: 22,
  },
  {
    id: "prod5", name: "surreal-memory", tagline: "High-performance MCP memory server",
    description: "SurrealDB-backed MCP memory server with OpenAI, Cohere, and Candle local embeddings. Metal GPU acceleration on Apple Silicon. Drop-in for any MCP-compatible agent.",
    category: "ai-ml", status: "beta", pricing: "open-source",
    stars: 2014, downloads: 14200, version: "0.4.1", language: "Rust",
    tags: ["mcp","rag","surrealdb","embeddings","memory"], maintainerId: "m2",
    license: "MIT", createdAt: "2024-05-01T00:00:00Z", updatedAt: "2025-01-12T09:00:00Z",
    monthlyActiveUsers: 1920, openIssues: 18,
  },
  {
    id: "prod6", name: "Universal Agent Runtime", tagline: "Production-grade agentic LLM runtime",
    description: "Ractor-based actor system for streaming LLM applications. Multi-provider routing, Cedar policy governance, MCP client via rmcp, PGlite local store, and Tauri integration.",
    category: "ai-ml", status: "alpha", pricing: "subscription",
    stars: 1780, downloads: 7300, version: "0.2.3", language: "Rust / TypeScript",
    tags: ["agents","llm","ractor","streaming","mcp"], maintainerId: "m3",
    license: "BSL-1.1", createdAt: "2024-07-01T00:00:00Z", updatedAt: "2025-01-15T11:00:00Z",
    monthlyActiveUsers: 710, openIssues: 44,
  },
  {
    id: "prod7", name: "entity-store", tagline: "Normalized graph store replacing TanStack Query",
    description: "Globally-reactive entity graph for React. Entities live once, lists hold refs, patches are local. REST, GraphQL, Supabase, Convex, ElectricSQL, WebSocket adapters included.",
    category: "developer-tools", status: "alpha", pricing: "open-source",
    stars: 621, downloads: 3100, version: "0.1.0", language: "TypeScript",
    tags: ["react","state","zustand","graphql","realtime"], maintainerId: "m3",
    license: "MIT", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-15T16:00:00Z",
    monthlyActiveUsers: 340, openIssues: 8,
  },
];

export const REVIEWS: Review[] = [
  { id: "r1", productId: "prod1", authorId: "m2", rating: 5, title: "Finally, agents that don't need a central server", body: "The Iroh transport layer is rock solid. First agent framework I've deployed that actually works fully offline.", helpfulVotes: 42, createdAt: "2025-01-10T00:00:00Z" },
  { id: "r2", productId: "prod1", authorId: "m3", rating: 4, title: "CRDT sync is impressive", body: "Conflict resolution just works. Took some time to grok the DID model but the docs are solid.", helpfulVotes: 28, createdAt: "2025-01-08T00:00:00Z" },
  { id: "r3", productId: "prod3", authorId: "m2", rating: 5, title: "Cut my context costs 60%", body: "WISC is now mandatory in every Claude Code session. The compression pass alone is worth it.", helpfulVotes: 87, createdAt: "2024-12-20T00:00:00Z" },
  { id: "r4", productId: "prod5", authorId: "m1", rating: 5, title: "Best MCP memory server out there", body: "Metal GPU acceleration gives sub-10ms embedding on M2. SurrealDB queries are blazing fast.", helpfulVotes: 61, createdAt: "2025-01-05T00:00:00Z" },
  { id: "r5", productId: "prod7", authorId: "m2", rating: 5, title: "TanStack Query replacement I didn't know I needed", body: "One graph node per entity. Mutations to Post:123 propagate to every list, detail panel, and sidebar instantly. No more sync bugs.", helpfulVotes: 34, createdAt: "2025-01-14T00:00:00Z" },
];

// ── Server-side fetch helpers ──────────────────────────────────────────────

const delay = (ms = 0) => new Promise((r) => setTimeout(r, ms));

export async function fetchProducts(params?: {
  category?: string;
  status?: string;
  q?: string;
}): Promise<Product[]> {
  await delay(10); // simulate minimal DB latency
  let items = [...PRODUCTS];
  if (params?.category) items = items.filter((p) => p.category === params.category);
  if (params?.status)   items = items.filter((p) => p.status === params.status);
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q))
    );
  }
  return items;
}

export async function fetchProduct(id: string): Promise<Product | null> {
  await delay(10);
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

export async function fetchMaintainer(id: string): Promise<Maintainer | null> {
  await delay(5);
  return MAINTAINERS.find((m) => m.id === id) ?? null;
}

export async function fetchReviewsForProduct(productId: string): Promise<Review[]> {
  await delay(10);
  return REVIEWS.filter((r) => r.productId === productId);
}

// ── In-memory mutation store (for API routes) ──────────────────────────────

let productsStore = [...PRODUCTS];

export function mutateProduct(id: string, patch: Partial<Product>): Product | null {
  const idx = productsStore.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  productsStore[idx] = { ...productsStore[idx], ...patch, updatedAt: new Date().toISOString() };
  return productsStore[idx];
}

export function createProduct(data: Partial<Product>): Product {
  const now = new Date().toISOString();
  const p: Product = {
    id: generateId(),
    name: data.name ?? "Untitled",
    tagline: data.tagline ?? "",
    description: data.description ?? "",
    category: data.category ?? "developer-tools",
    status: data.status ?? "alpha",
    pricing: data.pricing ?? "open-source",
    stars: 0,
    downloads: 0,
    version: data.version ?? "0.1.0",
    language: data.language ?? "TypeScript",
    tags: data.tags ?? [],
    maintainerId: data.maintainerId ?? "m1",
    license: data.license ?? "MIT",
    createdAt: now,
    updatedAt: now,
    monthlyActiveUsers: 0,
    openIssues: 0,
    ...data,
  };
  productsStore.push(p);
  return p;
}

export function deleteProduct(id: string): boolean {
  const before = productsStore.length;
  productsStore = productsStore.filter((p) => p.id !== id);
  return productsStore.length < before;
}

// ── Review CRUD helpers ─────────────────────────────────────────────────────

let reviewsStore = [...REVIEWS];

export async function fetchReviews(params?: {
  productId?: string;
  rating?: number;
  q?: string;
}): Promise<Review[]> {
  await delay(10);
  let items = [...reviewsStore];
  if (params?.productId) items = items.filter((r) => r.productId === params.productId);
  if (params?.rating) items = items.filter((r) => r.rating === params.rating);
  if (params?.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
    );
  }
  return items;
}

export async function fetchReview(id: string): Promise<Review | null> {
  await delay(10);
  return reviewsStore.find((r) => r.id === id) ?? null;
}

export function createReview(data: Partial<Review>): Review {
  const now = new Date().toISOString();
  const r: Review = {
    id: generateId("r"),
    productId: data.productId ?? "",
    authorId: data.authorId ?? "m1",
    rating: data.rating ?? 3,
    title: data.title ?? "Untitled Review",
    body: data.body ?? "",
    helpfulVotes: 0,
    createdAt: now,
    ...data,
  };
  reviewsStore.push(r);
  return r;
}

export function mutateReview(id: string, patch: Partial<Review>): Review | null {
  const idx = reviewsStore.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  reviewsStore[idx] = { ...reviewsStore[idx], ...patch };
  return reviewsStore[idx];
}

export function deleteReview(id: string): boolean {
  const before = reviewsStore.length;
  reviewsStore = reviewsStore.filter((r) => r.id !== id);
  return reviewsStore.length < before;
}
