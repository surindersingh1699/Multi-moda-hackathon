"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/lib/locale";
import { fetchFavorites, removeFavorite } from "@/lib/supabase/db";
import type { FavoriteRow } from "@/lib/supabase/db";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FavoritesPanel({ open, onClose }: Props) {
  const { user } = useAuth();
  const locale = useLocale();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedList, setCopiedList] = useState(false);

  const userId = user?.id;
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const supabase = createClient();
    const rows = await fetchFavorites(supabase, userId);
    setFavorites(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (open && userId) load();
  }, [open, userId, load]);

  const handleRemove = async (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    const supabase = createClient();
    await removeFavorite(supabase, id);
  };

  const handleCopyAll = () => {
    const fallbackSearch = locale.fallbackStores[0]?.searchUrl ?? ((q: string) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`);
    const lines = favorites.map((f) => {
      const price = f.real_price ?? f.estimated_price ?? 0;
      const url = f.product_url ?? fallbackSearch(f.search_query || f.item_name);
      return `${f.item_name} — ${locale.currencySymbol}${price} — ${url}`;
    });
    const total = favorites.reduce((sum, f) => sum + (f.real_price ?? f.estimated_price ?? 0), 0);
    const text = `My Roomify Favorites (${locale.currencySymbol}${total})\n${lines.join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedList(true);
      setTimeout(() => setCopiedList(false), 2000);
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative ml-auto w-full max-w-md h-full bg-bg-page border-l border-accent-100 overflow-y-auto animate-slideInRight"
        style={{ boxShadow: "-4px 0 20px rgba(44,24,16,0.1)" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-page/90 backdrop-blur-md border-b border-accent-100/50 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-txt-primary">My Favorites</h2>
            <p className="text-[10px] text-txt-muted">{favorites.length} saved items</p>
          </div>
          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <button
                onClick={handleCopyAll}
                className="text-[10px] font-semibold text-accent-500 border border-accent-200 rounded-full px-2.5 py-1 hover:bg-accent-50 transition-colors"
              >
                {copiedList ? "Copied!" : "Copy All"}
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-card border border-accent-100 text-txt-muted hover:bg-accent-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-8 h-8 rounded-full border-2 border-accent-200 border-t-accent-500 animate-spin" />
              <p className="text-xs text-txt-muted">Loading favorites...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <svg className="w-10 h-10 mx-auto text-accent-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p className="text-sm text-txt-secondary">No favorites yet</p>
              <p className="text-xs text-txt-muted">Tap the heart on any item to save it here</p>
            </div>
          ) : (
            favorites.map((fav) => (
              <FavoriteCard key={fav.id} fav={fav} onRemove={() => handleRemove(fav.id)} currencySymbol={locale.currencySymbol} fallbackSearchUrl={locale.fallbackStores[0]?.searchUrl} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FavoriteCard({ fav, onRemove }: { fav: FavoriteRow; onRemove: () => void }) {
  const price = fav.real_price ?? fav.estimated_price ?? 0;
  const searchQuery = fav.search_query || fav.item_name;

  return (
    <div
      className="rounded-2xl bg-bg-card border border-accent-100/50 p-3 transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "0 1px 3px rgba(44,24,16,0.06)" }}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {fav.thumbnail ? (
          <img
            src={fav.thumbnail}
            alt={fav.item_name}
            className="h-10 w-10 shrink-0 rounded-xl object-cover border border-accent-100/50"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 border border-accent-100/50">
            <svg className="w-4 h-4 text-accent-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-txt-primary truncate">{fav.item_name}</h3>
            <span className="text-sm font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-lg shrink-0">
              ${price}
            </span>
          </div>

          {fav.product_title && (
            <p className="text-[10px] text-sage-400 font-medium mt-0.5 truncate">{fav.product_title}</p>
          )}

          {fav.reason && (
            <p className="text-xs text-txt-muted mt-1 line-clamp-2">{fav.reason}</p>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            {fav.item_category && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize bg-bg-secondary text-txt-muted border border-accent-100/50">
                {fav.item_category}
              </span>
            )}
            {fav.store && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize bg-bg-secondary text-txt-muted border border-accent-100/50">
                {fav.store}
              </span>
            )}
            {fav.product_url ? (
              <a
                href={fav.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-sage-100 border border-sage-400 px-3 py-0.5 text-[10px] font-semibold text-sage-400 hover:bg-sage-400 hover:text-white transition-colors"
              >
                Buy Now
              </a>
            ) : (
              <a
                href={`https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-accent-50 border border-accent-200 px-2.5 py-0.5 text-[10px] font-semibold text-accent-600 hover:bg-accent-100 transition-colors"
              >
                Search
              </a>
            )}
            <button
              onClick={onRemove}
              className="ml-auto text-txt-muted hover:text-err-500 transition-colors p-0.5"
              title="Remove from favorites"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
