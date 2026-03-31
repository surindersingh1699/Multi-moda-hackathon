"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { fetchAnalyses, archiveAnalysis, getSignedImageUrl } from "@/lib/supabase/db";
import type { AnalysisRow } from "@/lib/supabase/db";
import type { StylingResult, ProductMatch } from "@/lib/schema";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoadAnalysis: (params: {
    result: StylingResult;
    previewUrl: string | null;
    styledImageUrl: string | null;
    productMatches: ProductMatch[];
    budget: number;
    vibe: string | null;
  }) => void;
}

export default function HistoryPanel({ open, onClose, onLoadAnalysis }: Props) {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createClient();
    const rows = await fetchAnalyses(supabase, user.id);
    setAnalyses(rows);
    setLoading(false);

    // Load signed image URLs in the background
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
    if (open && user) load();
  }, [open, user, load]);

  const handleArchive = async (id: string) => {
    const supabase = createClient();
    await archiveAnalysis(supabase, id);
    setAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleLoad = (row: AnalysisRow) => {
    onLoadAnalysis({
      result: row.result,
      previewUrl: imageUrls[row.id] || null,
      styledImageUrl: row.styled_image_url || null,
      productMatches: row.product_matches || [],
      budget: row.budget,
      vibe: row.vibe,
    });
    onClose();
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
            <h2 className="text-lg font-bold text-txt-primary">My Makeovers</h2>
            <p className="text-[10px] text-txt-muted">{analyses.length} past analyses</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-card border border-accent-100 text-txt-muted hover:bg-accent-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-8 h-8 rounded-full border-2 border-accent-200 border-t-accent-500 animate-spin" />
              <p className="text-xs text-txt-muted">Loading your history...</p>
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-txt-secondary">No makeovers yet</p>
              <p className="text-xs text-txt-muted">Your room analyses will appear here</p>
            </div>
          ) : (
            analyses.map((row) => (
              <HistoryCard
                key={row.id}
                row={row}
                imageUrl={imageUrls[row.id]}
                onLoad={() => handleLoad(row)}
                onArchive={() => handleArchive(row.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({
  row,
  imageUrl,
  onLoad,
  onArchive,
}: {
  row: AnalysisRow;
  imageUrl?: string;
  onLoad: () => void;
  onArchive: () => void;
}) {
  const date = new Date(row.created_at);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const result = row.result;
  const itemCount = result?.items?.length ?? 0;
  const totalCost = result?.total_estimated_cost ?? 0;

  return (
    <div
      className="group rounded-2xl bg-bg-card border border-accent-100/50 overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "0 1px 3px rgba(44,24,16,0.06)" }}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-accent-50 border border-accent-100/50 shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt="Room" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-txt-primary truncate">
            {result?.style_direction?.slice(0, 60) || "Room Analysis"}
          </p>
          <p className="text-[10px] text-txt-muted mt-0.5">{formatted}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-medium text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
              {itemCount} items
            </span>
            <span className="text-[10px] font-medium text-txt-muted">
              ${totalCost}
            </span>
            {row.vibe && (
              <span className="text-[10px] font-medium text-txt-muted bg-bg-secondary px-2 py-0.5 rounded-full">
                {row.vibe}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-accent-100/50">
        <button
          onClick={onLoad}
          className="flex-1 text-[10px] font-semibold text-accent-500 py-2 hover:bg-accent-50 transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Results
        </button>
        <div className="w-px bg-accent-100/50" />
        <button
          onClick={onArchive}
          className="px-4 text-[10px] font-semibold text-txt-muted py-2 hover:bg-err-50 hover:text-err-500 transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
