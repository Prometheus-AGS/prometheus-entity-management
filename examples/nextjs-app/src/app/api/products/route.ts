import { NextRequest, NextResponse } from "next/server";
import { fetchProducts, createProduct } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? undefined;
  const status   = searchParams.get("status")   ?? undefined;
  const q        = searchParams.get("q")         ?? undefined;

  const products = await fetchProducts({ category, status, q });
  return NextResponse.json({ items: products, total: products.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const product = createProduct(body);
  return NextResponse.json(product, { status: 201 });
}
