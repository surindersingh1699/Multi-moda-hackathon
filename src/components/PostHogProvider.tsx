"use client";

import { useEffect } from "react";
import { initAnalytics, trackPageView } from "@/lib/analytics";

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initAnalytics();
    trackPageView();
  }, []);

  return <>{children}</>;
}
