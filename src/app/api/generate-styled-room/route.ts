import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { optimizeForEdit, parseDataUrl } from "@/lib/image";
import { generateStyledRoomWithProvider } from "@/lib/image-gen";
import { createClient } from "@/lib/supabase/server";

interface ItemInput {
  name: string;
  category: string;
  placement: string;
  product_title?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check — prevent unauthenticated credit burn
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to generate styled rooms" },
        { status: 401 }
      );
    }

    if (
      !process.env.OPENAI_API_KEY &&
      !process.env.GOOGLE_API_KEY &&
      !process.env.REPLICATE_API_TOKEN
    ) {
      return NextResponse.json(
        { error: "No image generation API key configured" },
        { status: 500 }
      );
    }

    const { imageBase64, items, styleDirection, provider, analysisId } = (await req.json()) as {
      imageBase64: string;
      items: ItemInput[];
      styleDirection?: string;
      provider?: "gemini" | "imagen";
      analysisId?: string;
    };

    if (!imageBase64 || !items?.length) {
      return NextResponse.json(
        { error: "Missing image or items" },
        { status: 400 }
      );
    }

    // Optimize image for editing (resized to 1536px, PNG) + capture original dimensions
    const { buffer: optimizedBuffer, originalWidth, originalHeight } = await optimizeForEdit(imageBase64);

    const itemList = items
      .map((item, i) => {
        const displayName = item.product_title
          ? `${item.product_title} (originally: ${item.name})`
          : item.name;
        return `${i + 1}. ${displayName} (${item.category}) — placed ${item.placement}`;
      })
      .join("\n");

    const hasLighting = items.some((i) => i.category.toLowerCase().includes("light"));

    // Base compositing instructions shared by both providers
    const basePrompt = `This is a real photograph of a room. Your job is a precise photo-edit: composite new items into the existing photo so the result looks like an untouched photograph.

PRESERVE EVERYTHING — this is non-negotiable:
- Same walls, floor, ceiling, furniture, objects, layout, camera angle, and perspective
- Do NOT move, resize, repaint, remove, or alter ANY existing object
- Do NOT hallucinate new space, expand walls, or clear surfaces

ADD ONLY these items at their specified locations:
${itemList}
${styleDirection ? `\nStyle direction: ${styleDirection} — let this guide the items' look, NOT the room itself.` : ""}

Compositing rules:
- Each item must match the room's existing perspective, scale, and depth of field
- Items cast soft shadows consistent with the room's light source direction
- Items interact realistically with surfaces (a vase sits ON a table, a throw drapes OVER an arm)
- If an item cannot fit naturally at its location without overlapping existing objects, omit it — fewer items is better than a broken photo
- CRITICAL: Add ONLY the exact products listed — no extra accessories, no styling additions. If the list says "floating shelf", render an empty shelf — do NOT add vases, books, or decor on it. The user can only buy the listed products, so the image must show exactly what they will receive.`;

    // Imagen 3 — strict preservation, no atmosphere changes
    const imagenPrompt = `${basePrompt}
- Same lighting direction, color temperature, and shadow patterns
${hasLighting ? "- Since lighting items are included, you may subtly warm the ambient light near those items." : ""}

The final image must be indistinguishable from a real photograph of this same room with these items naturally present.`;

    // OpenAI gpt-image-1.5 — natural but polished, strict size preservation
    const openaiPrompt = `${basePrompt}
- Same lighting direction, color temperature, and shadow patterns
- Every existing piece of furniture must remain the EXACT same size, shape, position, and color — do NOT resize, reshape, stretch, or reposition any existing object
${hasLighting ? "- Since lighting items are included, you may subtly warm the ambient light near those items." : ""}

PHOTO POLISH — keep it natural, just slightly elevated:
- The room should look like a cleaner, slightly better-lit version of itself — as if someone tidied up and the natural light happened to be really good that day
- You may subtly warm the overall tone and gently lift the contrast so the photo feels inviting rather than flat
- Keep it realistic and natural — it should never look filtered, processed, or AI-generated
- The new items should blend in so well that the photo looks like they were always there

