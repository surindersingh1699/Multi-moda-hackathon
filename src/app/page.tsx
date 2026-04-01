"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import ImageUpload from "@/components/ImageUpload";
import ResultsDisplay from "@/components/ResultsDisplay";
import AuthModal from "@/components/AuthModal";
import UsageBanner from "@/components/UsageBanner";
import HistoryPanel from "@/components/HistoryPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import CompareView from "@/components/CompareView";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/locale";
import {
  saveAnalysis,
  updateAnalysisStyledImage,
  updateAnalysisProducts,
  addFavorite,
  removeFavoriteByItem,
  fetchFavorites,
} from "@/lib/supabase/db";
import type { FavoriteRow } from "@/lib/supabase/db";
import { DoodleBear, DoodleBearThinking, DoodleBearHappy, DoodleStar, DoodleCamera, DoodleLamp, DoodleHeart, DoodleFrame, FloatingDoodles } from "@/components/DoodleElements";
import { parseResultSafe } from "@/lib/validate";
import { trackUploadPhoto, trackGenerateRoom } from "@/lib/analytics";
import type { StylingResult, ProductMatch, ProductSearchResult, StylingItem } from "@/lib/schema";


const MAX_USES = 5;
const PENDING_IMAGE_KEY = "roomify_pending_image";

type AppState = "idle" | "loading" | "error" | "results";


const LOADING_STEPS = [
  { text: "Hmm, let me take a good look at your room...", Icon: DoodleCamera },
  { text: "Ooh, I see some styling potential here!", Icon: DoodleStar },
  { text: "Hunting for the perfect budget finds...", Icon: DoodleHeart },
  { text: "Cross-checking prices across stores...", Icon: DoodleLamp },
  { text: "Putting your makeover plan together!", Icon: DoodleFrame },
];


const VIBE_OPTIONS = [
  { label: "Clean Upgrade", prompt: "elevate what's already here — fix what's missing, keep the existing style, just make it look polished and intentional" },
  { label: "Cozy Hygge", prompt: "cozy hygge — warm textures, soft lighting, candles, knit blankets" },
  { label: "Minimalist", prompt: "minimalist — clean lines, neutral tones, less is more" },
  { label: "Boho Chic", prompt: "boho chic — eclectic patterns, macramé, earthy tones, layered textiles" },
  { label: "Dark Academia", prompt: "dark academia — moody tones, vintage books, warm wood, brass accents" },
  { label: "Cottagecore", prompt: "cottagecore — floral prints, natural materials, vintage charm, soft pastels" },
] as const;

