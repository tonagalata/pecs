import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(q)}`,
      { next: { revalidate: 86400 } } // cache search results for 24 h
    );
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    // Return at most 24 results to keep the picker grid manageable
    return NextResponse.json(Array.isArray(data) ? data.slice(0, 24) : []);
  } catch {
    return NextResponse.json([]);
  }
}
