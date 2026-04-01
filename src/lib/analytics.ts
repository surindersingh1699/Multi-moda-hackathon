import posthog from "posthog-js";

// ── Init ──────────────────────────────────────────────────────────
let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  if (typeof window === "undefined") return;

  if (window.location.hostname === "localhost") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    console.warn("[analytics] NEXT_PUBLIC_POSTHOG_KEY not set, skipping init");
    return;
  }

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
    },
  });

  // Link PostHog sessions with Sentry errors
  // @ts-expect-error — undocumented but supported PostHog property
  posthog.config.__add_sentry_integration = true;

  initialized = true;
}

// ── Helper ────────────────────────────────────────────────────────
function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

// ── Basic Events ─────────────────────────────────────────────────

export function trackPageView() {
  capture("page_view");
}

export function trackUploadPhoto(properties?: {
  file_type?: string;
  file_size_kb?: number;
}) {
  capture("upload_photo", properties);
}

export function trackGenerateRoom(properties?: {
  budget?: number;
  vibe?: string | null;
  has_custom_prompt?: boolean;
}) {
  capture("generate_room", properties);
}

// ── Validation Events (UI not built yet) ─────────────────────────

export function trackHitLimit() {
  capture("hit_limit");
}

export function trackClickedWaitlist() {
  capture("clicked_waitlist");
}

export function trackJoinedWaitlist(properties?: { email?: string }) {
  capture("joined_waitlist", properties);
}

export function trackClickedWouldPayYes() {
  capture("clicked_would_pay_yes");
}

export function trackClickedWouldPayNo() {
  capture("clicked_would_pay_no");
}
