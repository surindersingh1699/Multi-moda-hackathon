"use client";

import type { StylingItem } from "@/lib/schema";
import { getAmazonSearchUrl } from "@/lib/decorator/utils";
import { DecoratorIcon } from "./DecoratorIcon";

interface ItemPanelProps {
  items: StylingItem[];
  placedIds: Set<string>;
  highlightedId: string | null;
  onHoverItem: (id: string | null) => void;
  onToggleItem: (item: StylingItem) => void;
}

export default function ItemPanel({
  items,
  placedIds,
  highlightedId,
  onHoverItem,
  onToggleItem,
}: ItemPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">
          Recommended Items
        </h3>
        <span className="text-[10px] text-txt-muted">
          {placedIds.size}/{items.length} placed
        </span>
      </div>

      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
        {items.map((item) => {
          const isPlaced = placedIds.has(item.name);
          const isHovered = highlightedId === item.name;

          return (
            <div
              key={item.name}
              className={`
                flex-shrink-0 flex items-center gap-2.5 rounded-xl border p-2.5 transition-all duration-200 cursor-pointer
                w-[200px] md:w-full
                ${isHovered
                  ? "border-accent-400 bg-accent-50 shadow-sm"
                  : isPlaced
                    ? "border-accent-200 bg-accent-50/50"
                    : "border-accent-100 bg-bg-card hover:border-accent-200 hover:shadow-sm"
                }
              `}
              onMouseEnter={() => onHoverItem(item.name)}
              onMouseLeave={() => onHoverItem(null)}
              onClick={() => onToggleItem(item)}
            >
              {/* Icon */}
              <div className={`w-9 h-9 flex-shrink-0 rounded-lg p-1.5 ${isPlaced ? "bg-accent-100" : "bg-accent-50"}`}>
                <DecoratorIcon category={item.category} className="w-full h-full" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-txt-primary truncate">
                  {item.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-medium text-accent-500">
                    ${item.estimated_price}
                  </span>
                  <span className="text-[10px] text-txt-muted capitalize">
                    {item.category.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                {isPlaced ? (
                  <span className="w-5 h-5 rounded-full bg-accent-400 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-dashed border-accent-200 flex items-center justify-center text-accent-300 text-xs">
                    +
                  </span>
                )}

                <a
                  href={getAmazonSearchUrl(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-medium text-accent-500 hover:text-accent-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Buy
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
