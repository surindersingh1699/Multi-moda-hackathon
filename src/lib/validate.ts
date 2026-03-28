import {
  StylingResult,
  StylingItem,
  VALID_CATEGORIES,
  VALID_STORES,
  type Category,
  type Store,
} from "./schema";

type ValidationOk = { ok: true; data: StylingResult };
type ValidationErr = { ok: false; error: string };

/** Strict validation used server-side (rejects invalid responses). */
export function validateResult(data: unknown): ValidationOk | ValidationErr {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, error: "Response is not a valid object" };
  }

  const r = data as Record<string, unknown>;

  if (
    typeof r.room_reading !== "string" ||
    typeof r.style_direction !== "string" ||
    !Array.isArray(r.items) ||
    !Array.isArray(r.buy_order) ||
    typeof r.total_estimated_cost !== "number"
  ) {
    return { ok: false, error: "Missing required top-level fields" };
  }

  if (r.items.length < 4 || r.items.length > 6) {
    return { ok: false, error: `Expected 4-6 items, got ${r.items.length}` };
  }

  if (r.total_estimated_cost > 150) {
    return {
      ok: false,
      error: `Total cost $${r.total_estimated_cost} exceeds $150 budget`,
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
    if (!(VALID_CATEGORIES as readonly string[]).includes(it.category as string)) {
      return { ok: false, error: `Invalid category: ${it.category}` };
    }
    if (!(VALID_STORES as readonly string[]).includes(it.suggested_store as string)) {
      return { ok: false, error: `Invalid store: ${it.suggested_store}` };
    }
    if (typeof it.placement_x !== "number" || it.placement_x < 0 || it.placement_x > 100) {
      return { ok: false, error: `Invalid placement_x for ${it.name}` };
    }
    if (typeof it.placement_y !== "number" || it.placement_y < 0 || it.placement_y > 100) {
      return { ok: false, error: `Invalid placement_y for ${it.name}` };
    }
  }

  return { ok: true, data: data as StylingResult };
}

// Default placement positions (staggered) when AI doesn't provide coordinates
const DEFAULT_POSITIONS = [
  { x: 50, y: 40 },
  { x: 25, y: 25 },
  { x: 75, y: 30 },
  { x: 30, y: 70 },
  { x: 70, y: 65 },
  { x: 50, y: 80 },
];

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
  const buy_order = Array.isArray(r.buy_order)
    ? r.buy_order.filter((s): s is string => typeof s === "string")
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

    const fallback = DEFAULT_POSITIONS[items.length] ?? { x: 50, y: 50 };

    const parsed: StylingItem = {
      name: it.name,
      category: (VALID_CATEGORIES as readonly string[]).includes(it.category as string)
        ? (it.category as Category)
        : "accessories",
      estimated_price:
        typeof it.estimated_price === "number" && isFinite(it.estimated_price)
          ? it.estimated_price
          : 0,
      priority:
        typeof it.priority === "number" ? it.priority : items.length + 1,
      suggested_store: (VALID_STORES as readonly string[]).includes(it.suggested_store as string)
        ? (it.suggested_store as Store)
        : "Amazon",
      reason:
        typeof it.reason === "string" && it.reason
          ? it.reason
          : "Suggested for your room.",
      placement_x:
        typeof it.placement_x === "number" && it.placement_x >= 0 && it.placement_x <= 100
          ? it.placement_x
          : fallback.x,
      placement_y:
        typeof it.placement_y === "number" && it.placement_y >= 0 && it.placement_y <= 100
          ? it.placement_y
          : fallback.y,
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
    buy_order: buy_order.length > 0 ? buy_order : items.map((i) => i.name),
    total_estimated_cost:
      total_estimated_cost ?? items.reduce((s, i) => s + i.estimated_price, 0),
  };

  return { ok: true, data: result };
}
