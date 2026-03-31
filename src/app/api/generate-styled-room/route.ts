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

    // Photo-editor prompt — faithful to the room, smart about real-world conditions
    const hasLighting = items.some((i) =>
      i.category.toLowerCase().includes("light")
    );
    const editPrompt = `You are a photo editor. Edit this real room photo to show what it would look like with a few new items added. The room must be instantly recognizable as the exact same room.

Add these new items at the specified locations:
${itemList}

ABSOLUTE RULES — never break these:
- People: if anyone is visible, preserve them EXACTLY — same skin tone, same hair, same clothes, same position. Do NOT tint, recolor, reshape, or alter any person in any way.
- Pets: if any animals are visible, preserve them EXACTLY — same fur color, same size, same position. Do NOT alter any animal.
- Walls, floor, ceiling, major furniture, architectural features — keep exactly as they are. Same colors, same textures, same materials.

Room lighting (subtle improvement only):
- You may improve the ambient room lighting to feel slightly warmer and more inviting — as if better lamps were turned on.${hasLighting ? "\n- The new lighting items in the list are switched ON and casting a natural warm glow in their immediate area." : ""}
- Apply lighting changes ONLY to room surfaces (walls, ceiling, floor reflections) — NEVER change the color of people, pets, furniture, or objects.
- Think "the room has nicer lighting" — NOT "everything is orange/golden." Keep it believable and subtle.

Handling mess and clutter:
- If the room is messy, that's fine — it's a real lived-in space. Keep it recognizable.
- You may do VERY LIMITED tidying: straighten a crooked blanket, align pillows that are slightly off, fix a tilted frame.
- Do NOT remove clutter, hide personal items, or dramatically reorganize. A few clothes on a chair, items on a desk, things on the floor — leave them. The owner knows their room is messy and will be suspicious if it's magically spotless.
- The goal is "same room with new items added" — not "room that was cleaned by a crew."

Placing new items:
- Place the new items naturally so they look like they belong in the scene.
- Items should have realistic scale, shadows, and lighting consistent with the room.

What you must NOT do:
- Do NOT add objects that aren't in the item list above.
- Do NOT change any surface material, paint color, or existing texture.
- Do NOT apply color grading, filters, or heavy tone shifts to the whole image.
- Do NOT make it look like CGI or a render — it should still feel like a real phone photo, just with new items placed in.

The owner should look at this and think: "That's definitely my room — but those new items look great in it."`;


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
