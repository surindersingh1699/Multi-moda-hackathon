import OpenAI from "openai";
import { GoogleGenAI, Modality, RawReferenceImage } from "@google/genai";

export interface ImageGenResult {
  imageDataUrl: string;
  provider: "gemini-flash-image" | "imagen3" | "gpt-image-1.5";
}

/**
 * Generate a styled room image using a fallback chain:
 * gpt-image-1.5 (OpenAI) → Imagen 3 (Vertex AI)
 */
export async function generateStyledRoom(
  imageBuffer: Buffer,
  prompt: string,
  size: "1024x1024" | "1536x1024" | "1024x1536"
): Promise<ImageGenResult> {
  // Try gpt-image-1.5 first (OpenAI)
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithGptImage15(imageBuffer, prompt, size);
    } catch (e) {
      console.warn("gpt-image-1.5 failed, trying next provider:", e);
    }
  }

  // Fall back to Imagen 3 (Vertex AI)
  if (process.env.VERTEX_AI_KEY) {
    const result = await generateWithImagen3(imageBuffer, prompt);
    if (result) return result;
  }

  throw new Error(
    "No image generation provider available. Set OPENAI_API_KEY or VERTEX_AI_KEY."
  );
}

/**
 * Generate a styled room image using a specific provider (for retry).
 */
export async function generateStyledRoomWithProvider(
  imageBuffer: Buffer,
  prompt: string,
  _size: "1024x1024" | "1536x1024" | "1024x1536",
  provider: "gemini"
): Promise<ImageGenResult> {
  if (provider === "gemini") {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is required for Gemini image editing.");
    }
    return await generateWithGeminiFlashImage(imageBuffer, prompt);
  }
  throw new Error(`Unknown provider: ${provider}`);
}

// ── Gemini 2.5 Flash Image via Google GenAI SDK ─────────────────

async function generateWithGeminiFlashImage(
  imageBuffer: Buffer,
  prompt: string
): Promise<ImageGenResult> {
  const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
  const base64Data = imageBuffer.toString("base64");

  const chat = genai.chats.create({
    model: "gemini-2.5-flash-preview-image",
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  const response = await chat.sendMessage({
    message: [
      { inlineData: { mimeType: "image/png", data: base64Data } },
      { text: prompt },
    ],
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("No parts in Gemini Flash Image response");
  }

  for (const part of parts) {
    if (part.inlineData?.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      return {
        imageDataUrl: `data:${mimeType};base64,${part.inlineData.data}`,
        provider: "gemini-flash-image",
      };
    }
  }

  throw new Error("No image data in Gemini Flash Image response");
}

// ── Imagen 3 via Google GenAI SDK ─────────────────────────────────

async function generateWithImagen3(
  imageBuffer: Buffer,
  prompt: string
): Promise<ImageGenResult | null> {
  const genai = new GoogleGenAI({ vertexai: true, apiKey: process.env.VERTEX_AI_KEY! });

  const base64Data = imageBuffer.toString("base64");

  const rawRef = new RawReferenceImage();
  rawRef.referenceImage = { imageBytes: base64Data };
  rawRef.referenceId = 0;

  const response = await genai.models.editImage({
    model: "imagen-3.0-capability-001",
    prompt: `Using reference image 0 as the base room photo: ${prompt}`,
    referenceImages: [rawRef],
    config: {
      numberOfImages: 1,
    },
  });

  const imageBytes =
    response?.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) return null;

  return {
    imageDataUrl: `data:image/png;base64,${imageBytes}`,
    provider: "imagen3",
  };
}

// ── gpt-image-1.5 via OpenAI ──────────────────────────────────────

async function generateWithGptImage15(
  imageBuffer: Buffer,
  prompt: string,
  size: "1024x1024" | "1536x1024" | "1024x1536"
): Promise<ImageGenResult> {
  const openai = new OpenAI();
  const arrayBuffer = imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  ) as ArrayBuffer;
  const imageFile = new File([arrayBuffer], "room.png", { type: "image/png" });

  const response = await openai.images.edit({
    model: "gpt-image-1.5",
    image: imageFile,
    prompt,
    size,
    quality: "low",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (b64) {
    return {
      imageDataUrl: `data:image/png;base64,${b64}`,
      provider: "gpt-image-1.5",
    };
  }

  const url = response.data?.[0]?.url;
  if (url) {
    return { imageDataUrl: url, provider: "gpt-image-1.5" };
  }

  throw new Error("No image data in gpt-image-1.5 response");
}
