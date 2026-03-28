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

    const { imageBase64, styleDirection, items } = (await req.json()) as {
      imageBase64: string;
      styleDirection: string;
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

    // Try gpt-image-1 edit (can take input image) first
    try {
      const styledImageUrl = await generateWithImageEdit(openai, imageBase64, editPrompt);
      return NextResponse.json({ styledImageUrl });
    } catch (editError) {
      console.warn("gpt-image-1 edit failed, trying dall-e-3 fallback:", editError);
    }

    // Fallback: dall-e-3 text-only generation
    try {
      const styledImageUrl = await generateWithDallE3(openai, editPrompt, styleDirection);
      return NextResponse.json({ styledImageUrl });
    } catch (dalleError) {
      console.error("dall-e-3 fallback also failed:", dalleError);
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error("Generate styled room error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate styled room" },
      { status: 500 }
    );
  }
}

async function generateWithImageEdit(
  openai: OpenAI,
  imageBase64: string,
  prompt: string
): Promise<string> {
  // Strip the data URL prefix to get raw base64
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  // Convert to a File-like object for the API
  const imageFile = new File([imageBuffer], "room.png", { type: "image/png" });

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt,
    size: "1024x1024",
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

async function generateWithDallE3(
  openai: OpenAI,
  editPrompt: string,
  styleDirection: string
): Promise<string> {
  // dall-e-3 can't take an input image, so we describe the room
  const textPrompt = `Professional interior design "after" photo of a cozy bedroom makeover. ${editPrompt}. Style: ${styleDirection}. Photorealistic, warm natural lighting, shot on a high-end camera, interior design magazine quality.`;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: textPrompt.slice(0, 4000), // dall-e-3 prompt limit
    n: 1,
    size: "1792x1024",
    quality: "standard",
    response_format: "b64_json",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image data in dall-e-3 response");
  }

  return `data:image/png;base64,${b64}`;
}
