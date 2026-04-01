export interface StylingItem {
  name: string;
  category: string;
  estimated_price: number;
  priority: number;
  suggested_store: string;
  reason: string;
  search_query: string;
  placement: string;
}

export interface StylingResult {
  room_reading: string;
  style_direction: string;
  items: StylingItem[];
  quick_wins: string[];
  total_estimated_cost: number;
}

/** A real product match found by the AI shopping agent */
export interface ProductMatch {
  /** The original item name this product matches */
  item_name: string;
  /** Real product title from the web */
  product_title: string;
  /** Actual product URL (direct link to product page) */
  product_url: string;
  /** Real price found online */
  real_price: number | null;
  /** Store name (Amazon, Walmart, Target, etc.) */
  store: string;
  /** Product image URL */
  thumbnail: string | null;
  /** Amazon ASIN for add-to-cart */
  asin: string | null;
}

/** Response from the /api/find-products endpoint */
export interface ProductSearchResult {
  matches: ProductMatch[];
  status: "complete" | "partial" | "failed";
}

// ── OpenAI structured output schema ───────────────────────────────

/** Response format for the single-call analysis + recommendations */
export const RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "styling_result",
    strict: true,
    schema: {
      type: "object",
      properties: {
        room_reading: { type: "string" },
        style_direction: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              estimated_price: { type: "number" },
              priority: { type: "number" },
              suggested_store: { type: "string" },
              reason: { type: "string" },
              search_query: { type: "string" },
              placement: { type: "string" },
            },
            required: [
              "name",
              "category",
              "estimated_price",
              "priority",
              "suggested_store",
              "reason",
              "search_query",
              "placement",
            ],
            additionalProperties: false,
          },
        },
        quick_wins: { type: "array", items: { type: "string" } },
        total_estimated_cost: { type: "number" },
      },
      required: [
        "room_reading",
        "style_direction",
        "items",
        "quick_wins",
        "total_estimated_cost",
      ],
      additionalProperties: false,
    },
  },
};

/** Gemini-compatible JSON Schema for responseJsonSchema config */
export const GEMINI_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    room_reading: { type: "string" },
    style_direction: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          estimated_price: { type: "number" },
          priority: { type: "number" },
          suggested_store: { type: "string" },
          reason: { type: "string" },
          search_query: { type: "string" },
          placement: { type: "string" },
        },
        required: [
          "name",
          "category",
          "estimated_price",
          "priority",
          "suggested_store",
          "reason",
          "search_query",
          "placement",
        ],
      },
    },
    quick_wins: { type: "array", items: { type: "string" } },
    total_estimated_cost: { type: "number" },
  },
  required: [
    "room_reading",
    "style_direction",
    "items",
    "quick_wins",
    "total_estimated_cost",
  ],
};
