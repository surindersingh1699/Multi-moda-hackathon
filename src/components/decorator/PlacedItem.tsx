"use client";

import { useState, useRef, useCallback } from "react";
import type { PlacedItemData } from "@/lib/decorator/types";
import { pageToCanvasPercent, clampToCanvas, CATEGORY_SIZES, getAmazonSearchUrl } from "@/lib/decorator/utils";
import { DecoratorIcon } from "./DecoratorIcon";

interface PlacedItemProps {
  placement: PlacedItemData;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
  staggerIndex: number;
}

export default function PlacedItem({
  placement,
  canvasRef,
  onMove,
  onRemove,
  isHighlighted,
  onHover,
  staggerIndex,
}: PlacedItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const posRef = useRef({ x: placement.x, y: placement.y });

  const size = CATEGORY_SIZES[placement.item.category];

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      offsetRef.current = {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2),
      };
      posRef.current = { x: placement.x, y: placement.y };
    },
    [placement.x, placement.y]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !canvasRef.current || !itemRef.current) return;
      e.preventDefault();

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const { x, y } = pageToCanvasPercent(
        e.clientX - offsetRef.current.x,
        e.clientY - offsetRef.current.y,
        canvasRect
      );
      const clamped = clampToCanvas(x, y);

      // Direct DOM update for smooth dragging (no React re-render during drag)
      itemRef.current.style.left = `${clamped.x}%`;
      itemRef.current.style.top = `${clamped.y}%`;
      posRef.current = clamped;
    },
    [isDragging, canvasRef]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(false);
      // Commit final position to React state
      onMove(placement.id, posRef.current.x, posRef.current.y);
    },
    [onMove, placement.id]
  );

  return (
    <div
      ref={itemRef}
      className="absolute group"
      style={{
        left: `${placement.x}%`,
        top: `${placement.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: isDragging ? 50 : 10,
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
        animation: `placePulse 0.4s ease-out ${staggerIndex * 0.12}s both`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerEnter={() => onHover(placement.id)}
      onPointerLeave={() => { if (!isDragging) onHover(null); }}
    >
      <div
        className={`
          flex flex-col items-center gap-0.5 transition-transform duration-150
          ${isDragging ? "scale-110" : "scale-100"}
          ${isHighlighted ? "scale-105" : ""}
        `}
      >
        {/* Icon badge */}
        <div
          className={`
            relative rounded-xl p-2 backdrop-blur-sm transition-shadow duration-200
            ${isDragging
              ? "bg-white/80 shadow-lg shadow-accent-400/30"
              : "bg-white/70 shadow-md shadow-accent-400/20"
            }
            ${isHighlighted ? "ring-2 ring-accent-400" : ""}
          `}
          style={{ width: `clamp(40px, ${size.w}cqw, 80px)`, height: `clamp(40px, ${size.h}cqw, 80px)` }}
        >
          <DecoratorIcon category={placement.item.category} className="w-full h-full" />

          {/* Remove button */}
          <button
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white/90 border border-accent-200 text-txt-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-err-50 hover:text-err-500 hover:border-err-300"
            onClick={(e) => { e.stopPropagation(); onRemove(placement.id); }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            ×
          </button>

          {/* Buy link */}
          <a
            href={getAmazonSearchUrl(placement.item.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent-400 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-500"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            title="Buy on Amazon"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </a>
        </div>

        {/* Name label */}
        <span className="text-[9px] font-semibold text-txt-primary bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full max-w-[80px] truncate text-center shadow-sm">
          {placement.item.name}
        </span>
      </div>
    </div>
  );
}
