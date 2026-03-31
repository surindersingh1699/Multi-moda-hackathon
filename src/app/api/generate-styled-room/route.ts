import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface ItemInput {
  name: string;
  category: string;
  reason: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "No API key configured" },
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

    const openai = new OpenAI();

    // Build item descriptions for the prompt
    const itemList = items
      .map((item, i) => `${i + 1}. ${item.name} (${item.category}) — ${item.reason}`)
      .join("\n");

    const editPrompt = `I need you to make small additions to this bedroom photo.

CRITICAL RULES — you MUST follow all of these:
- Do NOT change, replace, remove, or move ANY existing item in the room
- Do NOT add any beds, mattresses, desks, dressers, wardrobes, chairs, or large furniture
- Do NOT change wall colors, flooring, ceiling, windows, or doors
- Do NOT rearrange the room layout or change the camera perspective
- The room structure must remain IDENTICAL to the input photo

ONLY add these specific small items to the room (and absolutely nothing else):
${itemList}

Place each item where it would naturally go in the room (e.g., blanket on the bed, plant on a surface, lights along a wall).

${items.some((i) => i.category.toLowerCase().includes("light")) ? "You may subtly warm the overall lighting tone since lighting items are included above." : "Do NOT change the lighting or color tone of the photo."}

That is ALL. No other changes whatsoever. The output photo should look nearly identical to the input with just these small additions visible.`;

    const styledImageUrl = await generateWithImageEdit(openai, imageBase64, editPrompt);
    return NextResponse.json({ styledImageUrl });
  } catch (e) {
    console.error("Generate styled room error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate styled room" },
      { status: 500 }
    );
  }
}

function getImageDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG: IHDR chunk starts at byte 8, width at 16, height at 20
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset < buf.length - 9) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + buf.readUInt16BE(offset + 2);
    }
  }
  return null;
}

function pickSize(buf: Buffer): "1024x1024" | "1536x1024" | "1024x1536" {
  const dims = getImageDimensions(buf);
  if (!dims) return "1024x1024";
  const { width, height } = dims;
  if (width > height * 1.2) return "1536x1024"; // landscape
  if (height > width * 1.2) return "1024x1536"; // portrait
  return "1024x1024"; // square-ish
}

async function generateWithImageEdit(
  openai: OpenAI,
  imageBase64: string,
  prompt: string
): Promise<string> {
  // Strip the data URL prefix to get raw base64
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  const size = pickSize(imageBuffer);

  // Convert to a File-like object for the API
  const imageFile = new File([imageBuffer], "room.png", { type: "image/png" });

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt,
    size,
  });

  // gpt-image-1 returns b64_json by default
  const b64 = response.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }

  const url = response.data?.[0]?.url;
  if (url) {
    return url;
  }

  throw new Error("No image data in response");
}

