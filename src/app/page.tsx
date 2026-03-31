"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import ImageUpload from "@/components/ImageUpload";
import ResultsDisplay from "@/components/ResultsDisplay";
import AuthModal from "@/components/AuthModal";
import UsageBanner from "@/components/UsageBanner";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { DoodleBear, DoodleBearThinking, DoodleBearHappy, DoodleStar, DoodleCamera, DoodleLamp, DoodleHeart, DoodleFrame, FloatingDoodles } from "@/components/DoodleElements";
import { parseResultSafe } from "@/lib/validate";
import { trackUploadPhoto, trackGenerateRoom } from "@/lib/analytics";
import type { StylingResult, ProductMatch, ProductSearchResult } from "@/lib/schema";

const MAX_USES = 5;



type AppState = "idle" | "loading" | "error" | "results";

const BUDGET_OPTIONS = [50, 100, 150] as const;

const LOADING_STEPS = [
  { text: "Hmm, let me take a good look at your room...", Icon: DoodleCamera },
  { text: "Ooh, I see some styling potential here!", Icon: DoodleStar },
  { text: "Hunting for the perfect budget finds...", Icon: DoodleHeart },
  { text: "Cross-checking prices across stores...", Icon: DoodleLamp },
  { text: "Putting your makeover plan together!", Icon: DoodleFrame },
];

const VIBE_OPTIONS = [
  { label: "Cozy Hygge", prompt: "cozy hygge — warm textures, soft lighting, candles, knit blankets" },
  { label: "Minimalist", prompt: "minimalist — clean lines, neutral tones, less is more" },
  { label: "Boho Chic", prompt: "boho chic — eclectic patterns, macramé, earthy tones, layered textiles" },
  { label: "Dark Academia", prompt: "dark academia — moody tones, vintage books, warm wood, brass accents" },
  { label: "Cottagecore", prompt: "cottagecore — floral prints, natural materials, vintage charm, soft pastels" },
] as const;

