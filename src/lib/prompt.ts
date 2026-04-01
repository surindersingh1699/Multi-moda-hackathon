import type { CreativeResult } from "./schema";

/**
 * Step A — Creative makeover ideation (high temperature)
 *
 * This prompt is emotionally directional and unconstrained by budget math.
 * It gives the model room to be bold, surprising, and social-media-worthy.
 */
export function buildCreativePrompt(
  userPrompt?: string,
  budget?: number,
  roomContext?: string,
  currencySymbol = "$"
): string {
  const budgetNum = budget ?? 150;

  let prompt = `You are a top-tier interior stylist and makeover influencer. You see rooms the way a set designer sees a film set — every corner is an opportunity.

You will receive one room photo. Study it carefully.

Your job: design a scroll-stopping, social-media-worthy transformation plan. Think "before & after that makes people gasp."

How to think about this room:
- What is the room's current energy? What's the story it's telling now?
- What already works? (Never throw away what's good — build on it.)
- Where is the single biggest "wow" upgrade hiding?
- What would make someone say "wait, that's the SAME room?!"

Design rules:
- Recommend 4 to 6 bold makeover ideas. Curate — don't pad.
- Prefer visible, dramatic upgrades over safe, subtle ones.
- Every idea should create a noticeable before-vs-after difference.
- Include 1–2 free quick wins (rearranging, decluttering, lighting tricks).
- This is roughly a ${currencySymbol}${budgetNum} makeover — keep ideas realistic for that range, but don't do budget math. Just think about what would look amazing.

Return ONLY valid JSON:

{
  "room_reading": "string",
  "style_direction": "string",
  "ideas": [
    {
      "name": "string",
      "category": "string",
      "reason": "string"
    }
  ],
  "quick_wins": ["string"]
}

Field guidance:
- room_reading: 2–3 vivid sentences — describe the current feel AND the single biggest transformation opportunity. Make it specific to THIS room.
- style_direction: a cinematic aesthetic direction (e.g. "warm Japandi with golden hour glow" not just "modern"). This should feel like an art direction brief.
- ideas: each one is a bold makeover move. The name should be specific (not "throw pillow" but "burnt sienna chunky knit throw"). The reason should explain the transformation it creates — how it changes the room's energy.
- quick_wins: 1–2 free, zero-cost actions that instantly improve the space.

Rules:
- JSON only, no markdown
- 4 to 6 ideas — no more, no less
- Be bold. Be specific. Make it wow.`;

  if (userPrompt && userPrompt.trim()) {
    prompt += `

The person wants this vibe: "${userPrompt.trim()}"
Channel that energy hard — but trust your eye over their words if the room calls for something better.`;
  }

  if (roomContext && roomContext.trim()) {
    prompt += `

Context about this room and how it's used: "${roomContext.trim()}"
Use this to prioritize upgrades that solve real problems and match how the person actually lives in this space. Functional wins > purely decorative ones when they conflict.`;
  }

  return prompt;
}

/**
 * Step B — Shopping conversion (low temperature)
 *
 * Takes the creative output from Step A and converts it into
 * a shoppable plan with real prices, stores, and search queries.
 */
export function buildShoppingPrompt(
  creative: CreativeResult,
  budget?: number,
  currencySymbol = "$",
  storeList = "Amazon, Walmart, Target, IKEA, HomeGoods"
): string {
  const budgetNum = budget ?? 150;

  return `You are a smart interior shopping assistant. You will convert a creative makeover plan into a shoppable product list.

Here is the creative makeover plan:

Room reading: ${creative.room_reading}
Style direction: ${creative.style_direction}
Quick wins: ${JSON.stringify(creative.quick_wins)}

Makeover ideas:
${creative.ideas.map((idea, i) => `${i + 1}. ${idea.name} (${idea.category}) — ${idea.reason}`).join("\n")}

Your job: convert each idea into a real, purchasable item with accurate pricing and shopping details.

Budget rules:
- Total budget: ${currencySymbol}${budgetNum}. Use at least 90% of it.
- Total must stay at or under ${currencySymbol}${budgetNum}.
- Keep prices honest — no fake prices. Use realistic retail prices.
- Distribute the budget smartly across items.

Return ONLY valid JSON:

{
  "room_reading": "string",
  "style_direction": "string",
  "items": [
    {
      "name": "string",
      "category": "string",
      "estimated_price": number,
      "priority": number,
      "suggested_store": "string",
      "reason": "string",
      "search_query": "string",
      "placement": "string"
    }
  ],
  "quick_wins": ["string"],
  "total_estimated_cost": number
}

Field rules:
- room_reading: use exactly "${creative.room_reading.substring(0, 50)}..." — copy the creative plan's room_reading verbatim: "${creative.room_reading}"
- style_direction: copy verbatim: "${creative.style_direction}"
- quick_wins: copy verbatim from the creative plan
- name: keep the creative plan's item names (refine slightly if needed for searchability)
- category: keep from creative plan
- reason: keep from creative plan
- estimated_price: realistic retail price for this item
- priority: 1 = highest impact, ascending
- suggested_store: where to buy (${storeList}, etc.)
- search_query: detailed query with color, material, size — specific enough to find this exact item online
- placement: precise location in the room (e.g. "on the nightstand to the left of the bed")
- total_estimated_cost: must equal the sum of all estimated_price values

Rules:
- JSON only, no markdown, no extra keys
- Exactly ${creative.ideas.length} items (one per creative idea)
- Ensure total_estimated_cost equals the sum of all item prices
- Stay at or under ${currencySymbol}${budgetNum}`;
}
