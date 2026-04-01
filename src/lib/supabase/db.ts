import type { SupabaseClient } from "@supabase/supabase-js";
import type { StylingResult, ProductMatch, StylingItem } from "@/lib/schema";

// ── Types ────────────────────────────────────────────────────

export interface AnalysisRow {
  id: string;
  user_id: string;
  result: StylingResult;
  original_image_path: string | null;
  styled_image_path: string | null;
  styled_image_url: string | null;
  user_prompt: string | null;
  budget: number;
  vibe: string | null;
  product_matches: ProductMatch[];
  created_at: string;
  archived_at: string | null;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  analysis_id: string | null;
  item_name: string;
  item_category: string | null;
  estimated_price: number | null;
  search_query: string | null;
  placement: string | null;
  reason: string | null;
  product_url: string | null;
  product_title: string | null;
  real_price: number | null;
  store: string | null;
  thumbnail: string | null;
  created_at: string;
}

// ── Analyses ─────────────────────────────────────────────────

export async function saveAnalysis(
  supabase: SupabaseClient,
  params: {
    userId: string;
    result: StylingResult;
    imageBase64: string;
    userPrompt?: string;
    budget: number;
    vibe?: string | null;
  }
): Promise<string | null> {
  // 1. Insert the analysis row first to get the ID
  const { data: row, error: insertErr } = await supabase
    .from("analyses")
    .insert({
      user_id: params.userId,
      result: params.result,
      user_prompt: params.userPrompt || null,
      budget: params.budget,
      vibe: params.vibe || null,
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    console.error("Failed to save analysis:", insertErr);
    return null;
  }

  const analysisId = row.id;

  // 2. Upload original image to storage (fire-and-forget)
  uploadOriginalImage(supabase, params.userId, analysisId, params.imageBase64);

  return analysisId;
}

async function uploadOriginalImage(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string,
  imageBase64: string,
) {
  try {
    const match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return;
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    const path = `${userId}/${analysisId}/original.${ext}`;

    const { error } = await supabase.storage
      .from("room-images")
      .upload(path, bytes, { contentType: `image/${match[1]}`, upsert: true });

    if (!error) {
      await supabase
        .from("analyses")
        .update({ original_image_path: path })
        .eq("id", analysisId);
    }
  } catch (e) {
    console.error("Failed to upload original image:", e);
  }
}

export async function updateAnalysisStyledImage(
  supabase: SupabaseClient,
  analysisId: string,
  styledImageUrl: string,
) {
  await supabase
    .from("analyses")
    .update({ styled_image_url: styledImageUrl })
    .eq("id", analysisId);
}

export async function updateAnalysisProducts(
  supabase: SupabaseClient,
  analysisId: string,
  matches: ProductMatch[],
) {
  await supabase
    .from("analyses")
    .update({ product_matches: matches })
    .eq("id", analysisId);
}

export async function fetchAnalyses(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<AnalysisRow[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch analyses:", error);
    return [];
  }
  return (data ?? []) as AnalysisRow[];
}

export async function archiveAnalysis(
  supabase: SupabaseClient,
  analysisId: string,
) {
  await supabase
    .from("analyses")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", analysisId);
}

export function getImageUrl(
  supabase: SupabaseClient,
  path: string,
): string {
  const { data } = supabase.storage.from("room-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedImageUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("room-images")
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

// ── Favorites ────────────────────────────────────────────────

export async function addFavorite(
  supabase: SupabaseClient,
  userId: string,
  item: StylingItem,
  analysisId?: string,
  match?: ProductMatch,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("favorites")
    .insert({
      user_id: userId,
      analysis_id: analysisId || null,
      item_name: item.name,
      item_category: item.category,
      estimated_price: item.estimated_price,
      search_query: item.search_query,
      placement: item.placement,
      reason: item.reason,
      product_url: match?.product_url || null,
      product_title: match?.product_title || null,
      real_price: match?.real_price ?? null,
      store: match?.store || null,
      thumbnail: match?.thumbnail || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to add favorite:", error);
    return null;
  }
  return data?.id ?? null;
}

export async function removeFavorite(
  supabase: SupabaseClient,
  favoriteId: string,
) {
  await supabase.from("favorites").delete().eq("id", favoriteId);
}

export async function removeFavoriteByItem(
  supabase: SupabaseClient,
  userId: string,
  itemName: string,
) {
  await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("item_name", itemName);
}

export async function fetchFavorites(
  supabase: SupabaseClient,
  userId: string,
): Promise<FavoriteRow[]> {
  try {
    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // Suppress auth-related errors during session initialization
      if (error.code !== "PGRST301") {
        console.error("Failed to fetch favorites:", error);
      }
      return [];
    }
    return (data ?? []) as FavoriteRow[];
  } catch {
    return [];
  }
}

