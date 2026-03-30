import { NextRequest, NextResponse } from "next/server";
import { fetchReviews, createReview } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const productId = searchParams.get("productId") ?? undefined;
  const rating = searchParams.get("rating") ? Number(searchParams.get("rating")) : undefined;
  const q = searchParams.get("q") ?? undefined;

  const reviews = await fetchReviews({ productId, rating, q });
  return NextResponse.json({ items: reviews, total: reviews.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const review = createReview(body);
  return NextResponse.json(review, { status: 201 });
}
