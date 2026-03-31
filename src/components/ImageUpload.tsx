"use client";

import { useRef, useCallback, useState } from "react";
import Image from "next/image";
// Dynamically imported to avoid SSR "window is not defined" error
const convertHeic = async (blob: Blob) => {
  const heic2any = (await import("heic2any")).default;
  return heic2any({ blob, toType: "image/jpeg", quality: 0.9 });
};
import { DoodleCamera, DoodleStar } from "@/components/DoodleElements";

const MAX_SIZE_MB = 4;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HEIC_TYPES = ["image/heic", "image/heif"];

interface Props {
  onImageSelected: (file: File, previewUrl: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onImageSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
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
          const blob = await convertHeic(file);
          const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
          const converted = new File([jpegBlob], file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"), { type: "image/jpeg" });
          processFile(converted);
        } catch {
          setError("Could not convert HEIC image. Try converting to JPG first.");
        } finally {
          setConverting(false);
        }
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload a JPG, PNG, WebP, or HEIC image.");
        return;
      }

      processFile(file);
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
        onClick={() => !disabled && inputRef.current?.click()}
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
            <p className="text-sm text-txt-secondary">Converting HEIC image...</p>
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
              <span className="rounded-lg bg-white/90 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-txt-primary shadow-sm">
                Tap to swap photo
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Doodle camera icon */}
            <div className="mb-3 animate-float relative">
              <DoodleCamera className="w-14 h-14" />
              <DoodleStar className="w-4 h-4 absolute -top-1 -right-2 animate-twinkle" />
            </div>
            <p className="text-sm font-medium text-txt-secondary">
              Drop your bedroom photo here or{" "}
              <span className="text-accent-500 font-semibold underline decoration-accent-200 underline-offset-2 decoration-2">
                choose a file
              </span>
            </p>
            <p className="text-xs text-txt-muted mt-2">
              JPG, PNG, WebP, or HEIC up to {MAX_SIZE_MB}MB
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
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
