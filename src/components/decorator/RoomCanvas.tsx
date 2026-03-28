"use client";

import { useRef, useState, useCallback } from "react";
import type { PlacedItemData } from "@/lib/decorator/types";
import PlacedItem from "./PlacedItem";

interface RoomCanvasProps {
  previewUrl: string;
  placements: PlacedItemData[];
  onMoveItem: (id: string, x: number, y: number) => void;
  onRemoveItem: (id: string) => void;
  highlightedId: string | null;
  onHoverItem: (id: string | null) => void;
}

export default function RoomCanvas({
  previewUrl,
  placements,
  onMoveItem,
  onRemoveItem,
  highlightedId,
  onHoverItem,
}: RoomCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  return (
    <div className="relative w-full">
      <div
        ref={canvasRef}
        className="relative w-full overflow-hidden rounded-2xl border border-accent-100 bg-bg-card shadow-sm"
        style={{
          aspectRatio: aspectRatio ? `${aspectRatio}` : "4/3",
          containerType: "inline-size",
        }}
      >
        {/* Room photo background */}
        <img
          src={previewUrl}
          alt="Your room"
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={onImageLoad}
          draggable={false}
        />

        {/* Slight overlay for better icon contrast */}
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />

        {/* Placed items */}
        {placements.map((p, i) => (
          <PlacedItem
            key={p.id}
            placement={p}
            canvasRef={canvasRef}
            onMove={onMoveItem}
            onRemove={onRemoveItem}
            isHighlighted={highlightedId === p.id}
            onHover={onHoverItem}
            staggerIndex={i}
          />
        ))}
      </div>
    </div>
  );
}
