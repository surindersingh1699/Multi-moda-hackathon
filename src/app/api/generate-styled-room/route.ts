import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { optimizeForEdit, parseDataUrl } from "@/lib/image";
import { generateStyledRoom } from "@/lib/image-gen";
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

    const { imageBase64, items, styleDirection } = (await req.json()) as {
      imageBase64: string;
      items: ItemInput[];
      styleDirection?: string;
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

    // Photo-editor prompt — preserve room geometry, add decor only
    const editPrompt = `Restyle this room by adding the recommended decor items, but preserve the original room geometry exactly.
${styleDirection ? `\nOverall style direction: ${styleDirection}\n` : ""}
Items to add:
${itemList}

NON-NEGOTIABLE STRUCTURE RULES:
- Do NOT change the room layout, camera angle, perspective, wall positions, ceiling line, floor shape, or depth.
- Do NOT move, resize, remove, compress, stretch, crop, or reshape any existing architectural or built-in elements.
- Windows must remain windows. Do not turn windows into walls, art, curtains-only surfaces, or blank space.
- TVs, monitors, screens, mirrors, doors, vents, outlets, shelves, and built-in fixtures must keep their original size, shape, position, and proportions.
- Do NOT shrink or compress existing furniture or objects to make space for new products.
- Do NOT invent new walls, remove corners, widen surfaces, or flatten alcoves.
- Keep all existing major furniture and permanent room features in the same exact location and proportions.
- People: if anyone is visible, preserve them EXACTLY — same skin tone, hair, clothes, position.
- Pets: if any animals are visible, preserve them EXACTLY.

DECOR PLACEMENT RULES:
- Only add products where there is realistic free space.
- If there is not enough room, use fewer items instead of forcing them in.
- Never overlap products onto TVs, windows, doors, walkways, or built-in fixtures.
- Maintain realistic scale for every added item.
- Prefer subtle, believable styling over dramatic transformation.

VISUAL GOAL:
- Produce a polished, attractive, eye-catching makeover.
- The result should feel like the same room, just better styled.
- Keep photorealism high and preserve the original identity of the room.

Return a single edited image.`;


    const size = pickSize(optimizedBuffer);

    const result = await generateStyledRoom(
      optimizedBuffer,
      editPrompt,
      size
    );

    console.log(`Styled room generated via ${result.provider}`);

    // Resize output to match original aspect ratio (capped at AI native resolution)
    const correctedDataUrl = await matchOriginalAspectRatio(
      result.imageDataUrl,
      originalWidth,
      originalHeight
    );

    return NextResponse.json({
      styledImageUrl: correctedDataUrl,
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
