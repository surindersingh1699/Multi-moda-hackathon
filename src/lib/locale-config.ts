export interface FallbackStore {
  name: string;
  searchUrl: (query: string) => string;
}

export interface LocaleConfig {
  countryCode: string;
  currencySymbol: string;
  currencyCode: string;
  amazonTld: string;
  budgetPresets: number[];
  defaultBudget: number;
  storeList: string;
  fallbackStores: FallbackStore[];
  dateLocale: string;
}

const LOCALE_CONFIGS: Record<string, LocaleConfig> = {
  US: {
    countryCode: "US",
    currencySymbol: "$",
    currencyCode: "USD",
    amazonTld: "com",
    budgetPresets: [100, 150, 200, 500],
    defaultBudget: 150,
    storeList: "Amazon, Walmart, Target, IKEA, HomeGoods",
    fallbackStores: [
      { name: "Amazon", searchUrl: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
      { name: "Walmart", searchUrl: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}` },
    ],
    dateLocale: "en-US",
  },
  IN: {
    countryCode: "IN",
    currencySymbol: "₹",
    currencyCode: "INR",
    amazonTld: "in",
    budgetPresets: [5000, 10000, 15000, 30000],
    defaultBudget: 10000,
    storeList: "Amazon.in, Flipkart, Pepperfry, IKEA, Urban Ladder",
    fallbackStores: [
      { name: "Amazon.in", searchUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
      { name: "Flipkart", searchUrl: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
    ],
    dateLocale: "en-IN",
  },
  GB: {
    countryCode: "GB",
    currencySymbol: "£",
    currencyCode: "GBP",
    amazonTld: "co.uk",
    budgetPresets: [75, 125, 175, 400],
    defaultBudget: 125,
    storeList: "Amazon.co.uk, Argos, John Lewis, IKEA, Dunelm",
    fallbackStores: [
      { name: "Amazon.co.uk", searchUrl: (q) => `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}` },
      { name: "Argos", searchUrl: (q) => `https://www.argos.co.uk/search/${encodeURIComponent(q)}` },
    ],
    dateLocale: "en-GB",
  },
  CA: {
    countryCode: "CA",
    currencySymbol: "CA$",
    currencyCode: "CAD",
    amazonTld: "ca",
    budgetPresets: [125, 175, 250, 600],
    defaultBudget: 175,
    storeList: "Amazon.ca, Canadian Tire, IKEA, Home Depot, Winners",
    fallbackStores: [
      { name: "Amazon.ca", searchUrl: (q) => `https://www.amazon.ca/s?k=${encodeURIComponent(q)}` },
      { name: "Canadian Tire", searchUrl: (q) => `https://www.canadiantire.ca/en/search.html?q=${encodeURIComponent(q)}` },
    ],
    dateLocale: "en-CA",
  },
  AU: {
    countryCode: "AU",
    currencySymbol: "A$",
    currencyCode: "AUD",
    amazonTld: "com.au",
    budgetPresets: [150, 200, 300, 700],
    defaultBudget: 200,
    storeList: "Amazon.com.au, IKEA, Kmart, Target AU, Bunnings",
    fallbackStores: [
      { name: "Amazon.com.au", searchUrl: (q) => `https://www.amazon.com.au/s?k=${encodeURIComponent(q)}` },
      { name: "Kmart", searchUrl: (q) => `https://www.kmart.com.au/search?q=${encodeURIComponent(q)}` },
    ],
    dateLocale: "en-AU",
  },
  EU: {
    countryCode: "EU",
    currencySymbol: "€",
    currencyCode: "EUR",
    amazonTld: "de",
    budgetPresets: [100, 150, 200, 500],
    defaultBudget: 150,
    storeList: "Amazon.de, IKEA, H&M Home, Maisons du Monde, Zara Home",
    fallbackStores: [
      { name: "Amazon.de", searchUrl: (q) => `https://www.amazon.de/s?k=${encodeURIComponent(q)}` },
      { name: "IKEA", searchUrl: (q) => `https://www.ikea.com/de/de/search/?q=${encodeURIComponent(q)}` },
    ],
    dateLocale: "de-DE",
  },
};

const EU_COUNTRIES = [
  "DE", "FR", "IT", "ES", "NL", "BE", "SE", "NO", "DK",
  "FI", "AT", "CH", "PL", "PT", "IE", "CZ", "HU", "RO",
];

/** Look up locale config by ISO country code. Defaults to US. */
export function getLocaleConfig(countryCode: string): LocaleConfig {
  const code = countryCode.toUpperCase();
  if (EU_COUNTRIES.includes(code)) return LOCALE_CONFIGS.EU;
  return LOCALE_CONFIGS[code] ?? LOCALE_CONFIGS.US;
}
