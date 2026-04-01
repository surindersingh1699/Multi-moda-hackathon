import { NextRequest, NextResponse } from "next/server";
import type { StylingItem, ProductMatch, ProductSearchResult } from "@/lib/schema";
import { MOCK_PRODUCT_MATCHES } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";
import { getLocaleConfig } from "@/lib/locale";

const SCRAPERAPI_BASE = "https://api.scraperapi.com/structured/amazon/search";

export async function POST(req: NextRequest) {
  try {
    // Auth check — prevent unauthenticated credit burn
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { matches: [], status: "failed" } satisfies ProductSearchResult,
        { status: 401 },
      );
    }

    const { items, countryCode } = (await req.json()) as { items: StylingItem[]; countryCode?: string };

    if (!items?.length) {
      return NextResponse.json(
        { matches: [], status: "failed" } satisfies ProductSearchResult,
      );
    }

    // Mock mode when no ScraperAPI key is set
    if (!process.env.SCRAPERAPI_KEY) {
      await new Promise((r) => setTimeout(r, 2000));
      return NextResponse.json({
        matches: MOCK_PRODUCT_MATCHES,
        status: "complete",
      } satisfies ProductSearchResult);
    }

    const { amazonTld } = getLocaleConfig(countryCode ?? "US");
    const matches = await searchAllItems(items, amazonTld);
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

/** Search for all items in parallel on Amazon via ScraperAPI */
async function searchAllItems(items: StylingItem[], amazonTld: string): Promise<ProductMatch[]> {
  const results = await Promise.all(
    items.map((item) => searchAmazon(item, amazonTld)),
  );
  return results.filter((m): m is ProductMatch => m !== null);
}

/** Search Amazon via ScraperAPI structured endpoint */
async function searchAmazon(item: StylingItem, amazonTld: string): Promise<ProductMatch | null> {
  try {
    const params = new URLSearchParams({
      api_key: process.env.SCRAPERAPI_KEY!,
      query: item.search_query || item.name,
      tld: amazonTld,
    });

    const res = await fetch(`${SCRAPERAPI_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results = data.results;
    if (!Array.isArray(results) || results.length === 0) return null;

    // Pick best: within 2x budget with price > any with price > first result
    const maxPrice = item.estimated_price * 2;
    const match =
      results.find(
        (r: ScraperApiResult) =>
          typeof r.price === "number" && r.price > 0 && r.price <= maxPrice,
      ) ??
      results.find((r: ScraperApiResult) => typeof r.price === "number" && r.price > 0) ??
      results[0];

    const asin = extractAsin(match.url);

    return {
      item_name: item.name,
      product_title: String(match.name || ""),
      product_url: asin
        ? `https://www.amazon.${amazonTld}/dp/${asin}`
        : String(match.url || ""),
      real_price: typeof match.price === "number" ? match.price : null,
      store: "Amazon",
      thumbnail: typeof match.image === "string" ? match.image : null,
      asin,
    };
  } catch {
    return null;
  }
}

/** Extract ASIN from Amazon product URL (e.g. /dp/B07XBWN8WF) */
function extractAsin(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const match = url.match(/\/dp\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

/** ScraperAPI Amazon search result shape */
interface ScraperApiResult {
  name?: string;
  image?: string;
  price?: number;
  price_string?: string;
  url?: string;
  stars?: number;
  total_reviews?: number;
  has_prime?: boolean;
  is_best_seller?: boolean;
  is_amazon_choice?: boolean;
  position?: number;
}
