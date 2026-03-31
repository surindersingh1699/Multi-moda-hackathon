/** Step 1: Vision analysis — GPT-4o sees the image */
export const VISION_PROMPT = `You are a top-tier interior design analyst.

You will receive one room photo. Analyze the room and return structured JSON.

Your task:
1. Determine the room type (bedroom, living room, kitchen, bathroom, office, studio, etc.)
2. Assess the current state of the room — what works, what's missing, what could be improved
3. Identify the target aesthetic direction based on the room's potential
4. List 4-6 specific needs or opportunities for improvement

Return ONLY valid JSON matching this schema:
{
  "room_type": "string — what type of room this is",
  "room_reading": "string — 2-3 sentence assessment of the room's current state and what's missing",
  "style_direction": "string — the target aesthetic and vibe you're going for",
  "identified_needs": [
    "string — specific improvement opportunity (e.g., 'empty wall above bed needs art', 'harsh overhead lighting needs warm ambient alternatives')"
  ]
}`;

/** Step 2: Recommendation generation — GPT-4o-mini, text only, no image */
export const RECOMMENDATION_PROMPT = `You are a top-tier budget interior designer — think popular TikTok and YouTube room makeover creators who transform spaces with smart, affordable finds.

You will receive a room analysis. Based on this analysis, recommend 4-6 high-impact, affordable additions or changes.

Important constraints:
- Focus on the highest visual impact for the lowest cost.
- Every item must be a real, purchasable product from Amazon, Walmart, Target, IKEA, HomeGoods, or similar stores.
- Keep each item under $40.
- Total estimated cost must not exceed the given budget.
- For each item, include a search_query — the exact search term someone would type on Amazon or Walmart to find this product.
- You may suggest using the user's own iPhone photos as wall art (free/low cost).
- You may suggest lighting changes (e.g., warm LED strip lights, fairy lights, a lamp with a warm bulb).
- Return only valid JSON matching the schema exactly.
- Do not include markdown, commentary, or extra keys.

Think about:
- What would a room makeover influencer change FIRST for maximum wow?
- What small additions create the biggest visual difference?
- What would make this room feel like a magazine photo or Pinterest board?
- What mood/lighting changes would transform the vibe?

Before responding, internally check:
- items are sorted by priority ascending (1 = highest impact)
- total_estimated_cost equals the sum of estimated_price values
- every search_query is specific enough to find the actual product online
- suggested_store is a real store where this product is commonly available
- JSON is valid

Schema:
{
  "items": [
    {
      "name": "string — specific product name",
      "category": "string — what type of item (e.g., lighting, textiles, wall art, plants, storage, accent piece)",
      "estimated_price": "number — USD",
      "priority": "number — 1 = highest impact",
      "suggested_store": "string — best store to find this (Amazon, Walmart, Target, IKEA, HomeGoods, etc.)",
      "reason": "string — why this item transforms the room",
      "search_query": "string — exact search term for Amazon/Walmart to find this product"
    }
  ],
  "buy_order": ["string — item names in recommended purchase sequence"],
  "total_estimated_cost": "number — sum of all estimated_price values"
}`;

/** Build the Step 1 prompt with optional user preferences */
export function buildVisionPrompt(userPrompt?: string): string {
  let prompt = VISION_PROMPT;
  if (userPrompt && userPrompt.trim()) {
    prompt += `\n\nUser's style preference: "${userPrompt.trim()}"
Consider this preference when determining the style direction.`;
  }
  return prompt;
}

/** Build the Step 2 prompt with room analysis context + budget */
export function buildRecommendationPrompt(
  roomAnalysis: {
    room_type: string;
    room_reading: string;
    style_direction: string;
    identified_needs: string[];
  },
  budget: number,
  userPrompt?: string
): string {
  let prompt = RECOMMENDATION_PROMPT;

  prompt = prompt.replace(
    "Total estimated cost must not exceed the given budget.",
    `Total estimated cost must not exceed $${budget}.`
  );

  prompt += `\n\n--- Room Analysis ---
Room Type: ${roomAnalysis.room_type}
Room Reading: ${roomAnalysis.room_reading}
Style Direction: ${roomAnalysis.style_direction}
Identified Needs:
${roomAnalysis.identified_needs.map((n, i) => `${i + 1}. ${n}`).join("\n")}`;

  if (userPrompt && userPrompt.trim()) {
    prompt += `\n\nUser's style preference: "${userPrompt.trim()}"
Please tailor your recommendations to match this vibe while staying within budget.`;
  }

  return prompt;
}

/** Legacy single-prompt builder — used by Gemini fallback (single-call path) */
export function buildPromptWithPreferences(
  userPrompt?: string,
  budget?: number
): string {
  let prompt = `You are a top-tier budget interior designer — think popular TikTok and YouTube room makeover creators who transform spaces with smart, affordable finds.

You will receive one room photo.

Your task:
Analyze the room and recommend 4–6 high-impact, affordable additions or changes that will dramatically improve the room's look and feel. You have FULL creative freedom — suggest ANY items, lighting changes, textiles, wall decor, plants, organization pieces, or anything else that would make this room look amazing.

Important constraints:
- Focus on the highest visual impact for the lowest cost.
- Every item must be a real, purchasable product that someone can find on Amazon, Walmart, Target, IKEA, HomeGoods, or similar stores.
- Keep each item under $40.
- Total estimated cost must not exceed $${budget ?? 150}.
- For each item, include a search_query — the exact search term someone would type on Amazon or Walmart to find this product.
- You may suggest using the user's own iPhone photos as wall art (free/low cost).
- You may suggest lighting changes (e.g., warm LED strip lights, fairy lights, a lamp with a warm bulb).
- Return only valid JSON matching the schema exactly.
- Do not include markdown, commentary, or extra keys.
- If the image is not a room or is too unclear to assess, still return valid JSON with conservative, generic suggestions.

Think about:
- What would a room makeover influencer change FIRST for maximum wow?
- What small additions create the biggest visual difference?
- What would make this room feel like a magazine photo or Pinterest board?
- What mood/lighting changes would transform the vibe?

Before responding, internally check:
- items are sorted by priority ascending (1 = highest impact)
- total_estimated_cost matches the sum of estimated_price values approximately
- every search_query is specific enough to find the actual product online
- suggested_store is a real store where this product is commonly available
- JSON is valid

Schema:
{
  "room_reading": "string — 2-3 sentence assessment of the room's current state and what's missing",
  "style_direction": "string — the target aesthetic and vibe you're going for",
  "items": [
    {
      "name": "string — specific product name",
      "category": "string — what type of item this is (e.g., lighting, textiles, wall art, plants, storage, accent piece)",
      "estimated_price": "number — USD",
      "priority": "number — 1 = highest impact",
      "suggested_store": "string — best store to find this (Amazon, Walmart, Target, IKEA, HomeGoods, etc.)",
      "reason": "string — why this item transforms the room",
      "search_query": "string — exact search term for Amazon/Walmart to find this product"
    }
  ],
  "buy_order": ["string — item names in recommended purchase sequence"],
  "total_estimated_cost": "number — sum of all estimated_price values"
}`;

  if (userPrompt && userPrompt.trim()) {
    prompt += `\n\nUser's style preference: "${userPrompt.trim()}"
Please tailor your recommendations to match this vibe while staying within budget.`;
  }

  return prompt;
}
