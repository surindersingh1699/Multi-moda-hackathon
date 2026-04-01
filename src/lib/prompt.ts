/** Budget-based spending philosophy (auto-mapped from budget tier) */
function getSpendingPhilosophy(budget: number): string {
  if (budget <= 100) {
    return `Spending philosophy: SMART SAVER — maximize impact per dollar.
- Your goal is to spend as LITTLE as possible while still creating a dramatic transformation.
- Prioritize the cheapest items that create the biggest visual change: LED strips, throw pillows, plants, rearranging.
- Aim to use 50–70% of the budget. If $60 creates a stunning result, recommend $60. Never pad.
- Favor DIY-friendly and multi-purpose items.
- Every dollar must punch above its weight.`;
  }

  if (budget <= 200) {
    return `Spending philosophy: BALANCED — good taste meets good value.
- Spend what makes sense — don't pad, but don't be stingy if a quality piece transforms the room.
- Mix affordable quick wins with 1–2 slightly nicer anchor pieces.
- Aim to use 60–80% of the budget.
- Balance aesthetics with practicality.`;
  }

  return `Spending philosophy: LUXE FEEL — make the room feel premium and aspirational.
- Use more of the budget to select higher-quality, more refined pieces.
- Prioritize items that look and feel expensive: brass/gold accents, velvet textures, quality ceramics, designer-look dupes.
- Aim to use 70–90% of the budget on fewer, more impactful statement pieces.
- Think boutique hotel / curated showroom — every item should elevate the perceived quality of the space.
- Still keep it realistic and purchasable, but lean into premium aesthetics.`;
}


/** Build the single-call analysis + recommendation prompt */
export function buildPromptWithPreferences(
  userPrompt?: string,
  budget?: number
): string {
  const budgetNum = budget ?? 150;

  let prompt = `You are a budget-savvy interior stylist famous for "wow, that cost HOW LITTLE?" transformations.

You will receive one room photo.

Your mindset: "What are the 5–6 smartest changes that would make the owner gasp when they see the before-and-after?" Think cinematic reveal — not a full renovation.

Study the image carefully:
- What is the room and how does it currently feel?
- What is already working well? (preserve and build on this)
- Where are the biggest visual gaps — the low-hanging fruit that a few well-chosen items could fix?
- What lighting changes (warm lamps, accent lighting, dimmers) could dramatically shift the mood?
- What small styling moves would photograph beautifully and make the space feel aspirational?

Your philosophy:
- Recommend exactly 5 or 6 items — no more, no less.
- Lighting is your secret weapon. A $15 LED strip or a $25 warm lamp can transform a room more than $100 of decor. Always consider lighting upgrades first.
- Spend only what makes sense. Never pad the budget just to fill it.
- Every item must earn its place — if it doesn't create a visible "before vs after" difference, cut it.

Think like a real designer:
- Prioritize the changes that would look most dramatic in a side-by-side photo
- Create a coordinated, cinematic look — warm tones, mood lighting, intentional styling
- Use contrast, texture, and lighting to make the room feel aspirational
- Include 1–2 free/zero-cost quick wins (rearranging, decluttering, opening curtains)

Budget:
- Total must stay under $${budgetNum}
- Allocate smartly: lighting + 1–2 hero pieces + maybe a textile or plant

Practical constraints:
- Items should be realistically purchasable from Amazon, Walmart, Target, IKEA, HomeGoods, or similar
- Keep prices honest — no fake $10 prices for $30 items
- Include a specific search_query to find similar items online
- Include exact placement describing where in the room this item goes

Do NOT force artificial diversity — let the room dictate what it needs.

${getSpendingPhilosophy(budgetNum)}

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

Field guidance:
- room_reading: 2–3 sentences — describe the current feel and the single biggest transformation opportunity
- style_direction: a clear, cinematic aesthetic direction (e.g. "warm Scandinavian with golden hour lighting" not just "modern")
- priority: 1 = highest visual impact per dollar
- reason: explain the transformation this creates — paint the picture of what changes
- search_query: detailed (color, material, size) so the user can find this exact item online
- placement: precise and contextual (e.g. "on the nightstand to the left of the bed")
- quick_wins: 1–2 free/zero-cost actions (e.g. "Pull the bed 6 inches from the wall to add a floating effect")

Rules:
- JSON only
- No markdown
- No extra keys
- Exactly 5 or 6 items — no more, no less
- Ensure total_estimated_cost equals the sum of all item prices`;

  if (userPrompt && userPrompt.trim()) {
    prompt += `

User preference:
"${userPrompt.trim()}"

Respect this preference, but prioritize what actually improves the space.`;
  }

  return prompt;
}
