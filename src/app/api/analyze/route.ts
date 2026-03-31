import { NextRequest } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import {
  buildVisionPrompt,
  buildRecommendationPrompt,
  buildPromptWithPreferences,
} from "@/lib/prompt";
import {
  VISION_RESPONSE_FORMAT,
  RECOMMENDATION_RESPONSE_FORMAT,
  RESPONSE_FORMAT,
  GEMINI_RESPONSE_JSON_SCHEMA,
} from "@/lib/schema";
import type { StylingResult } from "@/lib/schema";
import { validateResult, validateVisionAnalysis } from "@/lib/validate";
import { MOCK_RESULT } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";
import { optimizeForVision, imageHash } from "@/lib/image";

const MAX_USES = 5;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .filter(Boolean);
const MAX_PAYLOAD_BYTES = 6 * 1024 * 1024;

// ── Content cache ──────────────────────────────────────────────────

interface CacheEntry {
  result: StylingResult;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const CACHE_MAX_SIZE = 100;

function getCached(hash: string): StylingResult | null {
  const entry = cache.get(hash);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(hash);
    return null;
  }
  return entry.result;
}

function setCache(hash: string, result: StylingResult): void {
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(hash, { result, expiry: Date.now() + CACHE_TTL_MS });
}

// ── Main handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return jsonResponse(
        { error: "Payload too large. Image must be under 4MB." },
        413
      );
    }

    const { image, userPrompt, budget } = await req.json();

    if (!image || typeof image !== "string") {
      return jsonResponse({ error: "Missing or invalid image data" }, 400);
    }
    if (image.length > MAX_PAYLOAD_BYTES) {
      return jsonResponse(
        { error: "Image data too large. Please use a smaller image." },
        413
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse(
        { error: "Please sign in to analyze your room" },
        401
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
        return jsonResponse(
          {
            error:
              "You've reached the maximum of 5 free uses. Join our waiting list for more!",
          },
          429
        );
      }
    }

    const budgetNum =
      typeof budget === "number" && budget > 0 ? budget : 150;

    // Mock mode when no API key is set
    if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
      await new Promise((r) => setTimeout(r, 1500));
      return jsonResponse(MOCK_RESULT);
    }

    // Cache check — key includes prompt + budget so different vibes get fresh results
    const prompt = typeof userPrompt === "string" ? userPrompt.trim() : "";
    const hash = imageHash(image) + `:${prompt}:${budgetNum}`;
    const cached = getCached(hash);
    if (cached) {
      await supabase.from("usage").insert({ user_id: user.id });
      return jsonResponse(cached);
    }

    // Optimize image once (sharp resize to 1536px, JPEG q85)
    const optimizedImage = await optimizeForVision(image);

    // SSE stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            )
          );
        };

        try {
          let finalResult: StylingResult;

          if (process.env.OPENAI_API_KEY) {
            const openai = new OpenAI();

            // Step 1: Vision analysis (GPT-4o with image, detail: high)
            const visionPrompt = buildVisionPrompt(userPrompt);
            const visionResult = await callOpenAIVision(
              openai,
              optimizedImage,
              visionPrompt
            );
            const visionValidation = validateVisionAnalysis(visionResult);

            if (!visionValidation.ok) {
              throw new Error(
                `Vision analysis failed: ${visionValidation.error}`
              );
            }

            const analysis = visionValidation.data;

            // Send analysis event immediately
            send("analysis", {
              room_reading: analysis.room_reading,
              style_direction: analysis.style_direction,
            });

            // Step 2: Recommendations (GPT-4o-mini, text only — cheaper)
            const recPrompt = buildRecommendationPrompt(
              analysis,
              budgetNum,
              userPrompt
            );
            const recResult = (await callOpenAIRecommendations(
              openai,
              recPrompt
            )) as Record<string, unknown>;

            finalResult = {
              room_reading: analysis.room_reading,
              style_direction: analysis.style_direction,
              items: recResult.items as StylingResult["items"],
              quick_wins: recResult.quick_wins as string[],
              total_estimated_cost:
                recResult.total_estimated_cost as number,
            };
          } else {
            // Gemini-only path (single call with schema enforcement)
            const systemPrompt = buildPromptWithPreferences(
              userPrompt,
              budgetNum
            );
            finalResult = (await callGemini(
              optimizedImage,
              systemPrompt
            )) as StylingResult;
          }

          // Validate merged result
          let validated = validateResult(finalResult, budgetNum);

          if (!validated.ok) {
            // Retry once with the legacy single-call path
            console.warn(
              "Validation failed, retrying:",
              validated.error
            );
            const retryHint = `Previous response failed validation: ${validated.error}. Fix and return valid JSON with 4-6 items, total under $${budgetNum}. Ensure total_estimated_cost equals the sum of all item prices.`;

            if (process.env.OPENAI_API_KEY) {
              const openai = new OpenAI();
              const retryPrompt = buildPromptWithPreferences(
                userPrompt,
                budgetNum
              );
              const retryResult = await callOpenAISingle(
                openai,
                optimizedImage,
                retryPrompt,
                retryHint
              );
              validated = validateResult(retryResult, budgetNum);
            } else if (process.env.GOOGLE_API_KEY) {
              const retryPrompt =
                buildPromptWithPreferences(userPrompt, budgetNum) +
                "\n\n" +
                retryHint;
              const retryResult = await callGemini(
                optimizedImage,
                retryPrompt
              );
              validated = validateResult(retryResult, budgetNum);
            }

            if (!validated.ok) {
              throw new Error(
                `Validation failed after retry: ${validated.error}`
              );
            }
          }

          finalResult = validated.data;

          // Cache + record usage
          setCache(hash, finalResult);
          await supabase.from("usage").insert({ user_id: user.id });

          // Send recommendations event
          send("recommendations", {
            items: finalResult.items,
            quick_wins: finalResult.quick_wins,
            total_estimated_cost: finalResult.total_estimated_cost,
          });

          // Send complete event with full result
          send("complete", finalResult);
          controller.close();
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Failed to analyze image";
          console.error("Analyze stream error:", e);
          send("error", { error: message });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("Analyze error:", e);
    const message =
      e instanceof Error ? e.message : "Failed to analyze image";
    return jsonResponse({ error: message }, 500);
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Step 1: GPT-4o vision — image → analysis */
async function callOpenAIVision(
  openai: OpenAI,
  imageDataUrl: string,
  systemPrompt: string
): Promise<unknown> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 768,
    response_format: VISION_RESPONSE_FORMAT,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageDataUrl, detail: "high" },
          },
        ],
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from vision model");
  return JSON.parse(content);
}

