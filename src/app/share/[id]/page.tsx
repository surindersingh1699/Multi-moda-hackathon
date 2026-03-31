import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

async function getShare(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shares")
    .select("*, analyses(result, styled_image_url, budget)")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) return { title: "Share Not Found — Roomify" };

  const analysis = share.analyses as { result: { style_direction?: string; total_estimated_cost?: number; items?: unknown[] } } | null;
  const title = share.title || "My Room Makeover — Roomify";
  const description = analysis?.result
    ? `${analysis.result.items?.length ?? 0} items for $${analysis.result.total_estimated_cost ?? 0} — ${analysis.result.style_direction?.slice(0, 100) ?? ""}`
    : "Check out my AI room makeover!";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: share.image_path ? [share.image_path] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: share.image_path ? [share.image_path] : [],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const share = await getShare(id);
  if (!share) notFound();

  const analysis = share.analyses as {
    result: {
      room_reading?: string;
      style_direction?: string;
      total_estimated_cost?: number;
      items?: Array<{ name: string; estimated_price: number; category: string }>;
      quick_wins?: string[];
    };
    styled_image_url?: string;
    budget?: number;
  } | null;

  const result = analysis?.result;
  const styledImageUrl = analysis?.styled_image_url || share.image_path;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FDF8F4" }}>
      {/* Header */}
      <header className="border-b border-[#FDDCC6]/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span
            className="text-base font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(to right, #E8753A, #D4877A, #B84E20)" }}
          >
            Roomify
          </span>
          <a
            href="/"
            className="text-[10px] font-semibold uppercase tracking-wider text-[#FFFBF7] rounded-full px-3 py-1 transition-colors"
            style={{ background: "linear-gradient(135deg, #E8753A, #D4622D)" }}
          >
            Try Roomify
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: "#2C1810" }}>
            {share.title || "Room Makeover"}
          </h1>
          {result && (
            <p className="text-sm" style={{ color: "#6B5347" }}>
              {result.items?.length ?? 0} items for ${result.total_estimated_cost ?? 0}
            </p>
          )}
        </div>

        {/* Styled room image */}
        {styledImageUrl && (
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#FDDCC6" }}>
            <img
              src={styledImageUrl}
              alt="Room makeover"
              className="w-full"
              style={{ aspectRatio: "16/10", objectFit: "cover" }}
            />
          </div>
        )}

        {/* Style direction */}
        {result?.style_direction && (
          <div
            className="rounded-2xl p-5 text-sm text-white leading-relaxed font-medium"
            style={{ background: "linear-gradient(135deg, #F49556, #D4877A, #B05E50)" }}
          >
            {result.style_direction}
          </div>
        )}

        {/* Room reading */}
        {result?.room_reading && (
          <div
            className="rounded-2xl p-5 border"
            style={{ borderColor: "#FDDCC6", backgroundColor: "#FFFFFF" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#9C8B82" }}>
              Room Reading
            </p>
            <p className="text-sm italic leading-relaxed" style={{ color: "#6B5347" }}>
              {result.room_reading}
            </p>
          </div>
        )}

        {/* Items preview */}
        {result?.items && result.items.length > 0 && (
          <div
            className="rounded-2xl p-5 border space-y-3"
            style={{ borderColor: "#FDDCC6", backgroundColor: "#FFFFFF" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-center" style={{ color: "#9C8B82" }}>
              Shopping List
            </p>
            {result.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span style={{ color: "#2C1810" }}>{item.name}</span>
                <span className="font-bold" style={{ color: "#B84E20" }}>${item.estimated_price}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-[#FFFBF7] transition-all"
            style={{ background: "linear-gradient(135deg, #E8753A, #D4622D, #B84E20)" }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
            </svg>
            Design Your Own Room
          </a>
          <p className="text-[10px] mt-3" style={{ color: "#9C8B82" }}>
            Free AI room makeover in 30 seconds
          </p>
        </div>
      </main>
    </div>
  );
}
