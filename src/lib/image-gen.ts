import OpenAI from "openai";
import { GoogleGenAI, RawReferenceImage } from "@google/genai";
import Replicate from "replicate";

export interface ImageGenResult {
  imageDataUrl: string;
  provider: "imagen3" | "flux" | "gpt-image-1";
}

/**
 * Generate a styled room image using a 3-tier fallback chain:
 * Imagen 3 → Flux Kontext → gpt-image-1
 */
export async function generateStyledRoom(
  imageBuffer: Buffer,
  prompt: string,
  size: "1024x1024" | "1536x1024" | "1024x1536"
): Promise<ImageGenResult> {
  // Try Imagen 3 first (Google GenAI)
  if (process.env.GOOGLE_API_KEY) {
    try {
      const result = await generateWithImagen3(imageBuffer, prompt);
      if (result) return result;
    } catch (e) {
      console.warn("Imagen 3 failed, trying next provider:", e);
    }
  }

  // Try Flux Kontext (Replicate)
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const result = await generateWithFlux(imageBuffer, prompt);
      if (result) return result;
    } catch (e) {
      console.warn("Flux Kontext failed, trying next provider:", e);
    }
  }

  // Fall back to gpt-image-1 (OpenAI)
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "No image generation provider available. Set GOOGLE_API_KEY, REPLICATE_API_TOKEN, or OPENAI_API_KEY."
    );
  }
  return generateWithGptImage1(imageBuffer, prompt, size);
}

// ── Imagen 3 via Google GenAI SDK ─────────────────────────────────

async function generateWithImagen3(
  imageBuffer: Buffer,
  prompt: string
): Promise<ImageGenResult | null> {
  const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

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

// ── Flux Kontext via Replicate ────────────────────────────────────

async function generateWithFlux(
  imageBuffer: Buffer,
  prompt: string
): Promise<ImageGenResult | null> {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!,
  });

  const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
    input: {
      prompt,
      image: imageBuffer,
      aspect_ratio: "match_input",
    },
  });

  // Replicate returns FileOutput(s) — could be single or array
  const fileOutput = Array.isArray(output) ? output[0] : output;
  if (!fileOutput) return null;

  // FileOutput is a ReadableStream with a .url() method
  const url =
    typeof fileOutput === "string"
      ? fileOutput
      : typeof fileOutput === "object" && "url" in fileOutput
        ? (fileOutput as { url: () => string }).url()
        : null;

  if (!url) return null;

  // Fetch the generated image and convert to data URL
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());

  return {
    imageDataUrl: `data:image/png;base64,${buf.toString("base64")}`,
    provider: "flux",
  };
}

// ── gpt-image-1 via OpenAI ───────────────────────────────────────

async function generateWithGptImage1(
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
    model: "gpt-image-1",
    image: imageFile,
    prompt,
    size,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (b64) {
    return {
      imageDataUrl: `data:image/png;base64,${b64}`,
      provider: "gpt-image-1",
    };
  }

  const url = response.data?.[0]?.url;
  if (url) {
    return { imageDataUrl: url, provider: "gpt-image-1" };
  }

  throw new Error("No image data in gpt-image-1 response");
}
