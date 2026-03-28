import { NextRequest, NextResponse } from "next/server";
import type { StylingItem, ProductMatch, ProductSearchResult } from "@/lib/schema";
import { MOCK_PRODUCT_MATCHES } from "@/lib/mock";

const SERPAPI_BASE = "https://serpapi.com/search.json";

export async function POST(req: NextRequest) {
  try {
    const { items } = (await req.json()) as { items: StylingItem[] };

    if (!items?.length) {
      return NextResponse.json(
        { matches: [], status: "failed" } satisfies ProductSearchResult,
      );
    }

    // Mock mode when no SerpAPI key is set
    if (!process.env.SERPAPI_KEY) {
      await new Promise((r) => setTimeout(r, 2000));
      return NextResponse.json({
        matches: MOCK_PRODUCT_MATCHES,
        status: "complete",
      } satisfies ProductSearchResult);
    }

    const matches = await searchAllItems(items);
    return NextResponse.json({
      matches,
      status: matches.length > 0 ? "complete" : "partial",
    } satisfies ProductSearchResult);
  } catch (e) {
    console.error("Find products error:", e);
    return NextResponse.json({
      matches: [],
      status: "failed",
    } satisfies ProductSearchResult);
  }
}

/** Search for all items in parallel via SerpAPI Amazon */
async function searchAllItems(items: StylingItem[]): Promise<ProductMatch[]> {
  const results = await Promise.all(
    items.map((item) => searchOneItem(item)),
  );
  return results.filter((m): m is ProductMatch => m !== null);
}

/** Search for a single item on Amazon via SerpAPI */
async function searchOneItem(item: StylingItem): Promise<ProductMatch | null> {
  try {
    const params = new URLSearchParams({
      engine: "amazon",
      amazon_domain: "amazon.com",
      k: item.search_query || item.name,
      api_key: process.env.SERPAPI_KEY!,
    });

    const res = await fetch(`${SERPAPI_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`SerpAPI error for "${item.name}": ${res.status} ${body}`);
      return null;
    }

    const data = await res.json();
    const results = data.organic_results;
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    // Find the best match: prefer results within ~2x the budget that have an ASIN
    const maxPrice = item.estimated_price * 2;
    const match =
      results.find(
        (r: Record<string, unknown>) => {
          const price = extractPrice(r);
          return r.asin && price !== null && price <= maxPrice;
        },
      ) ?? results.find((r: Record<string, unknown>) => r.asin) ?? results[0];

    const asin = typeof match.asin === "string" ? match.asin : null;

    return {
      item_name: item.name,
      product_title: String(match.title || ""),
      product_url: asin
        ? `https://www.amazon.com/dp/${asin}`
        : String(match.link || ""),
      real_price: extractPrice(match),
      store: "Amazon",
      thumbnail: typeof match.thumbnail === "string" ? match.thumbnail : null,
      asin,
    };
  } catch (e) {
    console.error(`Search failed for "${item.name}":`, e);
    return null;
  }
}

/** Extract numeric price from SerpAPI Amazon result */
function extractPrice(result: Record<string, unknown>): number | null {
  // SerpAPI Amazon returns price as { raw: "$11.99", value: 11.99, currency: "USD" }
  const price = result.price as Record<string, unknown> | undefined;
  if (price && typeof price === "object") {
    if (typeof price.extracted_value === "number") return price.extracted_value;
    if (typeof price.value === "number") return price.value;
    // Try parsing raw string
    if (typeof price.raw === "string") {
      const num = parseFloat(price.raw.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) return num;
    }
  }
  // Fallback: check top-level extracted_price
  if (typeof result.extracted_price === "number") return result.extracted_price;
  return null;
}
