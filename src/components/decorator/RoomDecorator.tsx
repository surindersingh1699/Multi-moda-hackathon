"use client";

import { useState, useCallback, useMemo } from "react";
import type { StylingItem } from "@/lib/schema";
import type { PlacedItemData } from "@/lib/decorator/types";
import RoomCanvas from "./RoomCanvas";
import ItemPanel from "./ItemPanel";

interface RoomDecoratorProps {
  previewUrl: string;
  items: StylingItem[];
}

function buildInitialPlacements(items: StylingItem[]): PlacedItemData[] {
  return items.map((item) => ({
    id: item.name,
    item,
    x: 50,
    y: 50,
  }));
}

export default function RoomDecorator({ previewUrl, items }: RoomDecoratorProps) {
  const [placements, setPlacements] = useState<PlacedItemData[]>(() =>
    buildInitialPlacements(items)
  );
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const placedIds = useMemo(
    () => new Set(placements.map((p) => p.id)),
    [placements]
  );

  const moveItem = useCallback((id: string, x: number, y: number) => {
    setPlacements((prev) =>
      prev.map((p) => (p.id === id ? { ...p, x, y } : p))
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggleItem = useCallback(
    (item: StylingItem) => {
      if (placedIds.has(item.name)) {
        // Remove from canvas
        setPlacements((prev) => prev.filter((p) => p.id !== item.name));
      } else {
        // Add to canvas at AI-determined position
        setPlacements((prev) => [
          ...prev,
          {
            id: item.name,
            item,
            x: 50,
            y: 50,
          },
        ]);
      }
    },
    [placedIds]
  );

  const resetPositions = useCallback(() => {
    setPlacements(buildInitialPlacements(items));
  }, [items]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-medium text-txt-secondary">
          Your room, reimagined
        </p>
        <button
          onClick={resetPositions}
          className="text-[11px] font-medium text-accent-400 hover:text-accent-500 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      </div>

      {/* Main layout: canvas + panel */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Canvas — takes most of the space */}
        <div className="flex-1 min-w-0">
          <RoomCanvas
            previewUrl={previewUrl}
            placements={placements}
            onMoveItem={moveItem}
            onRemoveItem={removeItem}
            highlightedId={highlightedId}
            onHoverItem={setHighlightedId}
          />
        </div>

        {/* Item panel — sidebar on desktop, bottom strip on mobile */}
        <div className="md:w-[240px] flex-shrink-0">
          <ItemPanel
            items={items}
            placedIds={placedIds}
            highlightedId={highlightedId}
            onHoverItem={setHighlightedId}
            onToggleItem={toggleItem}
          />
        </div>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-txt-muted text-center">
        Drag items to reposition them. Click an item in the panel to toggle it on/off.
      </p>
    </div>
  );
}
