"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { DoodleBear, DoodleHeart } from "@/components/DoodleElements";

export default function UsageBanner() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [wouldPay, setWouldPay] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    await supabase.from("waitlist").insert({
      user_id: user.id,
      email: user.email ?? "",
      would_pay: wouldPay,
      message: message.trim() || null,
    });

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div
      className="rounded-2xl border border-accent-200 bg-bg-card p-8 text-center space-y-5 animate-fadeIn"
      style={{ boxShadow: "0 2px 8px rgba(44,24,16,0.08)" }}
    >
      <DoodleBear className="w-16 h-16 mx-auto" />

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-txt-primary">
          You&apos;ve used all 5 free makeovers!
        </h3>
        <p className="text-sm text-txt-secondary max-w-md mx-auto leading-relaxed">
          We&apos;re in the testing phase. Please join our waiting list and let
          us know if you&apos;d like to pay for this product.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-xl bg-sage-100 p-4 animate-scaleBounce">
          <div className="flex items-center justify-center gap-2">
            <DoodleHeart className="w-5 h-5" />
            <p className="text-sm font-semibold text-txt-primary">
              Thank you! We&apos;ll be in touch.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 max-w-sm mx-auto">
          <label className="flex items-center gap-2.5 justify-center cursor-pointer">
            <input
              type="checkbox"
              checked={wouldPay}
              onChange={(e) => setWouldPay(e.target.checked)}
              className="w-4 h-4 rounded border-accent-300 text-accent-500 focus:ring-accent-300"
            />
            <span className="text-sm font-medium text-txt-secondary">
              I would pay for this product
            </span>
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Any feedback or suggestions? (optional)"
            rows={2}
            className="w-full rounded-xl border border-accent-200 bg-bg-card px-4 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted/50 focus:outline-none focus:ring-2 focus:ring-accent-300 focus:border-transparent transition-all resize-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-txt-on-accent transition-all disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, #E8753A, #D4622D, #B84E20)",
            }}
          >
            <DoodleHeart className="w-4 h-4" />
            {loading ? "Joining..." : "Join the Waiting List"}
          </button>
        </form>
      )}
    </div>
  );
}