export default function Home() {
  const { user, loading: authLoading, usageCount, refreshUsage } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const usageLimitReached = usageCount !== null && usageCount >= MAX_USES;

  const resultsRef = useRef<HTMLDivElement>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<StylingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [budget, setBudget] = useState<number>(150);
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Phase 2: styled room image state
  const [styledImageUrl, setStyledImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenFailed, setImageGenFailed] = useState(false);

  // AI Shopping Agent state
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [productSearchFailed, setProductSearchFailed] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const pendingResultRef = useRef<{ data: StylingResult; base64: string } | null>(null);

  const onImageSelected = useCallback((f: File, url: string) => {
    setFile(f);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
    setStyledImageUrl(null);
    setImageGenFailed(false);
    setProductMatches([]);
    setProductSearchFailed(false);
    setActiveVibe(null);
    setApiDone(false);
    pendingResultRef.current = null;
    setAppState("idle");
    trackUploadPhoto({
      file_type: f.type,
      file_size_kb: Math.round(f.size / 1024),
    });
  }, []);

  const analyze = async (promptOverride?: string) => {
    if (!file) return;
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (usageLimitReached) return;

    trackGenerateRoom({
      budget,
      vibe: activeVibe,
      has_custom_prompt: (promptOverride ?? userPrompt.trim()).length > 0,
    });

    setAppState("loading");
    setLoadingStep(0);
    setApiDone(false);
    pendingResultRef.current = null;
    setError(null);
    setStyledImageUrl(null);
    setImageGenFailed(false);

    const prompt = promptOverride ?? userPrompt.trim();

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          userPrompt: prompt || undefined,
          budget,
        }),
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

      // Buffer result — reveal after loading animation completes
      // Product search fires post-reveal in parallel with styled image
      pendingResultRef.current = { data: parsed.data, base64 };
      setApiDone(true);
      refreshUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setAppState("error");
    }
  };

  const findProducts = async (analysisResult: StylingResult) => {
    setProductMatches([]);
    setProductSearchFailed(false);
    try {
      const res = await fetch("/api/find-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: analysisResult.items }),
      });
      if (res.ok) {
        const data: ProductSearchResult = await res.json();
        if (data.matches?.length > 0) {
          setProductMatches(data.matches);
        } else {
          setProductSearchFailed(true);
        }
      } else {
        setProductSearchFailed(true);
      }
    } catch {
      setProductSearchFailed(true);
    }
  };

  const generateStyledRoom = async (imageBase64: string, analysisResult: StylingResult) => {
    setIsGeneratingImage(true);
    try {
      const res = await fetch("/api/generate-styled-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          styleDirection: analysisResult.style_direction,
          items: analysisResult.items.map((i) => ({
            name: i.name,
            category: i.category,
            reason: i.reason,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.styledImageUrl) {
          setStyledImageUrl(data.styledImageUrl);
        }
      }
    } catch {
      setImageGenFailed(true);
    } finally {
      setIsGeneratingImage(false);
    }
  };


  // Dynamic page title
  useEffect(() => {
    document.title = appState === "results"
      ? "My Room Makeover — Roomify"
      : "Roomify — AI Bedroom Stylist";
  }, [appState]);

  // Scroll to results when they appear
  useEffect(() => {
    if (appState === "results" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [appState]);

  // Celebration confetti + chime when styled room image is ready
  useEffect(() => {
    if (!styledImageUrl || appState !== "results") return;

    // Terracotta palette confetti burst from both sides
    const colors = ["#E8753A", "#D4622D", "#B84E20", "#F49556", "#D4877A", "#B05E50"];
    const end = Date.now() + 1500;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Celebration chime via Web Audio API (no file needed)
    try {
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord arpeggio
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.5);
      });
    } catch {
      // Audio not supported — silently skip
    }
  }, [styledImageUrl, appState]);

  // Rotate loading step messages — speeds up once API returns
  useEffect(() => {
    if (appState !== "loading") return;
    const speed = apiDone ? 600 : 2000;
    const interval = setInterval(() => {
      setLoadingStep((prev) =>
        prev < LOADING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, speed);
    return () => clearInterval(interval);
  }, [appState, apiDone]);

  // Reveal results once loading steps finish and API is done
  useEffect(() => {
    if (appState !== "loading" || !apiDone || loadingStep < LOADING_STEPS.length - 1) return;
    if (!pendingResultRef.current) return;

    const timer = setTimeout(() => {
      const pending = pendingResultRef.current;
      if (!pending) return;
      pendingResultRef.current = null;
      setResult(pending.data);
      setAppState("results");
      setApiDone(false);
      generateStyledRoom(pending.base64, pending.data);
      findProducts(pending.data);
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, apiDone, loadingStep]);

  const rerollWithVibe = (vibe: typeof VIBE_OPTIONS[number]) => {
    setActiveVibe(vibe.label);
    setUserPrompt(vibe.prompt);
    analyze(vibe.prompt);
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setStyledImageUrl(null);
    setImageGenFailed(false);
    setProductMatches([]);
    setProductSearchFailed(false);
    setUserPrompt("");
    setActiveVibe(null);
    setApiDone(false);
    pendingResultRef.current = null;
    setAppState("idle");
  };

  return (
    <div className="min-h-screen relative">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-accent-100/50 h-12 flex items-center px-4 sm:px-6" style={{ backgroundColor: 'rgba(253, 248, 244, 0.85)' }}>
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DoodleBear className="w-6 h-6" />
            <span
              className="text-base font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(to right, #E8753A, #D4877A, #B84E20)' }}
            >
              Roomify
            </span>
          </div>
          <div className="flex items-center gap-2">
            {user && usageCount !== null && (
              <span className="text-[10px] font-medium text-txt-muted">
                {usageCount}/{MAX_USES} uses
              </span>
            )}
            {authLoading ? null : user ? (
              <button
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                }}
                className="text-[10px] font-semibold uppercase tracking-wider text-txt-muted border border-accent-200 rounded-full px-2.5 py-0.5 bg-bg-card/50 hover:bg-accent-50 transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[10px] font-semibold uppercase tracking-wider text-txt-on-accent rounded-full px-2.5 py-0.5 transition-colors"
                style={{ background: 'linear-gradient(135deg, #E8753A, #D4622D)' }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className={`relative z-10 mx-auto px-4 py-8 sm:py-12 space-y-8 ${appState === "results" ? "max-w-5xl" : "max-w-2xl"}`}>
        {/* Upload / Idle State */}
        {appState !== "results" && (
          <div className="animate-fadeIn space-y-6">
            {/* Hero + landing content — only when no file selected */}
            {!file && appState !== "loading" && (
              <div className="text-center space-y-6 relative">
                {/* Floating background doodles */}
                <FloatingDoodles />

                {/* Hero Brand */}
                <div className="relative z-10 space-y-4">
                  <div className="flex items-end justify-center gap-3 mb-2">
                    <DoodleStar className="w-7 h-7 animate-twinkle self-start mt-2" />
                    <DoodleBear className="w-32 h-32 sm:w-40 sm:h-40 animate-wiggle" />
                    <DoodleHeart className="w-6 h-6 animate-heartBeat self-start mt-4" />
                  </div>

                  <h2 className="text-4xl sm:text-5xl font-bold text-txt-primary tracking-tight leading-tight">
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: 'linear-gradient(to right, #E8753A, #D4877A, #B84E20)' }}
                    >
                      Roomify
                    </span>
                  </h2>
                  <p className="text-base sm:text-lg font-medium text-txt-primary max-w-md mx-auto leading-relaxed">
                    Snap your bedroom. Get a designer<br />makeover plan in 30 seconds.
                  </p>
                  <p className="text-sm text-txt-secondary max-w-sm mx-auto">
                    Real products. Real prices. Real links.<br />All under your budget.
                  </p>
                </div>

                {/* How It Works */}
                <div className="relative z-10 max-w-xs mx-auto">
                  <p className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3">
                    How it works
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: <DoodleCamera className="w-6 h-6" />, label: "Snap your room", step: "1" },
                      { icon: <DoodleStar className="w-6 h-6" />, label: "AI designs it", step: "2" },
                      { icon: <DoodleHeart className="w-6 h-6" />, label: "Buy the look", step: "3" },
                    ].map(({ icon, label, step }) => (
                      <div key={step} className="flex flex-col items-center gap-1.5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 border border-accent-100">
                          {icon}
                        </div>
                        <span className="text-[11px] font-medium text-txt-secondary leading-tight">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Usage limit banner */}
            {usageLimitReached && <UsageBanner />}

            {/* Sign-in prompt for anonymous users */}
            {!user && !authLoading && !usageLimitReached && (
              <div
                className="rounded-2xl border border-accent-100 bg-bg-card p-4 text-center animate-fadeIn"
                style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
              >
                <p className="text-xs text-txt-secondary">
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="font-semibold text-accent-500 hover:underline"
                  >
                    Sign in
                  </button>{" "}
                  to get 5 free room makeovers
                </p>
              </div>
            )}

            {!usageLimitReached && (
              <ImageUpload
                onImageSelected={onImageSelected}
                disabled={appState === "loading"}
              />
            )}

            {/* Style preferences — shown after image selected */}
            {file && appState !== "loading" && !usageLimitReached && (
              <div className="mt-5 space-y-4">
                {/* Style prompt */}
                <div>
                  <label htmlFor="style-prompt" className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">
                    What vibe are you going for? (optional)
                  </label>
                  <input
                    id="style-prompt"
                    type="text"
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    placeholder='e.g., "warm and cozy" or "modern minimalist"'
                    className="w-full rounded-xl border border-accent-200 bg-bg-card px-4 py-3 text-sm text-txt-primary placeholder:text-txt-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-300 focus:border-transparent transition-all"
                  />
                </div>

                {/* Budget selector */}
                <div>
                  <label className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">
                    What&apos;s your budget?
                  </label>
                  <div className="flex gap-2">
                    {BUDGET_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setBudget(opt)}
                        className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                          budget === opt
                            ? "text-txt-on-accent shadow-sm"
                            : "bg-bg-card border border-accent-200 text-txt-secondary hover:border-accent-400"
                        }`}
                        style={budget === opt ? { background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' } : undefined}
                      >
                        ${opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analyze button */}
                <button
                  onClick={() => analyze()}
                  className="group w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-txt-on-accent transition-all duration-300 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)',
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(232, 117, 58, 0.4)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
                    </svg>
                    Design My Makeover
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading State — Progressive steps */}
        {appState === "loading" && (
          <div className="flex flex-col items-center gap-4 py-10 animate-fadeIn">
            <DoodleBearThinking className="w-32 h-32 animate-float" />

            <div className="h-14 flex flex-col items-center justify-center">
              <div key={loadingStep} className="flex items-center gap-2 animate-fadeSwap">
                {(() => {
                  const { Icon } = LOADING_STEPS[loadingStep];
                  return <Icon className="w-5 h-5" />;
                })()}
                <p className="text-sm font-medium text-txt-secondary text-center">
                  {LOADING_STEPS[loadingStep].text}
                </p>
              </div>
            </div>

            {/* Step progress bar */}
            <div className="w-48 h-1.5 rounded-full overflow-hidden mt-2 bg-accent-100">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%`,
                  background: 'linear-gradient(90deg, #E8753A, #F49556)',
                }}
              />
            </div>

            <p className="text-[10px] text-txt-muted">
              Step {loadingStep + 1} of {LOADING_STEPS.length}
            </p>
          </div>
        )}

        {/* Error State */}
        {appState === "error" && (
          <div className="animate-scaleBounce rounded-2xl border border-err-100 bg-err-50 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-err-100">
              <svg className="w-6 h-6 text-err-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21.73 18l-8-14a2 2 0 00-3.46 0l-8 14A2 2 0 004.27 21h15.46a2 2 0 001.73-3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-err-700">{error}</p>
            <button
              onClick={() => analyze()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-err-100 px-4 py-2 text-sm font-medium text-err-700 transition-colors hover:bg-err-500 hover:text-white"
            >
              Give it another shot
            </button>
          </div>
        )}

        {/* Results State */}
        {appState === "results" && result && (
          <div ref={resultsRef} className="space-y-6 animate-fadeIn">
            {/* Celebratory results header */}
            <div className="text-center space-y-2">
              <DoodleBearHappy className="w-16 h-16 mx-auto" />
              <h2 className="text-2xl sm:text-3xl font-bold text-txt-primary flex items-center justify-center gap-2">
                Your Makeover Plan is Ready!
                <DoodleStar className="w-5 h-5 animate-twinkle" />
              </h2>
              <p className="text-sm text-txt-secondary max-w-sm mx-auto">
                We found {result.items?.length ?? 0} items to transform your room — all for under ${result.total_estimated_cost ?? 0}.
              </p>
            </div>

            {/* Try a Different Vibe — Quick Reroll */}
            <div
              className="rounded-2xl bg-bg-card border border-accent-100 p-5"
              style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-txt-muted mb-3 text-center">
                Want a different look?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {VIBE_OPTIONS.map((vibe) => (
                  <button
                    key={vibe.label}
                    onClick={() => rerollWithVibe(vibe)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                      activeVibe === vibe.label
                        ? "text-txt-on-accent shadow-sm"
                        : "bg-bg-secondary border border-accent-200 text-txt-secondary hover:border-accent-400 hover:bg-accent-50"
                    }`}
                    style={
                      activeVibe === vibe.label
                        ? { background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' }
                        : undefined
                    }
                  >
                    {vibe.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Before/After Slider — Phase 2 */}
            {styledImageUrl && previewUrl && (
              <div className="animate-fadeIn">
                <BeforeAfterSlider
                  beforeSrc={previewUrl}
                  afterSrc={styledImageUrl}
                />
              </div>
            )}

            {/* Styled room loading indicator */}
            {isGeneratingImage && !styledImageUrl && (
              <div className="rounded-2xl bg-bg-card border border-accent-100 p-5 text-center animate-fadeIn"
                style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
              >
                <p className="text-xs font-medium text-txt-secondary">
                  Generating your before &amp; after preview...
                </p>
                <div className="w-40 h-1.5 rounded-full overflow-hidden mt-2.5 mx-auto">
                  <div className="h-full w-full animate-shimmer rounded-full" />
                </div>
                <p className="text-[10px] text-txt-muted mt-2">
                  Almost there — this takes about 20 seconds
                </p>
              </div>
            )}

            {/* Graceful error when image generation fails */}
            {imageGenFailed && !styledImageUrl && !isGeneratingImage && (
              <div className="rounded-2xl bg-accent-50 border border-accent-200 p-4 text-center animate-fadeIn"
                style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
              >
                <p className="text-xs font-medium text-accent-600">
                  Preview image didn&apos;t load this time — but your full makeover plan is ready below!
                </p>
              </div>
            )}

            <ResultsDisplay
              result={result}
              budget={budget}
              productMatches={productMatches}
              isSearchingProducts={productMatches.length === 0 && !productSearchFailed && appState === "results"}
            />

            <button
              onClick={reset}
              className="w-full rounded-xl border-2 border-dashed border-accent-200 px-4 py-3.5 text-sm font-medium text-accent-500 transition-all duration-300 hover:border-accent-400 hover:bg-accent-50 hover:shadow-sm"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Another Room
              </span>
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-accent-100/50 mt-12 pt-8 pb-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <DoodleBear className="w-5 h-5" />
          <p className="text-xs text-txt-muted">
            Made with love at <span className="font-semibold text-txt-secondary">Hackathon 2026</span>
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 text-[10px] text-txt-muted">
          {["GPT-4o", "DALL-E 3", "Gemini", "Next.js 16", "Tailwind 4", "SerpAPI"].map((tech, i) => (
            <span key={tech}>
              {tech}{i < 5 && <span className="mx-1 text-accent-200">·</span>}
            </span>
          ))}
        </div>
      </footer>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}

/* ── Before/After Slider (inline for now, Phase 2) ── */
function BeforeAfterSlider({ beforeSrc, afterSrc }: { beforeSrc: string; afterSrc: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(2, Math.min(98, x)));
  }, []);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-txt-muted text-center flex items-center gap-2">
        <span className="h-px flex-1 bg-gradient-to-r from-accent-200 to-transparent" />
        Your Room, Transformed
        <span className="h-px flex-1 bg-gradient-to-l from-accent-200 to-transparent" />
      </h3>
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden border border-accent-100 cursor-col-resize select-none"
        style={{ aspectRatio: "16/10", boxShadow: '0 2px 8px rgba(44,24,16,0.1)' }}
        onPointerDown={(e) => {
          isDragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          handleMove(e.clientX);
        }}
        onPointerMove={(e) => {
          if (isDragging.current) handleMove(e.clientX);
        }}
        onPointerUp={() => { isDragging.current = false; }}
      >
        {/* After image (full) */}
        <img src={afterSrc} alt="Styled room" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {/* Before image (clipped) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img
            src={beforeSrc}
            alt="Original room"
            className="absolute inset-0 h-full object-cover"
            style={{ width: `${containerRef.current?.offsetWidth ?? 9999}px`, maxWidth: 'none' }}
            draggable={false}
          />
        </div>

        {/* Slider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
          style={{ left: `${position}%`, boxShadow: '0 0 8px rgba(0,0,0,0.3)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
          >
            <svg className="w-5 h-5 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l-4 5 4 5M16 7l4 5-4 5" />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider bg-black/50 text-white px-2.5 py-1 rounded-full z-20 backdrop-blur-sm">
          Before
        </span>
        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-black/50 text-white px-2.5 py-1 rounded-full z-20 backdrop-blur-sm">
          After
        </span>
      </div>
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
