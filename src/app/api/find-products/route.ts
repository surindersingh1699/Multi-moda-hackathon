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

/** Search for all items in parallel — Amazon first, Google Shopping fallback */
async function searchAllItems(items: StylingItem[]): Promise<ProductMatch[]> {
  const results = await Promise.all(
    items.map((item) => searchWithFallback(item)),
  );
  return results.filter((m): m is ProductMatch => m !== null);
}

/** Try Amazon first (gets ASINs for cart), fall back to Google Shopping */
async function searchWithFallback(item: StylingItem): Promise<ProductMatch | null> {
  // Try Amazon first — gives us ASINs for "Add to Cart"
  const amazonResult = await searchAmazon(item);
  if (amazonResult) return amazonResult;

  // Fallback to Google Shopping — broader results, no ASINs
  return searchGoogleShopping(item);
}

/** Search on Amazon via SerpAPI — returns ASINs */
async function searchAmazon(item: StylingItem): Promise<ProductMatch | null> {
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
    if (!res.ok) return null;

    const data = await res.json();
    const results = data.organic_results;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Pick best: within 2x budget with ASIN > any with ASIN > first result
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
  } catch {
    return null;
  }
}

/** Fallback: search Google Shopping via SerpAPI — broader results, no ASINs */
async function searchGoogleShopping(item: StylingItem): Promise<ProductMatch | null> {
  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: item.search_query || item.name,
      api_key: process.env.SERPAPI_KEY!,
      gl: "us",
      hl: "en",
      num: "5",
    });

    const res = await fetch(`${SERPAPI_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results = data.shopping_results;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Pick best match within budget
    const maxPrice = item.estimated_price * 2;
    const match =
      results.find(
        (r: Record<string, unknown>) => {
          const price = extractPrice(r);
          return price !== null && price <= maxPrice;
        },
      ) ?? results[0];

    return {
      item_name: item.name,
      product_title: String(match.title || ""),
      product_url: String(match.product_link || match.link || ""),
      real_price: extractPrice(match),
      store: String(match.source || "Google Shopping"),
      thumbnail: typeof match.thumbnail === "string" ? match.thumbnail : null,
      asin: null, // Google Shopping doesn't provide ASINs
    };
  } catch {
    return null;
  }
}

/** Extract numeric price from SerpAPI result (handles string and object formats) */
function extractPrice(result: Record<string, unknown>): number | null {
  const price = result.price;
  // String price like "$49.99"
  if (typeof price === "string") {
    const num = parseFloat(price.replace(/[^0-9.]/g, ""));
    if (!isNaN(num)) return num;
  }
  // Object price like { raw: "$11.99", value: 11.99 }
  if (price && typeof price === "object") {
    const p = price as Record<string, unknown>;
    if (typeof p.extracted_value === "number") return p.extracted_value;
    if (typeof p.value === "number") return p.value;
    if (typeof p.raw === "string") {
      const num = parseFloat(p.raw.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) return num;
    }
  }
  // Google Shopping uses extracted_price at top level
  if (typeof result.extracted_price === "number") return result.extracted_price;
  return null;
}
