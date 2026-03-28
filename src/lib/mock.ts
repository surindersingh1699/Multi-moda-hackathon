import { StylingResult } from "./schema";

export const MOCK_RESULT: StylingResult = {
  room_reading:
    "A plain bedroom with white walls, minimal furniture, and no textiles. The space feels cold and impersonal with harsh overhead lighting.",
  style_direction:
    "Warm Scandinavian cozy — layered textiles, warm lighting, and organic textures to create an inviting retreat.",
  items: [
    {
      name: "Chunky knit throw blanket",
      category: "textiles",
      estimated_price: 25,
      priority: 1,
      suggested_store: "Amazon",
      reason: "Instantly adds warmth and texture draped over the bed.",
      placement_x: 50,
      placement_y: 55,
    },
    {
      name: "Warm white string lights",
      category: "lighting",
      estimated_price: 12,
      priority: 2,
      suggested_store: "Target",
      reason: "Soft ambient glow replaces harsh overhead lighting.",
      placement_x: 50,
      placement_y: 15,
    },
    {
      name: "Set of 3 gallery wall frames",
      category: "wall_decor",
      estimated_price: 20,
      priority: 3,
      suggested_store: "IKEA",
      reason:
        "Fills empty wall space — use your own iPhone photos for a personal touch.",
      placement_x: 70,
      placement_y: 25,
    },
    {
      name: "Faux eucalyptus stems in glass vase",
      category: "plants",
      estimated_price: 18,
      priority: 4,
      suggested_store: "HomeGoods",
      reason: "Adds life and a natural element without maintenance.",
      placement_x: 85,
      placement_y: 60,
    },
    {
      name: "Textured linen pillow covers (set of 2)",
      category: "textiles",
      estimated_price: 22,
      priority: 5,
      suggested_store: "Walmart",
      reason: "Layering pillows adds depth, comfort, and visual interest.",
      placement_x: 40,
      placement_y: 48,
    },
  ],
  buy_order: [
    "Chunky knit throw blanket",
    "Warm white string lights",
    "Set of 3 gallery wall frames",
    "Faux eucalyptus stems in glass vase",
    "Textured linen pillow covers (set of 2)",
  ],
  total_estimated_cost: 97,
};
