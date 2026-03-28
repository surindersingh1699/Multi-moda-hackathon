import { StylingResult } from "./schema";

export const MOCK_RESULT: StylingResult = {
  room_reading:
    "A plain bedroom with white walls, minimal furniture, and no textiles. The space feels cold and impersonal with harsh overhead lighting — a classic blank canvas.",
  style_direction:
    "Warm TikTok cozy — layered textures, warm ambient lighting, and curated accents that make the room feel like a Pinterest mood board come to life.",
  items: [
    {
      name: "Warm White LED Strip Lights",
      category: "ambient lighting",
      estimated_price: 14,
      priority: 1,
      suggested_store: "Amazon",
      reason:
        "The single biggest transformation — warm LED strips behind the headboard or along the ceiling instantly change the entire mood from clinical to cozy.",
      search_query: "warm white LED strip lights bedroom 16ft adhesive",
    },
    {
      name: "Chunky Knit Throw Blanket",
      category: "textiles",
      estimated_price: 25,
      priority: 2,
      suggested_store: "Amazon",
      reason:
        "Draped over the bed, this adds instant texture and warmth. It's the go-to move every room makeover creator uses.",
      search_query: "chunky knit throw blanket cream white bed",
    },
    {
      name: "Set of 3 Minimalist Gallery Frames",
      category: "wall art",
      estimated_price: 18,
      priority: 3,
      suggested_store: "IKEA",
      reason:
        "Fill that empty wall space above the bed — use your own iPhone photos or free printable art for a personal touch.",
      search_query: "minimalist gallery wall frame set black 8x10",
    },
    {
      name: "Faux Eucalyptus Stems in Clear Vase",
      category: "greenery",
      estimated_price: 16,
      priority: 4,
      suggested_store: "Target",
      reason:
        "Adds life and a natural element to the nightstand without any maintenance. Green pops against neutral tones.",
      search_query: "faux eucalyptus stems clear glass vase set",
    },
    {
      name: "Textured Linen Throw Pillow Covers (Set of 2)",
      category: "textiles",
      estimated_price: 20,
      priority: 5,
      suggested_store: "Walmart",
      reason:
        "Layering pillows in different textures adds depth and makes the bed look styled and intentional.",
      search_query: "textured linen throw pillow covers 18x18 neutral",
    },
  ],
  buy_order: [
    "Warm White LED Strip Lights",
    "Chunky Knit Throw Blanket",
    "Set of 3 Minimalist Gallery Frames",
    "Faux Eucalyptus Stems in Clear Vase",
    "Textured Linen Throw Pillow Covers (Set of 2)",
  ],
  total_estimated_cost: 93,
};
