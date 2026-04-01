import sharp from "sharp";
import { createHash } from "crypto";

const MAX_DIMENSION = 1536;

/**
 * Optimize image for GPT-4o vision analysis.
 * Resizes to 1536px longest side, converts to JPEG q85.
 * Returns a data URL string (data:image/jpeg;base64,...).
 */
export async function optimizeForVision(dataUrl: string): Promise<string> {
  const { buffer } = parseDataUrl(dataUrl);

  const optimized = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  return `data:image/jpeg;base64,${optimized.toString("base64")}`;
}

/**
 * Optimize image for image editing APIs (Imagen 3, Flux, gpt-image-1).
 * Resizes to 1536px longest side, converts to PNG (lossless for edit quality).
 * Returns raw Buffer + mime type for File construction.
 */
export async function optimizeForEdit(
  dataUrl: string
): Promise<{ buffer: Buffer; mimeType: string; originalWidth: number; originalHeight: number }> {
  const { buffer } = parseDataUrl(dataUrl);

  const meta = await sharp(buffer).metadata();
  const originalWidth = meta.width ?? 1024;
  const originalHeight = meta.height ?? 1024;

  const optimized = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  return { buffer: optimized, mimeType: "image/png", originalWidth, originalHeight };
}

/**
 * Compute SHA-256 hash of first 8KB of the image buffer (fast fingerprint).
 */
export function imageHash(dataUrl: string): string {
  const { buffer } = parseDataUrl(dataUrl);
  const slice = buffer.subarray(0, 8192);
  return createHash("sha256").update(slice).digest("hex");
}

/**
 * Strip data URL prefix, return raw buffer + mime type.
 */
export function parseDataUrl(dataUrl: string): {
  buffer: Buffer;
  mimeType: string;
} {
  const match = dataUrl.match(/^data:(image\/[\w+]+);base64,(.+)$/);
  if (!match) {
    return { buffer: Buffer.from(dataUrl, "base64"), mimeType: "image/jpeg" };
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}
