# Roomify — Model Prompt Reference

This file documents the actual prompts used in production.
Source of truth: `src/lib/prompt.ts`

---

## Pipeline Overview

Roomify uses a 2-step AI pipeline:

1. **Step 1 — Vision Analysis** (GPT-4o, detail: high, max_tokens: 768)
   Sees the room photo. Returns structured analysis with color palette, lighting, and identified needs.

2. **Step 2 — Recommendations** (GPT-4o-mini, text only)
   Receives the vision analysis (no image). Returns product recommendations with placement, search queries, and quick wins.

Fallback: Gemini single-call path combines both steps.

---

## Step 1: Vision Prompt

Role: Expert interior design analyst with a trained eye for color, light, and spatial composition.

Analyzes:
- Room type (auto-detected)
- Current state assessment (room_reading)
- Target aesthetic direction (style_direction)
- Existing color palette (dominant colors — walls, furniture, textiles, fixtures)
- Lighting assessment (natural light, fixtures, warm/cool tone)
- What's already working (things NOT to change)
- 4-6 identified improvement opportunities

Output schema:
```json
{
  "room_type": "string",
  "room_reading": "string — 2-3 sentences",
  "style_direction": "string",
  "existing_color_palette": "string — e.g., 'warm white walls, oak wood tones, navy bedding'",
  "lighting_assessment": "string — e.g., 'strong natural light, single cool-toned overhead, no ambient'",
  "whats_working": "string — what to keep",
  "identified_needs": ["string — specific opportunities"]
}
```

---

## Step 2: Recommendation Prompt

Role: Top-tier budget interior designer (TikTok/YouTube room makeover style).

Constraints:
- 4-6 items (3-4 for budgets ≤$100)
- Each item under $40
- Total under budget
- **Category diversity**: At least 3 different categories, max 2 from same category
- **Color coordination**: All items in a cohesive 2-3 color palette matching room's existing colors
- **Specific search queries**: Include color, material, size (e.g., "chunky knit ivory throw blanket 50x60")
- **Placement**: Exact location in the room for each item
- Real, purchasable products from Amazon, Walmart, Target, IKEA, HomeGoods

Output schema:
```json
{
  "items": [
    {
      "name": "string — specific name with color/material",
      "category": "string — lighting, textiles, wall art, plants, storage, accent piece",
      "estimated_price": "number — USD",
      "priority": "number — 1 = highest impact",
      "suggested_store": "string",
      "reason": "string — why this transforms the room + how it works with other items",
      "search_query": "string — specific with color, material, size",
      "placement": "string — exact location in the room"
    }
  ],
  "quick_wins": ["string — 1-2 items for biggest bang-for-buck"],
  "total_estimated_cost": "number"
}
```

---

## Image Generation Prompt

Used for the before/after visualization. Items include placement info for spatial accuracy.

```
This is a real room photo. Keep everything exactly as it is — same walls, floor, furniture, layout, perspective, and lighting.

Your only task: naturally add these specific small items into the existing room at the exact locations specified:
1. Item Name (category) — placed [exact placement]
2. ...

Each item has a specific placement — follow it precisely. The items should look naturally integrated, matching the room's existing scale and perspective.

[Conditional: warm lighting tone if lighting items included]

The result should look like a real photo of the same room with just these small additions visible. Everything else stays identical.
```

---

## Key Design Decisions

1. **Color palette in vision** — Prevents recommendations that clash with the room's existing colors
2. **Lighting assessment** — Informs whether to recommend warm vs cool lighting additions
3. **What's working** — Prevents over-recommending / replacing things users like
4. **Category diversity** — Ensures results feel "designed" not random
5. **Specific search queries** — Dramatically improves product search hit rate
6. **Placement** — Feeds into image generation for more realistic before/after
7. **Quick wins** — Replaces buy_order with actionable "start here" guidance
8. **Budget-adaptive item count** — 3-4 items for ≤$100, 4-6 for >$100
