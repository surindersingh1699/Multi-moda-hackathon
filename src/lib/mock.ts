import { StylingResult, ProductMatch } from "./schema";

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

export const MOCK_PRODUCT_MATCHES: ProductMatch[] = [
  {
    item_name: "Warm White LED Strip Lights",
    product_title: "Govee LED Strip Lights 16.4ft Warm White Dimmable",
    product_url: "https://www.amazon.com/dp/B07XBWN8WF",
    real_price: 11.99,
    store: "Amazon",
    thumbnail: null,
    asin: "B07XBWN8WF",
  },
  {
    item_name: "Chunky Knit Throw Blanket",
    product_title: "Chunky Knit Throw Blanket 50x70 Cream",
    product_url: "https://www.amazon.com/dp/B0BXMVHGQR",
    real_price: 22.99,
    store: "Amazon",
    thumbnail: null,
    asin: "B0BXMVHGQR",
  },
  {
    item_name: "Set of 3 Minimalist Gallery Frames",
    product_title: "Gallery Wall Frame Set Black 8x10 - 3 Pack",
    product_url: "https://www.amazon.com/dp/B08FX5LBR9",
    real_price: 16.99,
    store: "Amazon",
    thumbnail: null,
    asin: "B08FX5LBR9",
  },
  {
    item_name: "Faux Eucalyptus Stems in Clear Vase",
    product_title: "Artificial Eucalyptus Stems with Glass Vase Set",
    product_url: "https://www.amazon.com/dp/B09N3JWDYJ",
    real_price: 14.99,
    store: "Amazon",
    thumbnail: null,
    asin: "B09N3JWDYJ",
  },
  {
    item_name: "Textured Linen Throw Pillow Covers (Set of 2)",
    product_title: "MIULEE Set of 2 Linen Throw Pillow Covers 18x18 Beige",
    product_url: "https://www.amazon.com/dp/B07WFNRHQM",
    real_price: 13.99,
    store: "Amazon",
    thumbnail: null,
    asin: "B07WFNRHQM",
  },
];
