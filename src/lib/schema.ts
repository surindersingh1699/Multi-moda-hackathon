export const VALID_CATEGORIES = [
  "textiles",
  "lighting",
  "wall_decor",
  "plants",
  "accessories",
  "furniture",
] as const;

export const VALID_STORES = [
  "Target",
  "Walmart",
  "Amazon",
  "HomeGoods",
  "IKEA",
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];
export type Store = (typeof VALID_STORES)[number];

export interface StylingItem {
  name: string;
  category: Category;
  estimated_price: number;
  priority: number;
  suggested_store: Store;
  reason: string;
  placement_x: number;
  placement_y: number;
}

export interface StylingResult {
  room_reading: string;
  style_direction: string;
  items: StylingItem[];
  buy_order: string[];
  total_estimated_cost: number;
}

/** OpenAI response_format JSON schema for strict structured output */
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
              category: {
                type: "string",
                enum: [...VALID_CATEGORIES],
              },
              estimated_price: { type: "number" },
              priority: { type: "number" },
              suggested_store: {
                type: "string",
                enum: [...VALID_STORES],
              },
              reason: { type: "string" },
              placement_x: { type: "number" },
              placement_y: { type: "number" },
            },
            required: [
              "name",
              "category",
              "estimated_price",
              "priority",
              "suggested_store",
              "reason",
              "placement_x",
              "placement_y",
            ],
            additionalProperties: false,
          },
        },
        buy_order: { type: "array", items: { type: "string" } },
        total_estimated_cost: { type: "number" },
      },
      required: [
        "room_reading",
        "style_direction",
        "items",
        "buy_order",
        "total_estimated_cost",
      ],
      additionalProperties: false,
    },
  },
};
