import { NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * GET /api/test-image-api
 *
 * Pre-demo check: tests if gpt-image-1 and dall-e-3 are available on this account.
 * Run before a live presentation: curl http://localhost:3000/api/test-image-api
 */
export async function GET() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      error: "No OPENAI_API_KEY set",
      gptImage1: false,
      dallE3: false,
    });
  }

  const openai = new OpenAI();
  const results: { gptImage1: boolean; dallE3: boolean; errors: string[] } = {
    gptImage1: false,
    dallE3: false,
    errors: [],
  };

  // Test gpt-image-1
  try {
    await openai.images.generate({
      model: "gpt-image-1",
      prompt: "A single red dot on a white background",
      size: "1024x1024",
      n: 1,
    });
    results.gptImage1 = true;
  } catch (e) {
    results.errors.push(
      `gpt-image-1: ${e instanceof Error ? e.message : "unavailable"}`
    );
  }

  // Test dall-e-3
  try {
    await openai.images.generate({
      model: "dall-e-3",
      prompt: "A single red dot on a white background",
      size: "1024x1024",
      n: 1,
      quality: "standard",
    });
    results.dallE3 = true;
  } catch (e) {
    results.errors.push(
      `dall-e-3: ${e instanceof Error ? e.message : "unavailable"}`
    );
  }

  return NextResponse.json(results);
}
