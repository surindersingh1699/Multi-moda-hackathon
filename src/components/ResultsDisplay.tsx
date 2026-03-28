import type { StylingResult, StylingItem } from "@/lib/schema";
import { DoodlePillow, DoodleLamp, DoodlePlant, DoodleHeart } from "@/components/DoodleElements";

interface Props {
  result: StylingResult;
  activeItems: StylingItem[];
  onRemoveItem: (name: string) => void;
}

export default function ResultsDisplay({ result, activeItems, onRemoveItem }: Props) {
  const totalCost = activeItems.reduce((s, i) => s + (i.estimated_price ?? 0), 0);
  const removedCount = result.items.length - activeItems.length;

  return (
    <div className="space-y-5">
      {/* ── Room Reading ── */}
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

      {/* ── Style Direction ── */}
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-txt-muted flex items-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-accent-200 to-transparent" />
            <DoodlePlant className="w-4 h-4 inline-block" />
            Recommended Items
          </h2>
          <div className="flex items-center gap-3">
            {removedCount > 0 && (
              <span className="text-[10px] text-txt-muted">
                {removedCount} removed
              </span>
            )}
            <span className="text-xs font-semibold text-txt-secondary bg-bg-secondary px-2.5 py-1 rounded-lg">
              {activeItems.length} items &middot; ${totalCost}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-txt-muted mb-3">
          Sorted by impact. Remove items you don&apos;t need — your total updates automatically.
        </p>
        <div className="grid gap-3">
          {activeItems.map((item, index) => (
            <ItemCard
              key={item.name}
              item={item}
              index={index}
              onRemove={() => onRemoveItem(item.name)}
            />
          ))}
        </div>
        {activeItems.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-accent-100 p-8 text-center">
            <p className="text-sm text-txt-muted">All items removed. Analyze again to get fresh suggestions.</p>
          </div>
        )}
      </section>

      {/* ── Buy Order ── */}
      {activeItems.length > 0 && (
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
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-accent-300 to-accent-100" />
            {activeItems.map((item, i) => (
              <li key={item.name} className="relative flex items-center gap-4 py-2">
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border-2 border-accent-300 bg-bg-card text-accent-600">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-txt-secondary font-medium">{item.name}</span>
                  <span className="text-xs text-txt-muted ml-2">${item.estimated_price}</span>
                </div>
              </li>
            ))}
          </ol>

          {/* Running total */}
          <div className="mt-4 pt-4 border-t border-accent-100 flex items-center justify-between">
            <span className="text-xs text-txt-muted">Estimated total for selected items</span>
            <span className="text-lg font-bold text-txt-primary">${totalCost}</span>
          </div>
        </section>
      )}
    </div>
  );
}

function ItemCard({
  item,
  index,
  onRemove,
}: {
  item: StylingItem;
  index: number;
  onRemove: () => void;
}) {
  const name = item.name || "Unnamed item";
  const price = typeof item.estimated_price === "number" ? item.estimated_price : 0;
  const category = item.category ? item.category.replace("_", " ") : "item";
  const store = item.suggested_store || "Store";

  return (
    <div
      className="animate-slideUp group flex gap-4 rounded-2xl bg-bg-card border border-accent-100/50 p-4 transition-all duration-300 hover:-translate-y-0.5"
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
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-lg">
              ${price}
            </span>
            <button
              onClick={onRemove}
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex h-6 w-6 items-center justify-center rounded-full bg-err-50 text-err-400 hover:bg-err-100 hover:text-err-600"
              title="Remove item"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <p className="mt-1.5 text-xs text-txt-muted leading-relaxed">
          {item.reason || "Recommended for your room."}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Tag label={category} />
          <Tag label={store} />
          <a
            href={`https://www.amazon.com/s?k=${encodeURIComponent(name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-accent-50 border border-accent-200 px-2.5 py-0.5 text-[10px] font-semibold text-accent-600 hover:bg-accent-100 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Buy
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