The final image must be indistinguishable from a real photograph of this same room with these items naturally present.`;

    const size = pickSize(optimizedBuffer);

    // Provider routing with per-provider prompts
    let result;
    if (provider === "gemini") {
      result = await generateStyledRoomWithProvider(optimizedBuffer, imagenPrompt, size, "gemini");
    } else if (provider === "imagen") {
      result = await generateStyledRoomWithProvider(optimizedBuffer, imagenPrompt, size, "imagen");
    } else {
      // Default: try OpenAI (cinematic) first, fall back to Imagen (strict)
      try {
        result = await generateStyledRoomWithProvider(optimizedBuffer, openaiPrompt, size, "openai");
      } catch (e) {
        console.warn("OpenAI gpt-image-1.5 failed, falling back to Imagen 3:", e);
        result = await generateStyledRoomWithProvider(optimizedBuffer, imagenPrompt, size, "imagen");
      }
    }

    console.log(`Styled room generated via ${result.provider}`);

    // Resize output to match original aspect ratio (capped at AI native resolution)
    const correctedDataUrl = await matchOriginalAspectRatio(
      result.imageDataUrl,
      originalWidth,
      originalHeight
    );

    // Upload to Supabase storage as JPEG for sharing/persistence (fire-and-forget)
    let styledStorageUrl: string | null = null;
    if (analysisId) {
      try {
        const { buffer: correctedBuf } = parseDataUrl(correctedDataUrl);
        const jpegBuf = await sharp(correctedBuf).jpeg({ quality: 85 }).toBuffer();
        const storagePath = `${user.id}/${analysisId}/styled.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("room-images")
          .upload(storagePath, jpegBuf, { contentType: "image/jpeg", upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("room-images").getPublicUrl(storagePath);
          styledStorageUrl = urlData.publicUrl;
          // Persist the storage URL (not the data URL) to the analyses table
          await supabase
            .from("analyses")
            .update({ styled_image_url: styledStorageUrl })
            .eq("id", analysisId);
        } else {
          console.warn("Failed to upload styled image to storage:", uploadErr);
        }
      } catch (e) {
        console.warn("Styled image storage upload failed:", e);
      }
    }

    return NextResponse.json({
      styledImageUrl: correctedDataUrl,
      styledStorageUrl,
      provider: result.provider,
    });
  } catch (e) {
    console.error("Generate styled room error:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to generate styled room",
      },
      { status: 500 }
    );
  }
}

/**
 * Resize AI-generated image to match the original photo's aspect ratio.
 * Capped at the AI's native resolution (no upscaling beyond what was generated).
 */
async function matchOriginalAspectRatio(
  dataUrl: string,
  origW: number,
  origH: number
): Promise<string> {
  const { buffer } = parseDataUrl(dataUrl);
  const meta = await sharp(buffer).metadata();
  const genW = meta.width ?? 1024;
  const genH = meta.height ?? 1024;

  const origRatio = origW / origH;
  const genRatio = genW / genH;

  // If aspect ratios already match closely, skip resize
  if (Math.abs(origRatio - genRatio) < 0.05) return dataUrl;

  // Compute target size that matches original aspect ratio
  // but stays within the generated image's pixel budget
  let targetW: number;
  let targetH: number;

  if (origRatio > genRatio) {
    // Original is wider — use generated width, shrink height
    targetW = genW;
    targetH = Math.round(genW / origRatio);
  } else {
    // Original is taller — use generated height, shrink width
    targetH = genH;
    targetW = Math.round(genH * origRatio);
  }

  const resized = await sharp(buffer)
    .resize(targetW, targetH, { fit: "fill" })
    .png()
    .toBuffer();

  return `data:image/png;base64,${resized.toString("base64")}`;
}

/** Detect aspect ratio from PNG header for gpt-image-1 size param */
function pickSize(
  buf: Buffer
): "1024x1024" | "1536x1024" | "1024x1536" {
  // optimizeForEdit always outputs PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width > height * 1.2) return "1536x1024"; // landscape
    if (height > width * 1.2) return "1024x1536"; // portrait
  }
  return "1024x1024";
}

