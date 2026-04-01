import sharp from "sharp";
import convert from "heic-convert";

const MAX_DIMENSION = 1536;

const HEIC_MIME_TYPES = ["image/heic", "image/heif"];

/** HEIC magic: bytes 4-11 contain "ftyp" followed by a HEIC brand */
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "mif1", "msf1"];

function isHeicBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const ftyp = buf.toString("ascii", 4, 8);
  if (ftyp !== "ftyp") return false;
  const brand = buf.toString("ascii", 8, 12);
  return HEIC_BRANDS.includes(brand);
}

/** Convert HEIC buffer to JPEG if needed (sharp lacks HEVC decoder). */
async function ensureDecodable(buf: Buffer, mimeType: string): Promise<Buffer> {
  if (HEIC_MIME_TYPES.includes(mimeType) || isHeicBuffer(buf)) {
    const jpegBuf = await convert({ buffer: new Uint8Array(buf) as unknown as ArrayBuffer, format: "JPEG", quality: 0.92 });
    return Buffer.from(jpegBuf);
  }
  return buf;
}

/**
 * Optimize image for GPT-4o vision analysis.
 * Resizes to 1536px longest side, converts to JPEG q85.
 * Returns a data URL string (data:image/jpeg;base64,...).
 */
export async function optimizeForVision(dataUrl: string): Promise<string> {
  const { buffer: rawBuffer, mimeType } = parseDataUrl(dataUrl);
  const buffer = await ensureDecodable(rawBuffer, mimeType);

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
  const { buffer: rawBuffer, mimeType } = parseDataUrl(dataUrl);
  const buffer = await ensureDecodable(rawBuffer, mimeType);

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
