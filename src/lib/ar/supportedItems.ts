/** Categories that have 3D models available for AR preview. */
export const AR_SUPPORTED_CATEGORIES: readonly string[] = [
  "plants",
  "lighting",
] as const;

/** Maps supported categories to their default .glb model path. */
export const CATEGORY_MODEL_MAP: Record<string, string> = {
  plants: "/models/plant.glb",
  lighting: "/models/lamp.glb",
};

/** Check if a category supports AR/3D preview. */
export function isArSupported(category: string): boolean {
  return AR_SUPPORTED_CATEGORIES.includes(category);
}
