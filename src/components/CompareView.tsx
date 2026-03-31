"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { fetchAnalyses, getSignedImageUrl } from "@/lib/supabase/db";
import type { AnalysisRow } from "@/lib/supabase/db";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CompareView({ open, onClose }: Props) {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [comparing, setComparing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const rows = await fetchAnalyses(supabase, user.id);
    setAnalyses(rows);
    setLoading(false);

    const urls: Record<string, string> = {};
    for (const row of rows) {
      if (row.original_image_path) {
        const url = await getSignedImageUrl(supabase, row.original_image_path);
        if (url) urls[row.id] = url;
      }
    }
    setImageUrls(urls);
  }, [user]);

  useEffect(() => {
    if (open && user) {
      load();
      setSelected(new Set());
      setComparing(false);
    }
  }, [open, user, load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const selectedRows = useMemo(
    () => analyses.filter((a) => selected.has(a.id)),
    [analyses, selected],
  );

  // Deduplicate items across selected analyses by category
  const combinedItems = useMemo(() => {
    const all = selectedRows.flatMap((r) => r.result?.items ?? []);
    const seen = new Set<string>();
    return all.filter((item) => {
      const key = `${item.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedRows]);

  const combinedTotal = combinedItems.reduce((s, i) => s + (i.estimated_price ?? 0), 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative ml-auto w-full max-w-2xl h-full bg-bg-page border-l border-accent-100 overflow-y-auto animate-slideInRight"
        style={{ boxShadow: "-4px 0 20px rgba(44,24,16,0.1)" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-page/90 backdrop-blur-md border-b border-accent-100/50 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-txt-primary">
              {comparing ? "Room Comparison" : "Select Rooms to Compare"}
            </h2>
            <p className="text-[10px] text-txt-muted">
              {comparing
                ? `Comparing ${selectedRows.length} rooms`
                : `Select 2-3 rooms (${selected.size} selected)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {comparing && (
              <button
                onClick={() => setComparing(false)}
                className="text-[10px] font-semibold text-accent-500 border border-accent-200 rounded-full px-2.5 py-1 hover:bg-accent-50 transition-colors"
              >
                Back
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

        <div className="p-5">
          {!comparing ? (
            /* ── Selection Mode ── */
            <div className="space-y-3">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-accent-200 border-t-accent-500 animate-spin" />
                  <p className="text-xs text-txt-muted">Loading your rooms...</p>
                </div>
              ) : analyses.length < 2 ? (
                <div className="text-center py-12 space-y-2">
                  <p className="text-sm text-txt-secondary">Need at least 2 analyses to compare</p>
                  <p className="text-xs text-txt-muted">Analyze more rooms to unlock comparison</p>
                </div>
              ) : (
                <>
                  {analyses.map((row) => {
                    const isSelected = selected.has(row.id);
                    return (
                      <button
                        key={row.id}
                        onClick={() => toggle(row.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 text-left ${
                          isSelected
                            ? "border-accent-400 bg-accent-50"
                            : "border-accent-100/50 bg-bg-card hover:border-accent-200"
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-accent-500 bg-accent-500" : "border-accent-200"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-accent-50 border border-accent-100/50 shrink-0">
                          {imageUrls[row.id] ? (
                            <img src={imageUrls[row.id]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-accent-200">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-txt-primary truncate">
                            {row.result?.style_direction?.slice(0, 50) || "Room Analysis"}
                          </p>
                          <p className="text-[10px] text-txt-muted">
                            {row.result?.items?.length ?? 0} items &middot; ${row.result?.total_estimated_cost ?? 0}
                            {row.vibe && ` &middot; ${row.vibe}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Compare button */}
                  {selected.size >= 2 && (
                    <button
                      onClick={() => setComparing(true)}
                      className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-txt-on-accent transition-all active:scale-[0.98] mt-4"
                      style={{ background: "linear-gradient(135deg, #E8753A, #D4622D, #B84E20)" }}
                    >
                      Compare {selected.size} Rooms
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ── Comparison View ── */
            <div className="space-y-6">
              {/* Side by side rooms */}
              <div className={`grid gap-4 ${selectedRows.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {selectedRows.map((row) => (
                  <div key={row.id} className="space-y-2">
                    {/* Image */}
                    <div className="aspect-square rounded-2xl overflow-hidden bg-accent-50 border border-accent-100">
                      {imageUrls[row.id] ? (
                        <img src={imageUrls[row.id]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-accent-200">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Style direction */}
                    <div
                      className="rounded-xl p-3 text-xs text-white font-medium leading-relaxed"
                      style={{ background: "linear-gradient(135deg, #F49556, #D4877A, #B05E50)" }}
                    >
                      {row.result?.style_direction?.slice(0, 100) || "No style direction"}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
                        ${row.result?.total_estimated_cost ?? 0}
                      </span>
                      <span className="text-txt-muted">
                        {row.result?.items?.length ?? 0} items
                      </span>
                      {row.vibe && (
                        <span className="text-txt-muted bg-bg-secondary px-2 py-0.5 rounded-full">
                          {row.vibe}
                        </span>
                      )}
                    </div>

                    {/* Items list */}
                    <div className="space-y-1">
                      {(row.result?.items ?? []).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] px-1">
                          <span className="text-txt-secondary truncate">{item.name}</span>
                          <span className="text-txt-muted shrink-0 ml-2">${item.estimated_price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Combined Shopping List */}
              <div
                className="rounded-2xl bg-bg-card border border-accent-100 p-5"
                style={{ boxShadow: "0 1px 3px rgba(44,24,16,0.06)" }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3 text-center">
                  Combined Shopping List
                </h3>
                <div className="space-y-2">
                  {combinedItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-accent-50 border border-accent-200 flex items-center justify-center text-[10px] font-bold text-accent-600 shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-txt-primary truncate">{item.name}</span>
                      </div>
                      <span className="font-bold text-accent-600 shrink-0 ml-2">
                        ${item.estimated_price}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-accent-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-txt-muted">Combined Total</span>
                  <span className="text-lg font-bold text-txt-primary">${combinedTotal}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
