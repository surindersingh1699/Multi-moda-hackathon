"use client";

import { useState, useEffect, useMemo } from "react";
import { getLocaleConfig, type LocaleConfig } from "./locale-config";

export type { FallbackStore, LocaleConfig } from "./locale-config";
export { getLocaleConfig } from "./locale-config";

/** Detect country code from browser timezone. Falls back to "US". */
export function detectCountryCode(): string {
  if (typeof window === "undefined") return "US";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const exact: Record<string, string> = {
      "Asia/Kolkata": "IN",
      "Asia/Calcutta": "IN",
      "Asia/Mumbai": "IN",
      "Asia/Chennai": "IN",
      "Europe/London": "GB",
      "Europe/Belfast": "GB",
      "America/Toronto": "CA",
      "America/Vancouver": "CA",
      "America/Winnipeg": "CA",
      "America/Edmonton": "CA",
      "America/Halifax": "CA",
      "America/Montreal": "CA",
      "Australia/Sydney": "AU",
      "Australia/Melbourne": "AU",
      "Australia/Brisbane": "AU",
      "Australia/Perth": "AU",
      "Australia/Adelaide": "AU",
      "Australia/Hobart": "AU",
      "Europe/Berlin": "DE",
      "Europe/Paris": "FR",
      "Europe/Rome": "IT",
      "Europe/Madrid": "ES",
      "Europe/Amsterdam": "NL",
      "Europe/Brussels": "BE",
      "Europe/Vienna": "AT",
      "Europe/Zurich": "CH",
      "Europe/Stockholm": "SE",
      "Europe/Oslo": "NO",
      "Europe/Copenhagen": "DK",
      "Europe/Helsinki": "FI",
      "Europe/Warsaw": "PL",
      "Europe/Lisbon": "PT",
      "Europe/Dublin": "IE",
      "Europe/Prague": "CZ",
      "Europe/Budapest": "HU",
      "Europe/Bucharest": "RO",
    };
    if (exact[tz]) return exact[tz];
    if (tz.startsWith("Australia/")) return "AU";
    if (tz.startsWith("Europe/")) return "EU";
    if (tz.startsWith("Asia/")) {
      // Most Asia/* timezones that aren't India — default to US for now
      // (Japan, Korea, China, etc. don't have localized Amazon store configs)
      return "US";
    }
    return "US";
  } catch {
    return "US";
  }
}

/** React hook: auto-detect locale on mount, return config. */
export function useLocale(): LocaleConfig {
  const [countryCode, setCountryCode] = useState("US");

  useEffect(() => {
    setCountryCode(detectCountryCode());
  }, []);

  return useMemo(() => getLocaleConfig(countryCode), [countryCode]);
}