export default function Home() {
  const { user, loading: authLoading, usageCount, isAdmin, refreshUsage } = useAuth();
  const localeConfig = useLocale();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const usageLimitReached = !isAdmin && usageCount !== null && usageCount >= MAX_USES;

  const resultsRef = useRef<HTMLDivElement>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<StylingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [roomContext, setRoomContext] = useState("");
  const [budget, setBudget] = useState<number>(150);
  const [customBudget, setCustomBudget] = useState<string>("");
  const [activeVibe, setActiveVibe] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Phase 2: styled room image state
  const [styledImageUrl, setStyledImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenFailed, setImageGenFailed] = useState(false);

  // AI Shopping Agent state
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [productSearchFailed, setProductSearchFailed] = useState(false);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const pendingResultRef = useRef<{ data: StylingResult; base64: string } | null>(null);
  const targetStepRef = useRef(0);
  const lastImageBase64Ref = useRef<string | null>(null);

  // History, Favorites, Compare panel state
  const [showHistory, setShowHistory] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const currentAnalysisId = useRef<string | null>(null);

  // Favorites state — loaded once, updated optimistically
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const favoriteNames = useMemo(
    () => new Set(favorites.map((f) => f.item_name.toLowerCase())),
    [favorites],
  );

  // Load favorites when user logs in
  const userId = user?.id;
  useEffect(() => {
    if (!userId) { setFavorites([]); return; }
    const supabase = createClient();
    fetchFavorites(supabase, userId).then(setFavorites);
  }, [userId]);

  // Sync budget default when locale is detected (only on initial mount)
  const localeInitRef = useRef(false);
  useEffect(() => {
    if (localeInitRef.current) return;
    if (localeConfig.countryCode !== "US" || localeConfig.defaultBudget !== 150) {
      setBudget(localeConfig.defaultBudget);
      localeInitRef.current = true;
    }
  }, [localeConfig.countryCode, localeConfig.defaultBudget]);

  const handleToggleFavorite = useCallback(
    async (item: StylingItem, match?: ProductMatch) => {
      if (!user) { setShowAuthModal(true); return; }
      const supabase = createClient();
      const key = item.name.toLowerCase();
      const existing = favorites.find((f) => f.item_name.toLowerCase() === key);

      if (existing) {
        // Optimistic remove
        setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
        await removeFavoriteByItem(supabase, user.id, item.name);
      } else {
        // Optimistic add with temp row
        const tempId = crypto.randomUUID();
        const tempRow: FavoriteRow = {
          id: tempId,
          user_id: user.id,
          analysis_id: currentAnalysisId.current,
          item_name: item.name,
          item_category: item.category,
          estimated_price: item.estimated_price,
          search_query: item.search_query,
          placement: item.placement,
          reason: item.reason,
          product_url: match?.product_url ?? null,
          product_title: match?.product_title ?? null,
          real_price: match?.real_price ?? null,
          store: match?.store ?? null,
          thumbnail: match?.thumbnail ?? null,
          created_at: new Date().toISOString(),
        };
        setFavorites((prev) => [tempRow, ...prev]);
        const realId = await addFavorite(supabase, user.id, item, currentAnalysisId.current ?? undefined, match);
        if (realId) {
          setFavorites((prev) => prev.map((f) => (f.id === tempId ? { ...f, id: realId } : f)));
        }
      }
    },
    [user, favorites],
  );

  // Load a past analysis from history
  const handleLoadAnalysis = useCallback(
    (params: {
      result: StylingResult;
      previewUrl: string | null;
      styledImageUrl: string | null;
      productMatches: ProductMatch[];
      budget: number;
      vibe: string | null;
    }) => {
      setResult(params.result);
      setPreviewUrl(params.previewUrl);
      setStyledImageUrl(params.styledImageUrl);
      setProductMatches(params.productMatches);
      setBudget(params.budget);
      setActiveVibe(params.vibe);
      setAppState("results");
      setFile(null);
      setError(null);
      setIsGeneratingImage(false);
      setImageGenFailed(false);
      setProductSearchFailed(false);
      setIsSearchingProducts(false);
    },
    [],
  );

  // Social sharing — creates a shareable link with OG metadata
  const [isSharing, setIsSharing] = useState(false);
  const handleShare = useCallback(async () => {
    if (!result) return;
    setIsSharing(true);
    try {
      const res = await fetch("/api/share-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          afterImageUrl: styledImageUrl || null,
          styleDirection: result.style_direction,
          totalCost: result.total_estimated_cost,
          itemCount: result.items?.length ?? 0,
          analysisId: currentAnalysisId.current,
        }),
      });

      if (res.ok) {
        const { shareUrl, title } = await res.json();
        const shareText = `Check out my AI room makeover! ${result.items?.length ?? 0} items for ${localeConfig.currencySymbol}${result.total_estimated_cost ?? 0}.`;

        if (navigator.share) {
          await navigator.share({ title, text: shareText, url: shareUrl });
        } else {
          await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
          // Brief visual feedback would be handled by the button state
        }
      }
    } catch {
      // User cancelled or share failed
    } finally {
      setIsSharing(false);
    }
  }, [result, styledImageUrl]);

  const onImageSelected = useCallback((f: File, url: string) => {
    setFile(f);
    setPreviewUrl(url);
    setResult(null);
    setError(null);
    setStyledImageUrl(null);
    setImageGenFailed(false);
    setProductMatches([]);
    setProductSearchFailed(false);
    setIsSearchingProducts(false);
    setActiveVibe(null);
    setApiDone(false);
    pendingResultRef.current = null;
    setAppState("idle");
    trackUploadPhoto({
      file_type: f.type,
      file_size_kb: Math.round(f.size / 1024),
    });
    // Persist image to sessionStorage so it survives OAuth redirects
    fileToBase64(f).then((b64) => {
      try {
        sessionStorage.setItem(PENDING_IMAGE_KEY, JSON.stringify({
          base64: b64,
          name: f.name,
          type: f.type,
        }));
      } catch {
        // sessionStorage full or unavailable — ignore
      }
    });
  }, []);

  // Restore pending image after OAuth redirect
  useEffect(() => {
    if (file || authLoading) return;
    try {
      const stored = sessionStorage.getItem(PENDING_IMAGE_KEY);
      if (!stored) return;
      const { base64, name, type } = JSON.parse(stored) as {
        base64: string; name: string; type: string;
      };
      // Convert base64 data URL back to a File
      const byteString = atob(base64.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const restored = new File([ab], name, { type });
      const url = URL.createObjectURL(restored);
      setFile(restored);
      setPreviewUrl(url);
      // Clear after restore — only needed for one redirect
      sessionStorage.removeItem(PENDING_IMAGE_KEY);
    } catch {
      sessionStorage.removeItem(PENDING_IMAGE_KEY);
    }
  }, [file, authLoading]);

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
    targetStepRef.current = 0;
    setApiDone(false);
    pendingResultRef.current = null;
    setError(null);
    setStyledImageUrl(null);
    setImageGenFailed(false);
    setIsSearchingProducts(false);

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
          roomContext: roomContext.trim() || undefined,
          countryCode: localeConfig.countryCode,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream")) {
        // Handle SSE stream from the optimized analyze endpoint
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let eventType = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              let data: Record<string, unknown>;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                console.warn("SSE: failed to parse data line, skipping");
                eventType = "";
                continue;
              }

              if (eventType === "step") {
                targetStepRef.current = data.step as number;
              } else if (eventType === "complete") {
                targetStepRef.current = LOADING_STEPS.length - 1;
                const parsed = parseResultSafe(data);
                if (!parsed.ok) throw new Error(`Invalid response: ${parsed.error}`);
                pendingResultRef.current = { data: parsed.data, base64 };
                setApiDone(true);
                refreshUsage();
              } else if (eventType === "error") {
                throw new Error((data.error as string) || "Analysis failed");
              }

              eventType = "";
            }
          }
        }

        if (!pendingResultRef.current) {
          throw new Error("Stream ended without complete result");
        }
      } else {
        // Fallback: plain JSON response (mock mode)
        const raw = await res.json();
        const parsed = parseResultSafe(raw);
        if (!parsed.ok) {
          throw new Error(`Invalid response: ${parsed.error}`);
        }
        targetStepRef.current = LOADING_STEPS.length - 1;
        pendingResultRef.current = { data: parsed.data, base64 };
        setApiDone(true);
        refreshUsage();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setAppState("error");
    }
  };

  const findProducts = async (analysisResult: StylingResult): Promise<ProductMatch[]> => {
    setProductMatches([]);
    setProductSearchFailed(false);
    try {
      const res = await fetch("/api/find-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: analysisResult.items, countryCode: localeConfig.countryCode }),
      });
      if (res.ok) {
        const data: ProductSearchResult = await res.json();
        if (data.matches?.length > 0) {
          setProductMatches(data.matches);
          // Persist product matches to Supabase
          if (currentAnalysisId.current) {
            const supabase = createClient();
            updateAnalysisProducts(supabase, currentAnalysisId.current, data.matches);
          }
          return data.matches;
        } else {
          setProductSearchFailed(true);
        }
      } else {
        setProductSearchFailed(true);
      }
    } catch {
      setProductSearchFailed(true);
    }
    return [];
  };

  const generateStyledRoom = async (imageBase64: string, analysisResult: StylingResult, products: ProductMatch[]) => {
    setIsGeneratingImage(true);
    lastImageBase64Ref.current = imageBase64;
    try {
      // Build items with real product names when available
      const itemsWithProducts = analysisResult.items.map((i) => {
        const match = products.find((p) => p.item_name === i.name);
        return {
          name: i.name,
          category: i.category,
          placement: i.placement,
          product_title: match?.product_title || undefined,
        };
      });

      const res = await fetch("/api/generate-styled-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          styleDirection: analysisResult.style_direction,
          items: itemsWithProducts,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.styledImageUrl) {
          setStyledImageUrl(data.styledImageUrl);
          // Persist styled image URL to Supabase
          if (currentAnalysisId.current) {
            const supabase = createClient();
            updateAnalysisStyledImage(supabase, currentAnalysisId.current, data.styledImageUrl);
          }
        }
      }
    } catch {
      setImageGenFailed(true);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const regenerateWithGemini = async () => {
    if (!result || !lastImageBase64Ref.current) return;
    setIsGeneratingImage(true);
    setImageGenFailed(false);
    try {
      const itemsWithProducts = result.items.map((i) => {
        const match = productMatches.find((p) => p.item_name === i.name);
        return {
          name: i.name,
          category: i.category,
          placement: i.placement,
          product_title: match?.product_title || undefined,
        };
      });

      const res = await fetch("/api/generate-styled-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: lastImageBase64Ref.current,
          styleDirection: result.style_direction,
          items: itemsWithProducts,
          provider: "gemini",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.styledImageUrl) {
          setStyledImageUrl(data.styledImageUrl);
          if (currentAnalysisId.current) {
            const supabase = createClient();
            updateAnalysisStyledImage(supabase, currentAnalysisId.current, data.styledImageUrl);
          }
        }
      } else {
        const body = await res.json().catch(() => ({}));
        console.warn("Gemini retry failed:", body.error);
        setImageGenFailed(true);
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
      : "Roomify — AI Room Stylist";
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
      // Close AudioContext after playback to prevent leak
      setTimeout(() => ctx.close().catch(() => {}), 1000);
    } catch {
      // Audio not supported — silently skip
    }
  }, [styledImageUrl, appState]);

  // Advance loading steps toward server-reported target (600ms per step)
  useEffect(() => {
    if (appState !== "loading") return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= LOADING_STEPS.length - 1) return prev;
        if (prev < targetStepRef.current) return prev + 1;
        return prev; // hold — server hasn't progressed yet
      });
    }, 400);
    return () => clearInterval(interval);
  }, [appState]);

  // Reveal results once loading steps finish and API is done
  useEffect(() => {
    if (appState !== "loading" || !apiDone || loadingStep < LOADING_STEPS.length - 1) return;
    if (!pendingResultRef.current) return;

    const timer = setTimeout(async () => {
      const pending = pendingResultRef.current;
      if (!pending) return;
      pendingResultRef.current = null;
      setResult(pending.data);
      setAppState("results");
      setApiDone(false);

      // Save analysis to Supabase (fire-and-forget)
      if (user) {
        const supabase = createClient();
        const id = await saveAnalysis(supabase, {
          userId: user.id,
          result: pending.data,
          imageBase64: pending.base64,
          userPrompt: userPrompt.trim() || undefined,
          budget,
          vibe: activeVibe,
        });
        currentAnalysisId.current = id;
      }

      // Parallel: product search and image generation run simultaneously
      setIsSearchingProducts(true);
      findProducts(pending.data).then(() => setIsSearchingProducts(false));
      generateStyledRoom(pending.base64, pending.data, []);
    }, 50);
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
    setIsSearchingProducts(false);
    setUserPrompt("");
    setRoomContext("");
    setActiveVibe(null);
    setApiDone(false);
    pendingResultRef.current = null;
    setAppState("idle");
    try { sessionStorage.removeItem(PENDING_IMAGE_KEY); } catch {}
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
          <div className="flex items-center gap-1.5">
            {user && (
              <>
                {/* Favorites button */}
                <button
                  onClick={() => setShowFavorites(true)}
                  className="relative flex items-center gap-1 rounded-full border border-accent-200 bg-bg-card/50 hover:bg-accent-50 transition-colors px-2.5 py-1"
                >
                  <svg className="w-3.5 h-3.5 text-rose-400" fill={favorites.length > 0 ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-[10px] font-semibold text-txt-muted">Saved{favorites.length > 0 ? ` (${favorites.length})` : ""}</span>
                </button>

                {/* History button */}
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1 rounded-full border border-accent-200 bg-bg-card/50 hover:bg-accent-50 transition-colors px-2.5 py-1"
                >
                  <svg className="w-3.5 h-3.5 text-txt-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-semibold text-txt-muted">History</span>
                </button>

                {/* Compare button */}
                <button
                  onClick={() => setShowCompare(true)}
                  className="flex items-center gap-1 rounded-full border border-accent-200 bg-bg-card/50 hover:bg-accent-50 transition-colors px-2.5 py-1"
                >
                  <svg className="w-3.5 h-3.5 text-txt-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                  </svg>
                  <span className="text-[10px] font-semibold text-txt-muted">Compare</span>
                </button>
              </>
            )}

            {user && usageCount !== null && (
              <span className="text-[10px] font-medium text-txt-muted ml-1">
                {usageCount}/{MAX_USES}
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
                    Snap your room. Get a designer<br />makeover plan in 30 seconds.
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

                {/* Room context */}
                <div>
                  <label htmlFor="room-context" className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">
                    Tell us about this room (optional)
                  </label>
                  <textarea
                    id="room-context"
                    value={roomContext}
                    onChange={(e) => setRoomContext(e.target.value)}
                    placeholder="e.g., I work from home here and need better lighting for video calls"
                    rows={2}
                    maxLength={300}
                    className="w-full rounded-xl border border-accent-200 bg-bg-card px-4 py-3 text-sm text-txt-primary placeholder:text-txt-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-300 focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Budget selector */}
                <div>
                  <label className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">
                    What&apos;s your budget?
                  </label>
                  <div className="flex gap-2">
                    {localeConfig.budgetPresets.map((opt: number) => (
                      <button
                        key={opt}
                        onClick={() => { setBudget(opt); setCustomBudget(""); }}
                        className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                          budget === opt && !customBudget
                            ? "text-txt-on-accent shadow-sm"
                            : "bg-bg-card border border-accent-200 text-txt-secondary hover:border-accent-400"
                        }`}
                        style={budget === opt && !customBudget ? { background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' } : undefined}
                      >
                        {localeConfig.currencySymbol}{opt}
                      </button>
                    ))}
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-txt-muted pointer-events-none">{localeConfig.currencySymbol}</span>
                      <input
                        type="number"
                        min={Math.round(localeConfig.budgetPresets[0] * 0.25)}
                        max={localeConfig.budgetPresets[localeConfig.budgetPresets.length - 1] * 2}
                        placeholder="Custom"
                        value={customBudget}
                        onChange={(e) => {
                          setCustomBudget(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          const maxBudget = localeConfig.budgetPresets[localeConfig.budgetPresets.length - 1] * 2;
                          if (val > 0) setBudget(Math.min(maxBudget, val));
                        }}
                        onBlur={() => {
                          if (!customBudget) return;
                          const minBudget = Math.round(localeConfig.budgetPresets[0] * 0.25);
                          const maxBudget = localeConfig.budgetPresets[localeConfig.budgetPresets.length - 1] * 2;
                          const clamped = Math.max(minBudget, Math.min(maxBudget, parseInt(customBudget, 10) || localeConfig.defaultBudget));
                          setCustomBudget(String(clamped));
                          setBudget(clamped);
                        }}
                        className={`w-full rounded-xl pl-7 pr-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                          customBudget
                            ? "text-txt-on-accent shadow-sm"
                            : "bg-bg-card border border-accent-200 text-txt-secondary hover:border-accent-400"
                        }`}
                        style={customBudget ? { background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' } : undefined}
                      />
                    </div>
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
              {activeVibe && (
                <p className="flex items-center justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-txt-on-accent"
                    style={{ background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' }}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
                    </svg>
                    {activeVibe}
                  </span>
                </p>
              )}
              <p className="text-sm text-txt-secondary max-w-sm mx-auto">
                We found {result.items?.length ?? 0} items to transform your room — all for under {localeConfig.currencySymbol}{result.total_estimated_cost ?? 0}.
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
              <form
                className="flex gap-2 mt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.currentTarget.elements.namedItem("custom-vibe") as HTMLInputElement)?.value.trim();
                  if (!input) return;
                  setActiveVibe(input);
                  setUserPrompt(input);
                  analyze(input);
                }}
              >
                <input
                  name="custom-vibe"
                  type="text"
                  placeholder="Or describe your own vibe..."
                  className="flex-1 rounded-full border border-accent-200 bg-bg-secondary px-4 py-2 text-xs text-txt-primary placeholder:text-txt-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-300 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="rounded-full px-4 py-2 text-xs font-semibold text-txt-on-accent transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #E8753A, #D4622D, #B84E20)' }}
                >
                  Go
                </button>
              </form>
            </div>

            {/* Before/After Slider — Phase 2 */}
            {styledImageUrl && previewUrl && (
              <div className="animate-fadeIn space-y-2">
                <BeforeAfterSlider
                  beforeSrc={previewUrl}
                  afterSrc={styledImageUrl}
                />
                {/* Download + Retry actions */}
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = styledImageUrl;
                      link.download = "roomify-makeover.jpg";
                      link.click();
                    }}
                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-txt-muted hover:text-accent-500 transition-colors px-3 py-1.5 rounded-full border border-accent-100 hover:border-accent-300"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Image
                  </button>
                  <button
                    onClick={regenerateWithGemini}
                    disabled={isGeneratingImage}
                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-txt-muted hover:text-accent-500 transition-colors px-3 py-1.5 rounded-full border border-accent-100 hover:border-accent-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingImage ? (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {isGeneratingImage ? "Regenerating..." : "Not right? Retry with Gemini"}
                  </button>
                </div>
              </div>
            )}

            {/* Parallel progress: products + image generation */}
            {(isSearchingProducts || isGeneratingImage) && !styledImageUrl && (
              <div className="rounded-2xl bg-bg-card border border-accent-100 p-5 animate-fadeIn"
                style={{ boxShadow: '0 1px 3px rgba(44,24,16,0.06)' }}
              >
                {/* Step indicators */}
                <div className="flex items-center justify-center gap-3 mb-3">
                  {/* Step 1: Find Products */}
                  <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-300 ${
                    isSearchingProducts ? "text-accent-500" : productMatches.length > 0 ? "text-green-600" : "text-txt-muted"
                  }`}>
                    {isSearchingProducts ? (
                      <div className="w-3.5 h-3.5 border-2 border-accent-300 border-t-accent-500 rounded-full animate-spin" />
                    ) : productMatches.length > 0 ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-txt-muted/30" />
                    )}
                    Find Products
                  </div>

                  <svg className="w-3 h-3 text-txt-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>

                  {/* Step 2: Generate Image */}
                  <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-300 ${
                    isGeneratingImage ? "text-accent-500" : "text-txt-muted/50"
                  }`}>
                    {isGeneratingImage ? (
                      <div className="w-3.5 h-3.5 border-2 border-accent-300 border-t-accent-500 rounded-full animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-txt-muted/30" />
                    )}
                    Generate Preview
                  </div>
                </div>

                {/* Current step detail */}
                <p className="text-xs font-medium text-txt-secondary text-center">
                  {isSearchingProducts
                    ? "Finding real products on Amazon..."
                    : "Creating your before & after preview with real products..."}
                </p>
                <div className="w-40 h-1.5 rounded-full overflow-hidden mt-2.5 mx-auto">
                  <div className="h-full w-full animate-shimmer rounded-full" />
                </div>
                <p className="text-[10px] text-txt-muted mt-2 text-center">
                  {isSearchingProducts
                    ? "Matching items to real products — a few seconds"
                    : "Almost there — this takes about 20 seconds"}
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
              isSearchingProducts={isSearchingProducts}
              favoriteNames={favoriteNames}
              onToggleFavorite={handleToggleFavorite}
              onShare={handleShare}
              isSharing={isSharing}
              currencySymbol={localeConfig.currencySymbol}
              fallbackStores={localeConfig.fallbackStores}
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
            Powered by <span className="font-semibold text-txt-secondary">Roomify</span>
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-1 text-[10px] text-txt-muted">
          {["GPT-4o", "Imagen 3", "Flux", "Gemini", "Next.js 16", "Tailwind 4"].map((tech, i) => (
            <span key={tech}>
              {tech}{i < 5 && <span className="mx-1 text-accent-200">·</span>}
            </span>
          ))}
        </div>
      </footer>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Slide-out panels */}
      <HistoryPanel
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadAnalysis={handleLoadAnalysis}
      />
      <FavoritesPanel
        open={showFavorites}
        onClose={() => setShowFavorites(false)}
      />
      <CompareView
        open={showCompare}
        onClose={() => setShowCompare(false)}
      />
    </div>
  );
}

/* ── Before/After Slider (inline for now, Phase 2) ── */
function BeforeAfterSlider({ beforeSrc, afterSrc }: { beforeSrc: string; afterSrc: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLImageElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((pct: number) => {
    const clamped = Math.max(2, Math.min(98, pct));
    if (beforeRef.current) beforeRef.current.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
    if (lineRef.current) lineRef.current.style.left = `${clamped}%`;
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    updatePosition(((clientX - rect.left) / rect.width) * 100);
  }, [updatePosition]);

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
        style={{ aspectRatio: "16/10", boxShadow: '0 2px 8px rgba(44,24,16,0.1)', touchAction: 'none' }}
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
        {/* After image (full, bottom layer) */}
        <img src={afterSrc} alt="Styled room" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

        {/* Before image (clipped via clip-path, GPU-composited) */}
        <img
          ref={beforeRef}
          src={beforeSrc}
          alt="Original room"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: 'inset(0 50% 0 0)' }}
          draggable={false}
        />

        {/* Slider line */}
        <div
          ref={lineRef}
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
          style={{ left: '50%', boxShadow: '0 0 8px rgba(0,0,0,0.3)' }}
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
