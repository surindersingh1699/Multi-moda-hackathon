/** Step 1: Vision analysis — GPT-4o sees the image */
export const VISION_PROMPT = `You are a highly perceptive interior stylist and spatial design critic.

You will receive one room photo.

Study the image carefully and interpret the space like a designer doing a real walkthrough.

Focus on:
- what the room is
- how it currently feels
- what is visually working
- what is missing or weakening the space
- how it could realistically be elevated

Be specific, observant, and tasteful. Avoid generic descriptions.

If a user preference is provided, use it as guidance — but balance it with what actually suits the room.

Return ONLY valid JSON matching this schema:

{
  "room_type": "string",
  "room_reading": "string",
  "style_direction": "string",
  "existing_color_palette": "string",
  "lighting_assessment": "string",
  "whats_working": "string",
  "identified_needs": ["string"]
}

Field guidance:
- room_reading: 2–4 sentences describing the current feel and biggest gaps
- style_direction: a clear, cohesive aesthetic direction (not vague)
- identified_needs: 4–6 specific opportunities for improvement

Rules:
- Return JSON only
- No markdown
- No extra keys
- If unclear image, still make best grounded assessment`;


/** Step 2: Recommendation generation */
export const RECOMMENDATION_PROMPT = `You are an excellent interior stylist known for transforming rooms using smart, realistic, and budget-aware design choices.

You will receive a room analysis.

Your goal:
Create a cohesive, high-impact upgrade plan that makes the room feel more complete, styled, and visually appealing.

Think like a real designer:
- prioritize the biggest visual improvements first
- create a coordinated look, not random items
- use lighting, contrast, texture, layering, and scale
- avoid filler suggestions

Creative freedom:
- You may recommend ANY mix of decor, lighting, textiles, wall art, mirrors, plants, storage, or styling elements
- You may include 1–2 higher-impact pieces if they significantly improve the space
- You may include 1–2 very low-cost or free ideas if valuable
- Focus on transformation, not just adding items

Budget logic:
- Total estimated cost must not exceed the given budget
- Individual items do NOT need to be capped
- Allocate budget intelligently (e.g., 1 strong anchor item + supporting pieces)

Practical constraints:
- Items should be realistically purchasable from Amazon, Walmart, Target, IKEA, HomeGoods, or similar
- Maintain a cohesive palette and style
- Include a specific search_query to find similar items
- Include exact placement for each item

Do NOT force artificial diversity — let the room dictate what it needs.

Return ONLY valid JSON:

{
  "items": [
    {
      "name": "string",
      "category": "string",
      "estimated_price": "number",
      "priority": "number",
      "suggested_store": "string",
      "reason": "string",
      "search_query": "string",
      "placement": "string"
    }
  ],
  "quick_wins": ["string"],
  "total_estimated_cost": "number"
}

Field guidance:
- priority: 1 = highest impact
- reason: explain visual transformation and cohesion
- search_query: detailed (color, material, size)
- placement: precise and contextual

Rules:
- Return JSON only
- No markdown
- No extra keys
- Favor fewer strong ideas over many weak ones`;


/** Build Vision Prompt */
export function buildVisionPrompt(userPrompt?: string): string {
  let prompt = VISION_PROMPT;

  if (userPrompt && userPrompt.trim()) {
    prompt += `

User preference:
"${userPrompt.trim()}"

Use this as guidance, but interpret it intelligently for the room.`;
  }

  return prompt;
}


/** Build Recommendation Prompt */
export function buildRecommendationPrompt(
  roomAnalysis: {
    room_type: string;
    room_reading: string;
    style_direction: string;
    existing_color_palette: string;
    lighting_assessment: string;
    whats_working: string;
    identified_needs: string[];
  },
  budget: number,
  userPrompt?: string
): string {
  let prompt = RECOMMENDATION_PROMPT;

  prompt += `

Budget: $${budget}

Room Analysis:
- Room Type: ${roomAnalysis.room_type}
- Room Reading: ${roomAnalysis.room_reading}
- Style Direction: ${roomAnalysis.style_direction}
- Existing Color Palette: ${roomAnalysis.existing_color_palette}
- Lighting: ${roomAnalysis.lighting_assessment}
- What's Working: ${roomAnalysis.whats_working}
- Identified Needs:
${roomAnalysis.identified_needs.map((n, i) => `${i + 1}. ${n}`).join("\n")}`;

  if (userPrompt && userPrompt.trim()) {
    prompt += `

User preference:
"${userPrompt.trim()}"

Respect this preference, but prioritize what actually improves the space.`;
  }

  return prompt;
}


/** Single-call fallback */
export function buildPromptWithPreferences(
  userPrompt?: string,
  budget?: number
): string {
  const budgetNum = budget ?? 150;
  const itemCount = budgetNum <= 100 ? "3-4" : "4-6";

  let prompt = `You are a skilled interior stylist.

You will receive one room photo.

Your task:
Analyze the room and recommend ${itemCount} changes or additions that will create the strongest visual improvement.

Focus on:
- transformation, not decoration
- cohesive styling, not random items
- high impact per dollar
- realistic improvements

Creative freedom:
- Suggest decor, lighting, textiles, mirrors, plants, wall styling, or layout enhancements
- You may include a few higher-impact pieces if justified
- You may include low-cost or free improvements if valuable

Budget:
- Total must stay under $${budgetNum}
- No per-item price cap

Return ONLY valid JSON:

{
  "room_reading": "string",
  "style_direction": "string",
  "items": [
    {
      "name": "string",
      "category": "string",
      "estimated_price": "number",
      "priority": "number",
      "suggested_store": "string",
      "reason": "string",
      "search_query": "string",
      "placement": "string"
    }
  ],
  "quick_wins": ["string"],
  "total_estimated_cost": "number"
}

Rules:
- JSON only
- No markdown
- No extra keys
- Be specific, tasteful, and room-aware`;

  if (userPrompt && userPrompt.trim()) {
    prompt += `

User preference:
"${userPrompt.trim()}"`;
  }

  return prompt;
}