/** Step 2: GPT-4o-mini text-only — analysis → recommendations */
async function callOpenAIRecommendations(
  openai: OpenAI,
  systemPrompt: string
): Promise<unknown> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    response_format: RECOMMENDATION_RESPONSE_FORMAT,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          "Based on the room analysis above, recommend items for this room.",
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content)
    throw new Error("Empty response from recommendation model");
  return JSON.parse(content);
}

/** Legacy single-call path — used for retry */
async function callOpenAISingle(
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
          image_url: { url: imageDataUrl, detail: "high" },
        },
      ],
    },
  ];
  if (retryHint) messages.push({ role: "user", content: retryHint });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    response_format: RESPONSE_FORMAT,
    messages,
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");
  return JSON.parse(content);
}

/** Gemini fallback — single call with structured JSON schema */
async function callGemini(
  imageDataUrl: string,
  systemPrompt: string
): Promise<unknown> {
  const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  const mimeType = match?.[1] ?? "image/jpeg";
  const base64Data = match?.[2] ?? imageDataUrl;

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              systemPrompt +
              "\n\nAnalyze this room image and return ONLY valid JSON matching the schema above.",
          },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: GEMINI_RESPONSE_JSON_SCHEMA,
    },
  });

  const content = response.text;
  if (!content) throw new Error("Empty response from Gemini");
  return JSON.parse(content);
}
