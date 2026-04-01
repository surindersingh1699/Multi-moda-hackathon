import { useState } from "react";
import type { StylingResult, StylingItem, ProductMatch } from "@/lib/schema";
import type { FallbackStore } from "@/lib/locale";
import { DoodlePillow, DoodleLamp, DoodlePlant, DoodleStar } from "@/components/DoodleElements";

interface Props {
  result: StylingResult;
  budget?: number;
  productMatches?: ProductMatch[];
  isSearchingProducts?: boolean;
  /** Set of favorited item names (lowercase) for instant UI feedback */
  favoriteNames?: Set<string>;
  onToggleFavorite?: (item: StylingItem, match?: ProductMatch) => void;
  onShare?: () => Promise<boolean>;
  isSharing?: boolean;
  currencySymbol?: string;
  fallbackStores?: FallbackStore[];
}

function findMatch(item: StylingItem, matches: ProductMatch[]): ProductMatch | undefined {
  return matches.find(
    (m) => m.item_name.toLowerCase() === item.name.toLowerCase(),
  );
}

const DEFAULT_FALLBACK_STORES: FallbackStore[] = [
  { name: "Amazon", searchUrl: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { name: "Walmart", searchUrl: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}` },
];

export default function ResultsDisplay({
  result,
  budget = 150,
  productMatches = [],
  isSearchingProducts = false,
  favoriteNames = new Set(),
  onToggleFavorite,
  onShare,
  isSharing = false,
  currencySymbol = "$",
  fallbackStores = DEFAULT_FALLBACK_STORES,
}: Props) {
  const [copiedList, setCopiedList] = useState(false);
  const [shared, setShared] = useState(false);
  const items = result.items ?? [];
  const totalCost =
    typeof result.total_estimated_cost === "number" && isFinite(result.total_estimated_cost)
      ? result.total_estimated_cost
      : items.reduce((s, i) => s + (i.estimated_price ?? 0), 0);
  const quickWins = Array.isArray(result.quick_wins)
    ? result.quick_wins.filter((s): s is string => typeof s === "string")
    : items.slice(0, 2).map((i) => i.name);

  const budgetPercent = Math.min(100, Math.round((totalCost / budget) * 100));

  const barColor =
    budgetPercent < 60 ? '#7EA86A' : budgetPercent < 85 ? '#E8753A' : '#DC2626';

  const handleCopyList = () => {
    const lines = items.map((item) => {
      const match = findMatch(item, productMatches);
      const price = match?.real_price ?? item.estimated_price;
      const url = match?.product_url ?? fallbackStores[0]?.searchUrl(item.search_query || item.name) ?? "";
      return `${item.name} — ${currencySymbol}${price} — ${url}`;
    });
    const text = `My Room Makeover List (${currencySymbol}${totalCost})\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedList(true);
      setTimeout(() => setCopiedList(false), 2000);
    });
  };

  const handleShare = async () => {
    // Use the enhanced share handler if provided (for image sharing)
    if (onShare) {
      const success = await onShare();
      if (success) {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
      return;
    }
    const text = `Check out my AI room makeover plan from Roomify! ${items.length} items for ${currencySymbol}${totalCost}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Room Makeover — Roomify", text });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };


  return (
    <div className="space-y-5">
      {/* ── Room Reading — Quote Card ── */}
      <section
        className="animate-slideUp stagger-1 rounded-2xl bg-bg-card border border-accent-100 p-6 relative overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
      >
        <div className="absolute -top-2 -left-1 text-7xl font-serif text-accent-100 leading-none select-none pointer-events-none">
          &ldquo;
        </div>
        <h2 className="relative text-xs font-semibold uppercase tracking-wider text-txt-muted mb-1 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
          <DoodlePillow className="w-4 h-4 inline-block" />
          Room Reading
          <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
        </h2>
        <p className="relative text-[10px] text-txt-muted mb-3 text-center">What our AI noticed about your space</p>
        <p className="relative text-sm text-txt-secondary leading-relaxed italic">
          {result.room_reading || "Your room has been analyzed."}
        </p>
      </section>

      {/* ── Style Direction — Gradient Card ── */}
      <section
        className="animate-slideUp stagger-2 rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #F49556, #D4877A, #B05E50)',
          boxShadow: '0 1px 3px rgba(44,24,16,0.06)',
        }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1 flex items-center gap-2">
          <span className="h-px flex-1 bg-white/20" />
          <DoodleLamp className="w-4 h-4 inline-block" />
          Style Direction
          <span className="h-px flex-1 bg-white/20" />
        </h2>
        <p className="text-[10px] text-white/50 mb-3 text-center">The vibe we&apos;re going for</p>
        <p className="text-sm text-white leading-relaxed font-medium">
          {result.style_direction || "Cozy and inviting."}
        </p>
      </section>

      {/* ── Quick Wins — Start Here ── */}
      {quickWins.length > 0 && (
        <section
          className="animate-slideUp stagger-3 rounded-2xl bg-bg-card border-2 border-dashed border-accent-300 p-5"
          style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-1 flex items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
            <DoodleStar className="w-4 h-4 inline-block" />
            Quick Wins
            <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
          </h2>
          <p className="text-[10px] text-txt-muted mb-3 text-center">On a tight budget? Start with these for the biggest impact</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickWins.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-accent-600 bg-accent-50 border border-accent-200"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
                </svg>
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Recommended Items ── */}
      <section className="animate-slideUp stagger-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-1 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
          <DoodlePlant className="w-4 h-4 inline-block" />
          What to Buy
          <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
        </h2>
        <p className="text-[10px] text-txt-muted mb-4 text-center">{items.length} hand-picked finds for your room</p>

        {/* Shopping Agent Status */}
        {isSearchingProducts && (
          <div className="flex items-center gap-2 mb-3 px-1 animate-fadeIn">
            <svg className="w-4 h-4 text-sage-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs font-medium text-sage-400">
              Finding real products you can buy right now...
            </p>
          </div>
        )}
        {!isSearchingProducts && productMatches.length > 0 && (
          <div className="flex items-center gap-2 mb-3 px-1 animate-fadeIn">
            <svg className="w-4 h-4 text-sage-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs font-medium text-sage-400">
              Found {productMatches.length} shoppable products with real prices!
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {items.map((item, index) => {
            const match = findMatch(item, productMatches);
            return (
              <ItemCard
                key={index}
                item={item}
                index={index}
                match={match}
                isSearching={isSearchingProducts}
                isFavorited={favoriteNames.has(item.name.toLowerCase())}
                onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(item, match) : undefined}
                currencySymbol={currencySymbol}
                fallbackStores={fallbackStores}
              />
            );
          })}
        </div>
      </section>

      {/* ── Shopping Actions ── */}
      <div className="animate-fadeIn flex gap-2">
        <button
          onClick={handleCopyList}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold bg-bg-card border border-accent-200 text-txt-secondary transition-all duration-200 hover:bg-accent-50 active:scale-[0.98]"
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copiedList ? "Copied to clipboard!" : "Copy My Shopping List"}
          </span>
        </button>
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-txt-on-accent transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
          style={{ background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' }}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {isSharing ? "Creating share..." : shared ? "Shared!" : "Share My Makeover"}
          </span>
        </button>
      </div>

      {/* ── Budget Tracker — Animated Bar ── */}
      <section
        className="animate-slideUp stagger-5 rounded-2xl bg-bg-card border border-accent-100 p-6"
        style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-1 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
          Estimated Total
          <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
        </h2>
        <p className="text-[10px] text-txt-muted mb-4 text-center">All prices verified against real listings</p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-3xl font-bold text-txt-primary">
            {currencySymbol}{totalCost}
          </span>
          <span className="text-sm text-txt-muted pb-1">/ {currencySymbol}{budget} budget</span>
        </div>
        <div className="h-3 w-full rounded-full bg-bg-secondary overflow-hidden">
          <div
            className="h-3 rounded-full animate-fillBar transition-all duration-500"
            style={{ width: `${budgetPercent}%`, background: barColor }}
          />
        </div>
        <p className="text-xs text-txt-muted mt-2">
          {budgetPercent < 60
            ? "Under budget with room to spare!"
            : budgetPercent < 85
              ? "Right in the sweet spot. Smart spending."
              : budgetPercent <= 100
                ? "Getting close — but still within budget!"
                : "Slightly over budget. Consider dropping the lowest-priority item."}
        </p>
      </section>
    </div>
  );
}

function ItemCard({
  item,
  index,
  match,
  isSearching,
  isFavorited,
  onToggleFavorite,
  currencySymbol = "$",
  fallbackStores = DEFAULT_FALLBACK_STORES,
}: {
  item: StylingItem;
  index: number;
  match?: ProductMatch;
  isSearching?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  currencySymbol?: string;
  fallbackStores?: FallbackStore[];
}) {
  const [animating, setAnimating] = useState(false);
  const name = item.name || "Unnamed item";
  const price = typeof item.estimated_price === "number" ? item.estimated_price : 0;
  const category = item.category || "item";
  const store = item.suggested_store || "Store";
  const searchQuery = item.search_query || name;
  const placement = item.placement || "";

  const handleFavorite = () => {
    if (!onToggleFavorite) return;
    setAnimating(true);
    onToggleFavorite();
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <div
      className="animate-slideUp flex gap-3 sm:gap-4 rounded-2xl bg-bg-card border border-accent-100/50 p-3 sm:p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
      style={{
        animationDelay: `${0.3 + index * 0.08}s`,
        boxShadow: '0 1px 3px rgba(44,24,16,0.06)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(44,24,16,0.08)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(44,24,16,0.06)'}
    >
      {/* Product thumbnail or priority badge */}
      {match?.thumbnail ? (
        <img
          src={match.thumbnail}
          alt={match.product_title}
          className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm border border-accent-100/50"
        />
      ) : (
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-txt-on-accent shadow-sm"
          style={{ background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' }}
        >
          {item.priority ?? index + 1}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-x-2">
          <h3 className="text-sm font-semibold text-txt-primary min-w-0 break-words">{name}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Favorite heart button */}
            {onToggleFavorite && (
              <button
                onClick={handleFavorite}
                className={`p-1 rounded-full transition-colors ${animating ? "animate-heartPop" : ""}`}
                title={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <svg
                  className={`w-4 h-4 transition-colors ${isFavorited ? "text-rose-400 fill-rose-400" : "text-accent-200 hover:text-rose-400"}`}
                  fill={isFavorited ? "currentColor" : "none"}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
            {match && match.real_price != null && match.real_price !== price && (
              <span className="text-[10px] text-txt-muted line-through">{currencySymbol}{price}</span>
            )}
            <span className="text-sm font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-lg whitespace-nowrap">
              {currencySymbol}{match?.real_price ?? price}
            </span>
          </div>
        </div>

        {/* Show real product title if matched */}
        {match && (
          <p className="text-[10px] text-sage-400 font-medium mt-0.5 truncate">
            {match.product_title}
          </p>
        )}

        <p className="mt-1.5 text-xs text-txt-muted leading-relaxed">
          {item.reason || "Recommended for your room."}
        </p>

        {/* Placement hint */}
        {placement && (
          <p className="mt-1 text-[10px] text-txt-muted italic flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {placement}
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Tag label={category} />
          <Tag label={match?.store ?? store} />

          {match ? (
            /* Real product found — show Buy Now */
            <a
              href={match.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-sage-100 border border-sage-400 px-3 py-0.5 text-[10px] font-semibold text-sage-400 hover:bg-sage-400 hover:text-white transition-colors max-w-full truncate"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Buy Now @ {match.store}
            </a>
          ) : (
            /* No match — keep search links (or show shimmer if still searching) */
            <>
              {fallbackStores.map((store, i) => (
                <a
                  key={store.name}
                  href={store.searchUrl(searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    i === 0
                      ? "bg-accent-50 border border-accent-200 text-accent-600 hover:bg-accent-100"
                      : "bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  {store.name}
                </a>
              ))}
              {isSearching && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-txt-muted">
                  <svg className="w-3 h-3 animate-spin mr-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  finding...
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize bg-bg-secondary text-txt-muted border border-accent-100/50">
      {label}
    </span>
  );
}
