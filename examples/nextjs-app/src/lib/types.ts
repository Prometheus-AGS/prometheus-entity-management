/** Shared domain types for the Next.js product catalog example */

export type ProductCategory =
  | "infrastructure"
  | "developer-tools"
  | "ai-ml"
  | "security"
  | "data"
  | "mobile";

export type ProductStatus = "ga" | "beta" | "alpha" | "deprecated" | "planned";

export type PricingModel = "open-source" | "freemium" | "subscription" | "usage-based" | "enterprise";

export interface Product {
  [key: string]: unknown;
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ProductCategory;
  status: ProductStatus;
  pricing: PricingModel;
  stars: number;
  downloads: number;
  version: string;
  language: string;
  tags: string[];
  maintainerId: string;
  license: string;
  createdAt: string;
  updatedAt: string;
  monthlyActiveUsers: number;
  openIssues: number;
}

export interface Maintainer {
  [key: string]: unknown;
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarInitials: string;
  avatarColor: string;
  company: string;
  productsOwned: string[];
}

export interface Review {
  [key: string]: unknown;
  id: string;
  productId: string;
  authorId: string;
  rating: number;
  title: string;
  body: string;
  helpfulVotes: number;
  createdAt: string;
}
