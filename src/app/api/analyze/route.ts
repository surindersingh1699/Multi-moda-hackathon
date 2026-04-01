import { NextRequest } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { buildCreativePrompt, buildShoppingPrompt } from "@/lib/prompt";
import {
  CREATIVE_RESPONSE_FORMAT,
  RESPONSE_FORMAT,
  GEMINI_CREATIVE_JSON_SCHEMA,
  GEMINI_RESPONSE_JSON_SCHEMA,
} from "@/lib/schema";
import type { CreativeResult, StylingResult } from "@/lib/schema";
import { validateResult } from "@/lib/validate";
import { MOCK_RESULT } from "@/lib/mock";
import { createClient } from "@/lib/supabase/server";
import { optimizeForVision } from "@/lib/image";
import { getLocaleConfig } from "@/lib/locale-config";
import { rateLimit } from "@/lib/rate-limit";

const MAX_USES = 5;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .filter(Boolean);
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;

// ── Main handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const rl = rateLimit(req, { maxRequests: 10, windowMs: 60_000 });
    if (rl) return rl;

    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return jsonResponse(
        { error: "Payload too large. Image must be under 4MB." },
        413
      );
    }

    const { image, userPrompt, budget, roomContext, countryCode } = await req.json();

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
    const locale = getLocaleConfig(countryCode ?? "US");

    // Mock mode when no API key is set
    if (!process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY) {
      await new Promise((r) => setTimeout(r, 1500));
      return jsonResponse(MOCK_RESULT);
    }

    // Optimize image once (sharp resize to 1536px, JPEG q85)
    const optimizedImage = await optimizeForVision(image);

    // Build creative prompt (Step A)
    const creativePrompt = buildCreativePrompt(userPrompt, budgetNum, roomContext, locale.currencySymbol);

    // SSE stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const send = (event: string, data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
              )
            );
          } catch {
            closed = true;
          }
        };

        try {
          let finalResult: StylingResult;
          const storeList = locale.storeList;
          const currSym = locale.currencySymbol;

          if (process.env.OPENAI_API_KEY) {
            const openai = new OpenAI();
            // Step A: Creative ideation (vision)
            const creative = await callOpenAICreative(openai, optimizedImage, creativePrompt);
            send("step", { step: 1 });

            // Step B: Shopping conversion (text)
            const shoppingPrompt = buildShoppingPrompt(creative, budgetNum, currSym, storeList);
            send("step", { step: 2 });
            finalResult = await callOpenAIShopping(openai, shoppingPrompt) as StylingResult;
            send("step", { step: 3 });
          } else {
            // Gemini path
            const creative = await callGeminiCreative(optimizedImage, creativePrompt);
            send("step", { step: 1 });

            const shoppingPrompt = buildShoppingPrompt(creative, budgetNum, currSym, storeList);
            send("step", { step: 2 });
            finalResult = await callGeminiText(shoppingPrompt) as StylingResult;
            send("step", { step: 3 });
          }

          // Validate result
          let validated = validateResult(finalResult, budgetNum);

          if (!validated.ok) {
            // Retry Step B only (creative ideation was fine)
            console.warn("Validation failed, retrying Step B:", validated.error);
            const retryHint = `Previous response failed validation: ${validated.error}. Fix and return valid JSON with the correct number of items, total under ${locale.currencySymbol}${budgetNum}. Ensure total_estimated_cost equals the sum of all item prices.`;

            // finalResult is a StylingResult (has `items`), convert to CreativeResult shape (needs `ideas`)
            const retryCreative: CreativeResult = {
              room_reading: (finalResult as StylingResult).room_reading ?? "",
              style_direction: (finalResult as StylingResult).style_direction ?? "",
              ideas: ((finalResult as StylingResult).items ?? []).map((it) => ({
                name: it.name,
                category: it.category,
                reason: it.reason,
              })),
              quick_wins: (finalResult as StylingResult).quick_wins ?? [],
            };

            if (process.env.OPENAI_API_KEY) {
              const shoppingPrompt = buildShoppingPrompt(
                retryCreative,
                budgetNum,
                locale.currencySymbol,
                locale.storeList
              );
              const retryResult = await callOpenAIShopping(
                new OpenAI(),
                shoppingPrompt + "\n\n" + retryHint
              );
              validated = validateResult(retryResult, budgetNum);
            } else if (process.env.GOOGLE_API_KEY) {
              const shoppingPrompt = buildShoppingPrompt(
                retryCreative,
                budgetNum,
                locale.currencySymbol,
                locale.storeList
              );
              const retryResult = await callGeminiText(
                shoppingPrompt + "\n\n" + retryHint
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

          // Record usage
          await supabase.from("usage").insert({ user_id: user.id });

          // Final step + complete
          send("step", { step: 4 });
          send("complete", finalResult);
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Failed to analyze image";
          console.error("Analyze stream error:", e);
          send("error", { error: message });
        } finally {
          if (!closed) {
            try { controller.close(); } catch { /* already closed */ }
          }
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

// ── OpenAI helpers ───────────────────────────────────────────────

/** Step A — Creative ideation: image + high temperature */
async function callOpenAICreative(
  openai: OpenAI,
  imageDataUrl: string,
  creativePrompt: string
): Promise<CreativeResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    max_tokens: 1024,
    temperature: 1.1,
    top_p: 1,
    response_format: CREATIVE_RESPONSE_FORMAT,
    messages: [
      { role: "system", content: creativePrompt },
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
  if (!content) throw new Error("Empty response from creative step");
  return JSON.parse(content) as CreativeResult;
}

/** Step B — Shopping conversion: text only, low temperature */
async function callOpenAIShopping(
  openai: OpenAI,
  shoppingPrompt: string
): Promise<unknown> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    max_tokens: 1024,
    temperature: 0.2,
    response_format: RESPONSE_FORMAT,
    messages: [{ role: "system", content: shoppingPrompt }],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from shopping step");
  return JSON.parse(content);
}

// ── Gemini helpers ───────────────────────────────────────────────

/** Step A — Gemini creative ideation with image */
async function callGeminiCreative(
  imageDataUrl: string,
  creativePrompt: string
): Promise<CreativeResult> {
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
              creativePrompt +
              "\n\nAnalyze this room image and return ONLY valid JSON.",
          },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    config: {
      temperature: 1.1,
      topP: 1,
      responseMimeType: "application/json",
      responseJsonSchema: GEMINI_CREATIVE_JSON_SCHEMA,
    },
  });

  const content = response.text;
  if (!content) throw new Error("Empty response from Gemini creative step");
  return JSON.parse(content) as CreativeResult;
}

/** Step B — Gemini shopping conversion (text only) */
async function callGeminiText(shoppingPrompt: string): Promise<unknown> {
  const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash-preview-05-20",
    contents: [
      {
        role: "user",
        parts: [{ text: shoppingPrompt }],
      },
    ],
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: GEMINI_RESPONSE_JSON_SCHEMA,
    },
  });

  const content = response.text;
  if (!content) throw new Error("Empty response from Gemini shopping step");
  return JSON.parse(content);
}
