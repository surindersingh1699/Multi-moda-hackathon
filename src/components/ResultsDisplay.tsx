import type { StylingResult, StylingItem } from "@/lib/schema";
import { DoodlePillow, DoodleLamp, DoodlePlant, DoodleHeart } from "@/components/DoodleElements";

interface Props {
  result: StylingResult;
  budget?: number;
}

export default function ResultsDisplay({ result, budget = 150 }: Props) {
  const items = result.items ?? [];
  const totalCost =
    typeof result.total_estimated_cost === "number" && isFinite(result.total_estimated_cost)
      ? result.total_estimated_cost
      : items.reduce((s, i) => s + (i.estimated_price ?? 0), 0);
  const buyOrder = Array.isArray(result.buy_order)
    ? result.buy_order.filter((s): s is string => typeof s === "string")
    : items.map((i) => i.name);

  const budgetPercent = Math.min(100, Math.round((totalCost / budget) * 100));

  const barColor =
    budgetPercent < 60 ? '#7EA86A' : budgetPercent < 85 ? '#E8753A' : '#DC2626';

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
        <h2 className="relative text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
          <DoodlePillow className="w-4 h-4 inline-block" />
          Room Reading
          <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
        </h2>
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
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-white/20" />
          <DoodleLamp className="w-4 h-4 inline-block" />
          Style Direction
          <span className="h-px flex-1 bg-white/20" />
        </h2>
        <p className="text-sm text-white leading-relaxed font-medium">
          {result.style_direction || "Cozy and inviting."}
        </p>
      </section>

      {/* ── Recommended Items ── */}
      <section className="animate-slideUp stagger-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-4 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
          <DoodlePlant className="w-4 h-4 inline-block" />
          What to Buy
          <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
        </h2>
        <div className="grid gap-3">
          {items.map((item, index) => (
            <ItemCard key={index} item={item} index={index} />
          ))}
        </div>
      </section>

      {/* ── Buy Order — Timeline ── */}
      <section
        className="animate-slideUp stagger-4 rounded-2xl bg-bg-card border border-accent-100 p-6"
        style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-4 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
          <DoodleHeart className="w-4 h-4 inline-block" />
          Suggested Buy Order
          <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
        </h2>
        <ol className="space-y-0 relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-accent-300 to-accent-100" />

          {buyOrder.map((name, i) => (
            <li key={`${name}-${i}`} className="relative flex items-center gap-4 py-2">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 border-accent-300 bg-bg-card text-accent-600">
                {i + 1}
              </div>
              <span className="text-sm text-txt-secondary font-medium">
                {name}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Budget Tracker — Animated Bar ── */}
      <section
        className="animate-slideUp stagger-5 rounded-2xl bg-bg-card border border-accent-100 p-6"
        style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-4 flex items-center gap-2">
          <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
          Estimated Total
          <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
        </h2>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-3xl font-bold text-txt-primary">
            ${totalCost}
          </span>
          <span className="text-sm text-txt-muted pb-1">/ ${budget} budget</span>
        </div>
        <div className="h-3 w-full rounded-full bg-bg-secondary overflow-hidden">
          <div
            className="h-3 rounded-full animate-fillBar transition-all duration-500"
            style={{ width: `${budgetPercent}%`, background: barColor }}
          />
        </div>
        <p className="text-xs text-txt-muted mt-2">
          {budgetPercent < 60
            ? "Great! Plenty of budget room left."
            : budgetPercent < 85
              ? "Looking good, staying within range."
              : "Getting close to the budget limit."}
        </p>
      </section>
    </div>
  );
}

function ItemCard({ item, index }: { item: StylingItem; index: number }) {
  const name = item.name || "Unnamed item";
  const price = typeof item.estimated_price === "number" ? item.estimated_price : 0;
  const category = item.category || "item";
  const store = item.suggested_store || "Store";
  const searchQuery = item.search_query || name;

  return (
    <div
      className="animate-slideUp flex gap-4 rounded-2xl bg-bg-card border border-accent-100/50 p-4 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        animationDelay: `${0.3 + index * 0.08}s`,
        boxShadow: '0 1px 3px rgba(44,24,16,0.06)',
      }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(44,24,16,0.08)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(44,24,16,0.06)'}
    >
      {/* Priority badge */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-txt-on-accent shadow-sm"
        style={{ background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' }}
      >
        {item.priority ?? index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-txt-primary">{name}</h3>
          <span className="shrink-0 text-sm font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-lg">
            ${price}
          </span>
        </div>

        <p className="mt-1.5 text-xs text-txt-muted leading-relaxed">
          {item.reason || "Recommended for your room."}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Tag label={category} />
          <Tag label={store} />
          <a
            href={`https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-accent-50 border border-accent-200 px-2.5 py-0.5 text-[10px] font-semibold text-accent-600 hover:bg-accent-100 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Amazon
          </a>
          <a
            href={`https://www.walmart.com/search?q=${encodeURIComponent(searchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Walmart
          </a>
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
