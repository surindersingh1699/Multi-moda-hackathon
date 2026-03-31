import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { buildPromptWithPreferences } from "@/lib/prompt";
import { RESPONSE_FORMAT } from "@/lib/schema";
import { validateResult } from "@/lib/validate";
import { MOCK_RESULT } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";

const MAX_USES = 5;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").filter(Boolean);

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

    const { image, userPrompt, budget } = await req.json();

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

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to analyze your room" },
        { status: 401 }
      );
    }

    // Usage limit check (admins bypass)
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) {
      const { count } = await supabase
        .from("usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count ?? 0) >= MAX_USES) {
        return NextResponse.json(
          {
            error:
              "You've reached the maximum of 5 free uses. Join our waiting list for more!",
          },
          { status: 429 }
        );
      }
    }

    const budgetNum =
      typeof budget === "number" && budget > 0 ? budget : 150;

    // Mock mode when no API key is set
    if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
      await new Promise((r) => setTimeout(r, 1500));
      return NextResponse.json(MOCK_RESULT);
    }

    const systemPrompt = buildPromptWithPreferences(userPrompt, budgetNum);

    // Primary: OpenAI GPT-4o — Fallback: Google Gemini
    let result: unknown;
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("No OpenAI key");
      const openai = new OpenAI();
      result = await callOpenAI(openai, image, systemPrompt);
    } catch (openaiError) {
      console.warn("OpenAI failed, falling back to Gemini:", openaiError);
      if (!process.env.GOOGLE_API_KEY) throw openaiError;
      result = await callGemini(image, systemPrompt);
    }

    const validation = validateResult(result, budgetNum);
    if (validation.ok) {
      await supabase.from("usage").insert({ user_id: user.id });
      return NextResponse.json(validation.data);
    }

    // Retry once — try OpenAI first, then Gemini fallback
    const retryHint = `Your previous response failed validation: ${validation.error}. Please fix and return valid JSON with exactly 4-6 items and total cost under $${budgetNum}.`;
    let retryResult: unknown;
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error("No OpenAI key");
      const openai = new OpenAI();
      retryResult = await callOpenAI(openai, image, systemPrompt, retryHint);
    } catch {
      if (!process.env.GOOGLE_API_KEY) throw new Error("Both providers failed");
      retryResult = await callGemini(image, systemPrompt + "\n\n" + retryHint);
    }

    const retryValidation = validateResult(retryResult, budgetNum);
    if (retryValidation.ok) {
      await supabase.from("usage").insert({ user_id: user.id });
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

/** Primary: OpenAI GPT-4o with structured output */
async function callOpenAI(
  openai: OpenAI,
  imageDataUrl: string,
  systemPrompt: string,
  retryHint?: string
): Promise<unknown> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
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

/** Fallback: Google Gemini with vision */
async function callGemini(
  imageDataUrl: string,
  systemPrompt: string
): Promise<unknown> {
  const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

  // Strip the data URL prefix to get raw base64 + mime type
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  const mimeType = match?.[1] ?? "image/jpeg";
  const base64Data = match?.[2] ?? imageDataUrl;

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt + "\n\nAnalyze this room image and return ONLY valid JSON matching the schema above." },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const content = response.text;
  if (!content) {
    throw new Error("Empty response from Gemini");
  }

  return JSON.parse(content);
}
