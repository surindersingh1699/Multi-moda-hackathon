/** Convert page-space pointer coordinates to canvas-relative percentages. */
export function pageToCanvasPercent(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect
): { x: number; y: number } {
  const x = ((clientX - canvasRect.left) / canvasRect.width) * 100;
  const y = ((clientY - canvasRect.top) / canvasRect.height) * 100;
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

/** Clamp coordinates to keep items within canvas bounds. */
export function clampToCanvas(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(2, Math.min(98, y)),
  };
}

/** Icon sizes per category as percentage of canvas dimensions. */
export const CATEGORY_SIZES: Record<string, { w: number; h: number }> = {
  textiles: { w: 10, h: 8 },
  lighting: { w: 8, h: 12 },
  wall_decor: { w: 10, h: 8 },
  plants: { w: 8, h: 12 },
  accessories: { w: 7, h: 9 },
  furniture: { w: 14, h: 12 },
};

/** Generate Amazon search URL for an item. */
export function getAmazonSearchUrl(itemName: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(itemName)}`;
}
