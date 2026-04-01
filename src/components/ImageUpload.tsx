"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Image from "next/image";
// Canvas-based conversion: works natively in Safari/iOS which support HEIC
const convertViaCanvas = (blob: Blob): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        0.9
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Browser cannot decode this image"));
    };
    img.src = url;
  });

// Dynamically imported polyfill for browsers without native HEIC support
const convertViaHeic2any = async (blob: Blob) => {
  const heic2any = (await import("heic2any")).default;
  return heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
};

// Server-side conversion via sharp (most reliable)
const convertViaServer = async (blob: Blob): Promise<Blob> => {
  const res = await fetch("/api/convert-heic", { method: "POST", body: blob });
  if (!res.ok) throw new Error("Server conversion failed");
  return res.blob();
};

// Try native canvas first (Safari/iOS), then heic2any (Chrome), then server
const convertHeic = async (blob: Blob): Promise<Blob> => {
  try {
    return await convertViaCanvas(blob);
  } catch {
    try {
      const result = await convertViaHeic2any(blob);
      return Array.isArray(result) ? result[0] : result;
    } catch {
      return convertViaServer(blob);
    }
  }
};
import { DoodleCamera, DoodleStar } from "@/components/DoodleElements";

const MAX_SIZE_MB = 20; // accept up to 20MB uploads; we compress client-side
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const TARGET_SIZE_BYTES = 1 * 1024 * 1024; // 1MB target — server resizes to 1536px anyway
const MAX_DIMENSION = 1536; // match server-side optimizeForVision limit
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HEIC_TYPES = ["image/heic", "image/heif"];

/**
 * Compress an image file client-side using canvas.
 * Resizes to MAX_DIMENSION and adjusts JPEG quality to stay under TARGET_SIZE_BYTES.
 */
const compressImage = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      let { naturalWidth: w, naturalHeight: h } = img;

      // Skip only if dimensions AND file size are already within limits
      if (w <= MAX_DIMENSION && h <= MAX_DIMENSION && file.size <= TARGET_SIZE_BYTES) {
        resolve(file);
        return;
      }

      // Calculate resize dimensions
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));
      ctx.drawImage(img, 0, 0, w, h);

      // Try decreasing quality until under target size
      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compression failed"));
            if (blob.size > TARGET_SIZE_BYTES && quality > 0.4) {
              tryQuality(quality - 0.1);
            } else {
              const name = file.name.replace(/\.\w+$/, ".jpg");
              resolve(new File([blob], name, { type: "image/jpeg" }));
            }
          },
          "image/jpeg",
          quality
        );
      };
      tryQuality(0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };
    img.src = url;
  });

interface Props {
  onImageSelected: (file: File, previewUrl: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onImageSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [converting, setConverting] = useState(false);

  const isHeic = (file: File): boolean => {
    if (HEIC_TYPES.includes(file.type)) return true;
    // Some browsers report empty type for HEIC — check extension
    const ext = file.name.toLowerCase().split(".").pop();
    return ext === "heic" || ext === "heif";
  };

  const processFile = useCallback(
    (file: File) => {
      if (file.size > MAX_SIZE_BYTES) {
        setError(`Image must be under ${MAX_SIZE_MB}MB.`);
        return;
      }

      // Revoke previous blob URL to prevent memory leak
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });

      const url = URL.createObjectURL(file);
      setPreview(url);
      onImageSelected(file, url);
    },
    [onImageSelected]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (isHeic(file)) {
        setConverting(true);
        try {
          const jpegBlob = await convertHeic(file);
          const converted = new File([jpegBlob], file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
          const compressed = await compressImage(converted);
          processFile(compressed);
        } catch {
          // Client-side conversion failed — pass HEIC through as-is.
          // Server will convert it with sharp before sending to vision API.
          processFile(file);
        } finally {
          setConverting(false);
        }
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload a JPG, PNG, WebP, or HEIC image.");
        return;
      }

      // Compress large images client-side before uploading
      setConverting(true);
      try {
        const compressed = await compressImage(file);
        processFile(compressed);
      } catch {
        processFile(file);
      } finally {
        setConverting(false);
      }
    },
    [processFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full">
      <div
        onClick={() => !disabled && !isMobile && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`
          relative flex flex-col items-center justify-center
          rounded-2xl border-2 border-dashed p-10
          transition-all duration-300 cursor-pointer
          bg-white/60 backdrop-blur-sm
          ${dragOver
            ? "border-accent-400 bg-accent-50 scale-[1.02]"
            : "border-accent-200 hover:border-accent-300 hover:bg-accent-50/50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        style={dragOver ? { boxShadow: '0 0 20px rgba(232, 117, 58, 0.3)' } : {}}
      >
        {converting ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="w-6 h-6 border-2 border-accent-300 border-t-accent-500 rounded-full animate-spin" />
            <p className="text-sm text-txt-secondary">Optimizing image...</p>
          </div>
        ) : preview ? (
          <div className="relative group w-full">
            <Image
              src={preview}
              alt="Bedroom preview"
              width={400}
              height={300}
              className="rounded-xl object-cover max-h-64 w-full"
              style={{ boxShadow: '0 4px 12px rgba(44, 24, 16, 0.08)' }}
            />
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Change photo label */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {isMobile ? (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-txt-primary shadow-sm active:scale-95 transition-transform"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-txt-primary shadow-sm active:scale-95 transition-transform"
                  >
                    Gallery
                  </button>
                </div>
              ) : (
                <span className="rounded-lg bg-white/90 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-txt-primary shadow-sm">
                  Tap to swap photo
                </span>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Doodle camera icon */}
            <div className="mb-3 animate-float relative">
              <DoodleCamera className="w-14 h-14" />
              <DoodleStar className="w-4 h-4 absolute -top-1 -right-2 animate-twinkle" />
            </div>
            {isMobile ? (
              <>
                <div className="flex gap-3 mt-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    disabled={disabled}
                    className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm active:scale-95 transition-transform"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                    </svg>
                    Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled}
                    className="flex items-center gap-1.5 rounded-lg border-2 border-accent-300 bg-white px-4 py-2 text-sm font-semibold text-accent-600 shadow-sm active:scale-95 transition-transform"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                    Gallery
                  </button>
                </div>
                <p className="text-xs text-txt-muted mt-3">
                  JPG, PNG, WebP, or HEIC up to 20MB
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-txt-secondary">
                  Drop your bedroom photo here or{" "}
                  <span className="text-accent-500 font-semibold underline decoration-accent-200 underline-offset-2 decoration-2">
                    choose a file
                  </span>
                </p>
                <p className="text-xs text-txt-muted mt-2">
                  JPG, PNG, WebP, or HEIC up to 20MB
                </p>
              </>
            )}
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
          disabled={disabled}
        />
        {/* Separate camera input for Android — capture forces camera-only */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-err-500 flex items-center gap-1.5">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
