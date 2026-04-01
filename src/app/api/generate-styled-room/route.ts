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

    // Base instructions shared by both providers
    const basePrompt = `You are a professional room stylist photographing a transformation. This is a real photo of a room. You are creating the "AFTER" shot — same room, same furniture, but with new items that completely shift the atmosphere.

PRESERVE THE ROOM — this is the #1 rule, above everything else:
- Every existing piece of furniture (tables, TVs, sofas, beds, desks, chairs, shelves, dressers) must remain the EXACT same size, shape, position, proportion, and color. A table that is 3 feet wide in the original must be 3 feet wide in the output. Do NOT shrink, stretch, warp, resize, move, or reshape ANY existing furniture.
- Same walls, floor, ceiling, objects, layout, camera angle, and perspective
- Do NOT repaint, remove, or alter ANY existing object
- Do NOT hallucinate new space, expand walls, or clear surfaces
- If you are unsure whether something changed size — keep it exactly as the original. When in doubt, preserve.

ADD these items at their specified locations:
${itemList}
${styleDirection ? `\nTransformation direction: ${styleDirection}` : ""}

STYLING RULES (not just compositing — this is a transformation):
- Each item must match the room's perspective, scale, and depth of field
- Items interact realistically with surfaces (a throw drapes naturally OVER an arm, a vase sits ON a table with a contact shadow)
- If an item cannot fit naturally without overlapping existing objects, omit it
- CRITICAL: Add ONLY the exact products listed — no extra accessories. If the list says "floating shelf", render an empty shelf — no bonus vases or books on it.

ATMOSPHERE IS EVERYTHING — this is what separates a styled room from a Photoshop job:
- NEW LIGHTING ITEMS MUST ACTUALLY LIGHT THE ROOM: If a lamp, candle, or LED strip is in the list, it should be ON and casting realistic warm light onto nearby surfaces. Show the pool of warm light on the wall behind a lamp. Show candle glow on the tabletop. This is the #1 thing that transforms a room's feel.
- SHADOWS TELL THE STORY: Every new item casts soft, directional shadows consistent with the room's light sources. If a new lamp is added, it becomes an additional light source that creates its own shadows and warm zones.
- TEXTURE HAS DEPTH: Throws should look soft and draped with visible texture. Pillows should have dimension. Woven items should catch light on their ridges. Don't render flat color blocks — render materials.
- THE ROOM SHOULD FEEL WARMER AND MORE INVITING: The overall image should subtly shift toward warmth and coziness — not by adding a filter, but because warm lighting items are actually illuminating the space and soft textures are absorbing the harshness.`;

    // Imagen 3 — short, action-first prompt (Imagen works best with concise directives)
    const imagenItemList = items
      .map((item, i) => {
        const name = item.product_title || item.name;
        return `${i + 1}. Add a ${name} ${item.placement}`;
      })
      .join("\n");

    const imagenPrompt = `Edit this room photo to add new items while keeping every existing piece of furniture the exact same size, shape, position, and color. Do not move, resize, or remove anything already in the room.

Add these items:
${imagenItemList}
${styleDirection ? `\nStyle: ${styleDirection}` : ""}

Each new item must look realistic — correct perspective, scale, soft shadows, and natural surface interaction.${hasLighting ? " Lamps and candles should be turned ON, casting warm light on nearby walls and surfaces." : ""} The result should look like an untouched professional interior photograph.`;

    // OpenAI gpt-image-1.5 — full cinematic transformation
    const openaiPrompt = `${basePrompt}
- Every existing piece of furniture must remain the EXACT same size, shape, position, and color — do NOT resize, reshape, stretch, or reposition any existing object
${hasLighting ? "- Lighting items are ON — show realistic warm light pools, glow on nearby surfaces, and soft ambient contribution to the room's overall illumination. The room should feel noticeably warmer and moodier because of these light sources." : "- Maintain the room's existing light direction."}

THE "AFTER" PHOTO FEEL:
- This should look like a TikTok room transformation — same room, but it FEELS completely different
- The room should feel warmer, more layered, more intentional — like someone who really cares about their space lives here
- Warm up the color temperature subtly — shift toward golden/amber tones rather than cool/clinical
- Lift the contrast gently so the room has depth — dark corners feel moody, lit areas feel warm
- The new items should look like they've ALWAYS been there — not freshly placed, but lived-with
- It should never look filtered or AI-generated — it should look like the room on its absolute best day, with perfect natural light pouring in

This is the photo that makes someone say "I need to transform my room like this."`;


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

