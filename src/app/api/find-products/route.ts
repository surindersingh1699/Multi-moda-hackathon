import { NextRequest, NextResponse } from "next/server";
import type { StylingItem, ProductMatch, ProductSearchResult } from "@/lib/schema";
import { MOCK_PRODUCT_MATCHES } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";
import { getLocaleConfig } from "@/lib/locale-config";
import { rateLimit } from "@/lib/rate-limit";

const SCRAPERAPI_BASE = "https://api.scraperapi.com/structured/amazon/search";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 20 requests per minute per IP
    const rl = rateLimit(req, { maxRequests: 20, windowMs: 60_000 });
    if (rl) return rl;

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

/** Score an Amazon result by quality signals, not just price */
function scoreResult(r: ScraperApiResult, estimatedPrice: number): number {
  let score = 0;

  // Price: must exist and be reasonable (within 2.5x estimated)
  if (typeof r.price !== "number" || r.price <= 0) return -1;
  if (r.price > estimatedPrice * 2.5) return -1;

  // Rating quality (0-50 points): strong ratings matter most
  const stars = typeof r.stars === "number" ? r.stars : 0;
  if (stars >= 4.5) score += 50;
  else if (stars >= 4.0) score += 40;
  else if (stars >= 3.5) score += 25;
  else if (stars > 0) score += 10;
  // No rating = 0 points (unknown quality, not penalized hard)

  // Review volume (0-25 points): social proof, but diminishing returns
  // log scale so 200 reviews scores well even against 10k review mass-market items
  const reviews = typeof r.total_reviews === "number" ? r.total_reviews : 0;
  if (reviews > 0) score += Math.min(25, Math.round(Math.log10(reviews + 1) * 8));

  // Badge bonus (0-15 points): Amazon-curated quality signals
  if (r.is_amazon_choice) score += 15;
  else if (r.is_best_seller) score += 10;

  // Prime (0-5 points): faster delivery, usually better quality control
  if (r.has_prime) score += 5;

  // Price-to-value (0-10 points): closer to estimated = better fit
  const priceRatio = r.price / estimatedPrice;
  if (priceRatio >= 0.5 && priceRatio <= 1.5) score += 10;
  else if (priceRatio >= 0.3 && priceRatio <= 2.0) score += 5;

  return score;
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

    // Score all candidates and pick the best quality product
    let bestMatch: ScraperApiResult = results[0];
    let bestScore = -Infinity;

    for (const r of results as ScraperApiResult[]) {
      const s = scoreResult(r, item.estimated_price);
      if (s > bestScore) {
        bestScore = s;
        bestMatch = r;
      }
    }

    // If no scored result was viable, fall back to first with a price
    if (bestScore < 0) {
      bestMatch =
        results.find((r: ScraperApiResult) => typeof r.price === "number" && r.price > 0) ??
        results[0];
    }

    const asin = extractAsin(bestMatch.url);

    return {
      item_name: item.name,
      product_title: String(bestMatch.name || ""),
      product_url: asin
        ? `https://www.amazon.${amazonTld}/dp/${asin}`
        : String(bestMatch.url || ""),
      real_price: typeof bestMatch.price === "number" ? bestMatch.price : null,
      store: "Amazon",
      thumbnail: typeof bestMatch.image === "string" ? bestMatch.image : null,
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
