"use client";

import { useRef, useCallback, useState } from "react";
import Image from "next/image";
import { DoodleCamera, DoodleStar } from "@/components/DoodleElements";

const MAX_SIZE_MB = 4;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  onImageSelected: (file: File, previewUrl: string) => void;
  disabled?: boolean;
}

export default function ImageUpload({ onImageSelected, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload a JPG, PNG, or WebP image.");
        return;
      }

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
        {preview ? (
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
              JPG, PNG, or WebP up to {MAX_SIZE_MB}MB
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
