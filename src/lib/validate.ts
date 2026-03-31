import { StylingResult, StylingItem, VisionAnalysis } from "./schema";

type ValidationOk = { ok: true; data: StylingResult };
type ValidationErr = { ok: false; error: string };
type VisionOk = { ok: true; data: VisionAnalysis };
type VisionErr = { ok: false; error: string };

/** Strict validation used server-side (rejects invalid responses). */
export function validateResult(
  data: unknown,
  budget = 150
): ValidationOk | ValidationErr {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "Response is not a valid object" };
  }

  const r = data as Record<string, unknown>;

  if (
    typeof r.room_reading !== "string" ||
    typeof r.style_direction !== "string" ||
    !Array.isArray(r.items) ||
    !Array.isArray(r.quick_wins) ||
    typeof r.total_estimated_cost !== "number"
  ) {
    return { ok: false, error: "Missing required top-level fields" };
  }

  const minItems = budget <= 100 ? 3 : 4;
  if (r.items.length < minItems || r.items.length > 6) {
    return { ok: false, error: `Expected ${minItems}-6 items, got ${r.items.length}` };
  }

  if (r.total_estimated_cost > budget) {
    return {
      ok: false,
      error: `Total cost $${r.total_estimated_cost} exceeds $${budget} budget`,
    };
  }

  // Validate sum of individual prices matches declared total (within 10%)
  const sumOfPrices = (r.items as StylingItem[]).reduce(
    (sum, item) => sum + (item.estimated_price ?? 0),
    0
  );
  const totalCost = r.total_estimated_cost as number;
  const tolerance = Math.max(totalCost * 0.1, 1);
  if (Math.abs(sumOfPrices - totalCost) > tolerance) {
    return {
      ok: false,
      error: `Price sum $${sumOfPrices.toFixed(2)} doesn't match total $${totalCost} (tolerance: 10%)`,
    };
  }

  for (const item of r.items) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "Invalid item in items array" };
    }
    const it = item as Record<string, unknown>;
    if (typeof it.name !== "string" || typeof it.reason !== "string") {
      return { ok: false, error: "Item missing name or reason" };
    }
    if (typeof it.category !== "string" || !it.category) {
      return { ok: false, error: `Missing category for ${it.name}` };
    }
    if (typeof it.suggested_store !== "string" || !it.suggested_store) {
      return { ok: false, error: `Missing store for ${it.name}` };
    }
    if (typeof it.search_query !== "string" || !it.search_query) {
      return { ok: false, error: `Missing search_query for ${it.name}` };
    }
    if (typeof it.placement !== "string" || !it.placement) {
      return { ok: false, error: `Missing placement for ${it.name}` };
    }
  }

  return { ok: true, data: data as StylingResult };
}

/** Lenient client-side parse: validates shape and fills safe defaults for missing fields. */
export function parseResultSafe(data: unknown): ValidationOk | ValidationErr {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "Response is not a valid object" };
  }

  const r = data as Record<string, unknown>;

  const room_reading =
    typeof r.room_reading === "string" && r.room_reading
      ? r.room_reading
      : null;
  const style_direction =
    typeof r.style_direction === "string" && r.style_direction
      ? r.style_direction
      : null;
  const rawItems = Array.isArray(r.items) ? r.items : null;
  const quick_wins = Array.isArray(r.quick_wins)
    ? r.quick_wins.filter((s): s is string => typeof s === "string")
    : [];
  const total_estimated_cost =
    typeof r.total_estimated_cost === "number" && isFinite(r.total_estimated_cost)
      ? r.total_estimated_cost
      : null;

  if (!room_reading || !style_direction || !rawItems || rawItems.length === 0) {
    return { ok: false, error: "Response is missing critical fields" };
  }

  const items: StylingItem[] = [];
  for (const raw of rawItems) {
    if (typeof raw !== "object" || raw === null) continue;
    const it = raw as Record<string, unknown>;
    if (typeof it.name !== "string" || !it.name) continue;

    const parsed: StylingItem = {
      name: it.name,
      category:
        typeof it.category === "string" && it.category
          ? it.category
          : "accent piece",
      estimated_price:
        typeof it.estimated_price === "number" && isFinite(it.estimated_price)
          ? it.estimated_price
          : 0,
      priority:
        typeof it.priority === "number" ? it.priority : items.length + 1,
      suggested_store:
        typeof it.suggested_store === "string" && it.suggested_store
          ? it.suggested_store
          : "Amazon",
      reason:
        typeof it.reason === "string" && it.reason
          ? it.reason
          : "Suggested for your room.",
      search_query:
        typeof it.search_query === "string" && it.search_query
          ? it.search_query
          : it.name,
      placement:
        typeof it.placement === "string" && it.placement
          ? it.placement
          : "In the room where it fits best",
    };

    items.push(parsed);
  }

  if (items.length === 0) {
    return { ok: false, error: "No valid items in response" };
  }

  const result: StylingResult = {
    room_reading,
    style_direction,
    items,
    quick_wins: quick_wins.length > 0
      ? quick_wins
      : items.slice(0, 2).map((i) => i.name),
    total_estimated_cost:
      total_estimated_cost ?? items.reduce((s, i) => s + i.estimated_price, 0),
  };

  return { ok: true, data: result };
}

/** Validate Step 1 vision analysis output */
export function validateVisionAnalysis(
  data: unknown
): VisionOk | VisionErr {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "Vision analysis is not a valid object" };
  }
  const r = data as Record<string, unknown>;
  if (typeof r.room_type !== "string" || !r.room_type) {
    return { ok: false, error: "Missing room_type" };
  }
  if (typeof r.room_reading !== "string" || !r.room_reading) {
    return { ok: false, error: "Missing room_reading" };
  }
  if (typeof r.style_direction !== "string" || !r.style_direction) {
    return { ok: false, error: "Missing style_direction" };
  }
  if (typeof r.existing_color_palette !== "string" || !r.existing_color_palette) {
    return { ok: false, error: "Missing existing_color_palette" };
  }
  if (typeof r.lighting_assessment !== "string" || !r.lighting_assessment) {
    return { ok: false, error: "Missing lighting_assessment" };
  }
  if (typeof r.whats_working !== "string" || !r.whats_working) {
    return { ok: false, error: "Missing whats_working" };
  }
  if (!Array.isArray(r.identified_needs) || r.identified_needs.length === 0) {
    return { ok: false, error: "Missing or empty identified_needs" };
  }
  return { ok: true, data: data as VisionAnalysis };
}
