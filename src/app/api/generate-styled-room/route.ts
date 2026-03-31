import { NextRequest, NextResponse } from "next/server";
import { optimizeForEdit } from "@/lib/image";
import { generateStyledRoom } from "@/lib/image-gen";

interface ItemInput {
  name: string;
  category: string;
  placement: string;
}

export async function POST(req: NextRequest) {
  try {
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

    const { imageBase64, items } = (await req.json()) as {
      imageBase64: string;
      items: ItemInput[];
    };

    if (!imageBase64 || !items?.length) {
      return NextResponse.json(
        { error: "Missing image or items" },
        { status: 400 }
      );
    }

    // Optimize image for editing (resized to 1536px, PNG)
    const { buffer: optimizedBuffer } = await optimizeForEdit(imageBase64);

    const itemList = items
      .map(
        (item, i) =>
          `${i + 1}. ${item.name} (${item.category}) — placed ${item.placement}`
      )
      .join("\n");

    // Cinematic transformation prompt — faithful to the room but visually exciting
    const hasLighting = items.some((i) =>
      i.category.toLowerCase().includes("light")
    );
    const editPrompt = `This is the user's real room photo. Create a cinematic "after" version that makes them excited about their room's potential.

Add these new items at the specified locations:
${itemList}

What you MUST preserve (non-negotiable):
- Same walls, floor, ceiling, bed/sofa, major furniture, and architectural features. The room must be instantly recognizable as THEIR room.

Cinematic lighting & mood (this is KEY):
- Shift the lighting to golden hour / warm evening ambiance — soft, warm, inviting.${hasLighting ? "\n- The new lighting items are ON and casting beautiful warm light, creating pools of light and gentle shadows." : "\n- Even without new lights, imagine the room at its best lighting moment — warm, soft, and atmospheric."}
- Add subtle depth: gentle shadows, warm highlights, the cozy glow of a well-lit space.
- Think "real estate photography at magic hour" — flattering but believable.

What you MAY do (styling touches):
- Neatly organize what's already there — straighten bedding, fluff pillows, tidy surfaces.
- Place new items naturally so they look like they've always been there.
- Subtly freshen the space — like someone styled it for a photoshoot.
- Add very subtle atmospheric warmth to make the space feel inviting and aspirational.

What you must NOT do:
- Do NOT add furniture, surfaces, or objects that aren't in the list above.
- Do NOT change floor material, wall color, or any existing texture/finish.
- Do NOT make it look unrealistically CGI or over-processed — it should still feel like a real photo.

The result should make the owner think: "Wow, my room could actually look like THAT with just a few changes?" — excited, inspired, and ready to buy.`;

    const size = pickSize(optimizedBuffer);

    const result = await generateStyledRoom(
      optimizedBuffer,
      editPrompt,
      size
    );

    console.log(`Styled room generated via ${result.provider}`);

    return NextResponse.json({
      styledImageUrl: result.imageDataUrl,
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
