import type { StylingItem } from "@/lib/schema";

export interface PlacedItemData {
  id: string;
  item: StylingItem;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}
