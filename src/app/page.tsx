"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ImageUpload from "@/components/ImageUpload";
import RoomTypeSelector from "@/components/RoomTypeSelector";
import ResultsDisplay from "@/components/ResultsDisplay";
import RoomDecorator from "@/components/decorator/RoomDecorator";
import { DoodleBear, DoodleBearThinking, DoodleBearHappy, DoodleStar, FloatingDoodles } from "@/components/DoodleElements";
import { parseResultSafe } from "@/lib/validate";
import type { StylingResult, StylingItem } from "@/lib/schema";

type AppState = "idle" | "loading" | "error" | "results";

export default function Home() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [roomType, setRoomType] = useState("");
  const [result, setResult] = useState<StylingResult | null>(null);
  const [activeItems, setActiveItems] = useState<StylingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onImageSelected = useCallback((f: File, url: string) => {
    setFile(f);
    setPreviewUrl(url);
    setResult(null);
    setActiveItems([]);
    setError(null);
    setAppState("idle");
  }, []);

  const canAnalyze = file && roomType.trim().length > 0;

  const analyze = async () => {
    if (!canAnalyze) return;
    setAppState("loading");
    setError(null);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, roomType: roomType.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const raw = await res.json();
      const parsed = parseResultSafe(raw);
      if (!parsed.ok) {
        throw new Error(`Invalid response: ${parsed.error}`);
      }

      setResult(parsed.data);
      setActiveItems(parsed.data.items);
      setAppState("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setAppState("error");
    }
  };

  const removeItem = useCallback((itemName: string) => {
    setActiveItems((prev) => prev.filter((i) => i.name !== itemName));
  }, []);

  useEffect(() => {
    if (appState === "results" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [appState]);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setRoomType("");
    setResult(null);
    setActiveItems([]);
    setError(null);
    setAppState("idle");
  };

  return (
    <div className="min-h-screen relative">
      <FloatingDoodles />

      <header className="sticky top-0 z-50 border-b border-accent-100 bg-bg-card/80 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3.5 flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
            style={{ background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' }}
          >
            <svg className="w-5 h-5 text-txt-on-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-txt-primary tracking-tight">
              Budget Room Stylist
            </h1>
            <p className="text-xs text-txt-muted">
              AI-powered styling for any room
            </p>
          </div>
        </div>
      </header>

      <main className={`relative z-10 mx-auto px-4 py-8 sm:py-12 space-y-8 ${appState === "results" ? "max-w-5xl" : "max-w-2xl"}`}>
        {appState !== "results" && (
          <div className="animate-fadeIn">
            {!file && appState !== "loading" && (
              <div className="text-center py-4 space-y-4">
                <div className="flex items-end justify-center gap-3 mb-2">
                  <DoodleStar className="w-6 h-6 animate-twinkle self-start mt-2" />
                  <DoodleBear className="w-28 h-28 sm:w-32 sm:h-32 animate-wiggle" />
                  <DoodleStar className="w-5 h-5 animate-twinkle self-start mt-4" />
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-txt-primary tracking-tight leading-tight">
                  Your dream space,<br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(to right, #E8753A, #D4877A)' }}
                  >
                    on a real budget
                  </span>
                </h2>
                <p className="text-txt-secondary text-base max-w-md mx-auto leading-relaxed">
                  Snap a photo of any room and get curated, affordable styling ideas powered by AI.
                </p>
                <p className="text-accent-400 text-sm font-medium">
                  Pick your room type and let&apos;s go!
                </p>
              </div>
            )}

            <div className="space-y-5">
              <ImageUpload
                onImageSelected={onImageSelected}
                disabled={appState === "loading"}
              />

              {file && appState !== "loading" && (
                <div className="animate-fadeIn rounded-2xl border border-accent-100 bg-white/60 backdrop-blur-sm p-4 sm:p-5">
                  <RoomTypeSelector
                    value={roomType}
                    onChange={setRoomType}
                    disabled={appState === "loading"}
                  />
                </div>
              )}

              {file && appState !== "loading" && (
                <button
                  onClick={analyze}
                  disabled={!canAnalyze}
                  className="group w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-txt-on-accent transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)',
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (canAnalyze) e.currentTarget.style.boxShadow = '0 0 20px rgba(232, 117, 58, 0.4)';
                  }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
                    </svg>
                    {canAnalyze
                      ? `Style My ${roomType.trim()}`
                      : "Select a room type to continue"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {appState === "loading" && (
          <div className="flex flex-col items-center gap-4 py-10 animate-fadeIn">
            <DoodleBearThinking className="w-32 h-32 animate-float" />
            <div>
              <p className="text-sm font-medium text-txt-secondary text-center">
                Hmm, let me think
                <span className="inline-flex ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 mx-0.5" style={{ animation: 'dotPulse 1.4s ease-in-out infinite', animationDelay: '0s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 mx-0.5" style={{ animation: 'dotPulse 1.4s ease-in-out infinite', animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 mx-0.5" style={{ animation: 'dotPulse 1.4s ease-in-out infinite', animationDelay: '0.4s' }} />
                </span>
              </p>
              <p className="text-xs text-txt-muted text-center mt-1">
                Finding the best suggestions for your {roomType || "room"}
              </p>
            </div>
            <div className="w-48 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="h-full w-full animate-shimmer rounded-full" />
            </div>
          </div>
        )}

        {appState === "error" && (
          <div className="animate-scaleBounce rounded-2xl border border-err-100 bg-err-50 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-err-100">
              <svg className="w-6 h-6 text-err-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21.73 18l-8-14a2 2 0 00-3.46 0l-8 14A2 2 0 004.27 21h15.46a2 2 0 001.73-3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-err-700">{error}</p>
            <button
              onClick={analyze}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-err-100 px-4 py-2 text-sm font-medium text-err-700 transition-colors hover:bg-err-500 hover:text-white"
            >
              Try again
            </button>
          </div>
        )}

        {appState === "results" && result && (
          <div ref={resultsRef} className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-center gap-3">
              <DoodleBearHappy className="w-12 h-12" />
              <p className="text-sm font-medium text-accent-500">
                Here&apos;s what I found for your {roomType || "room"}!
              </p>
              <DoodleStar className="w-5 h-5 animate-twinkle" />
            </div>

            {previewUrl && (
              <RoomDecorator previewUrl={previewUrl} items={activeItems} />
            )}
            <ResultsDisplay
              result={result}
              activeItems={activeItems}
              onRemoveItem={removeItem}
            />
            <button
              onClick={reset}
              className="w-full rounded-xl border-2 border-dashed border-accent-200 px-4 py-3.5 text-sm font-medium text-accent-500 transition-all duration-300 hover:border-accent-400 hover:bg-accent-50 hover:shadow-sm"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Analyze Another Room
              </span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
