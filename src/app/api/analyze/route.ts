import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { RESPONSE_FORMAT } from "@/lib/schema";
import { validateResult } from "@/lib/validate";
import { MOCK_RESULT } from "@/lib/mock";

const MAX_PAYLOAD_BYTES = 6 * 1024 * 1024; // 6MB (covers ~4MB image as base64)

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Payload too large. Image must be under 4MB." },
        { status: 413 }
      );
    }

    const { image } = await req.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid image data" },
        { status: 400 }
      );
    }

    if (image.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "Image data too large. Please use a smaller image." },
        { status: 413 }
      );
    }

    // Mock mode when no API key is set
    if (!process.env.OPENAI_API_KEY) {
      // Simulate a brief delay for realistic UX
      await new Promise((r) => setTimeout(r, 1500));
      return NextResponse.json(MOCK_RESULT);
    }

    const openai = new OpenAI();

    const result = await callModel(openai, image);

    const validation = validateResult(result);
    if (validation.ok) {
      return NextResponse.json(validation.data);
    }

    // Retry once with error feedback
    const retryResult = await callModel(
      openai,
      image,
      `Your previous response failed validation: ${validation.error}. Please fix and return valid JSON with exactly 4-6 items and total cost under $150.`
    );

    const retryValidation = validateResult(retryResult);
    if (retryValidation.ok) {
      return NextResponse.json(retryValidation.data);
    }

    return NextResponse.json(
      { error: `Model output failed validation after retry: ${retryValidation.error}` },
      { status: 500 }
    );
  } catch (e) {
    console.error("Analyze error:", e);
    const message =
      e instanceof Error ? e.message : "Failed to analyze image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function callModel(
  openai: OpenAI,
  imageDataUrl: string,
  retryHint?: string
): Promise<unknown> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: imageDataUrl, detail: "low" },
        },
      ],
    },
  ];

  if (retryHint) {
    messages.push({ role: "user", content: retryHint });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    response_format: RESPONSE_FORMAT,
    messages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from model");
  }

  return JSON.parse(content);
}
