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

    // Positive-framing prompt — works better with all image gen models
    const editPrompt = `This is a real room photo. Keep everything exactly as it is — same walls, floor, furniture, layout, perspective, and lighting.

Your only task: naturally add these specific small items into the existing room at the exact locations specified:
${itemList}

Each item has a specific placement — follow it precisely. The items should look naturally integrated, matching the room's existing scale and perspective.

${items.some((i) => i.category.toLowerCase().includes("light")) ? "Since lighting items are included, you may subtly warm the overall lighting tone." : "Keep the existing lighting and color tone exactly as-is."}

The result should look like a real photo of the same room with just these small additions visible. Everything else stays identical.`;

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
