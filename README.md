# Roomify — AI Room Stylist on a Real Budget

Snap your room photo. Get a designer makeover plan in 30 seconds — with real, shoppable products from Amazon, Target & IKEA, all under your budget.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![GPT-4o](https://img.shields.io/badge/GPT--4o-Vision-412991?logo=openai)
![Gemini](https://img.shields.io/badge/Gemini-Fallback-4285F4?logo=google)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)

---

## How It Works

1. **Upload** a room photo (bedroom, living room, kitchen, office — any room)
2. **Pick a vibe** — Cozy Hygge, Minimalist, Boho Chic, Dark Academia, or Cottagecore
3. **Set your budget** — $50, $100, or $150
4. **AI analyzes** your room and recommends 4–6 high-impact styling items
5. **Shopping Agent** finds real products with real prices and direct links
6. **Before/After preview** shows your room with the new items added

## Features

- **AI Room Analysis** — GPT-4o Vision (detail: high) with Gemini 2.5 Flash fallback
- **2-Step Pipeline** — Vision analysis (GPT-4o) + text recommendations (GPT-4o-mini) for better quality at lower cost
- **SSE Streaming** — Progressive results as analysis completes
- **Smart Shopping Agent** — Searches Amazon first (with ASINs for add-to-cart), falls back to Google Shopping
- **Styled Room Preview** — Multi-provider image generation (Imagen 3 → Flux Kontext → gpt-image-1)
- **Before/After Slider** — Interactive drag comparison
- **Budget Tracking** — All recommendations validated to stay within budget
- **Vibe Reroll** — Quick-switch between 5 aesthetic styles without re-uploading
- **Copy & Share** — Export your shopping list or share via Web Share API
- **Content Caching** — Identical photos return cached results instantly
- **Graceful Fallbacks** — Works with partial API keys; full mock mode with no keys at all

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (React 19) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| AI Vision | OpenAI GPT-4o (detail: high) / Google Gemini 2.5 Flash |
| AI Recommendations | OpenAI GPT-4o-mini |
| Image Gen | Imagen 3 / Flux Kontext / gpt-image-1 |
| Image Optimization | sharp |
| Product Search | SerpAPI (Amazon + Google Shopping) |
| Auth | Supabase (Google OAuth) |
| Analytics | PostHog |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/surindersingh1699/Multi-moda-hackathon.git
cd Multi-moda-hackathon
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Required — at least one AI provider
OPENAI_API_KEY=sk-proj-...       # GPT-4o + gpt-image-1
GOOGLE_API_KEY=AIzaSy...         # Gemini fallback + Imagen 3

# Image Generation — Flux Kontext (via Replicate)
REPLICATE_API_TOKEN=             # replicate.com API token

# Required — for real product search
SERPAPI_KEY=...                   # serpapi.com API key

# Auth (optional)
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # Supabase anon key

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=         # PostHog project key
NEXT_PUBLIC_POSTHOG_HOST=        # PostHog host URL
```

> **No keys?** The app runs in full mock mode with demo data — great for testing the UI.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Routes

### `POST /api/analyze`

Analyzes a room photo and returns styling recommendations via SSE streaming.

- **Input:** Base64 image, optional style prompt, budget
- **Output (SSE):** `analysis` → `recommendations` → `complete` events
- **Output (JSON):** Full result on cache hit or mock mode
- **Fallback:** OpenAI GPT-4o → Google Gemini → Mock data

### `POST /api/find-products`

Finds real shoppable products matching AI recommendations.

- **Input:** Array of styling items with search queries
- **Output:** Product matches with titles, prices, URLs, thumbnails
- **Fallback:** Amazon → Google Shopping → Mock data

### `POST /api/generate-styled-room`

Generates a before/after visualization of the styled room.

- **Input:** Base64 image, item list
- **Output:** Styled room image (base64), provider name
- **Fallback:** Imagen 3 → Flux Kontext → gpt-image-1

## Project Structure

```
src/
  app/
    api/
      analyze/               # Room analysis (GPT-4o → GPT-4o-mini, SSE)
      find-products/          # Product search (SerpAPI)
      generate-styled-room/   # Image generation (Imagen 3 / Flux / gpt-image-1)
    page.tsx                  # Main app UI + state
    layout.tsx                # Root layout + metadata
    globals.css               # Tailwind theme + animations
  components/
    ImageUpload.tsx           # Drag-drop photo upload
    ResultsDisplay.tsx        # Results panel + shopping list
    DoodleElements.tsx        # Decorative SVG illustrations
  lib/
    schema.ts                 # TypeScript types + JSON schemas
    validate.ts               # Server + client validators
    prompt.ts                 # Vision + recommendation prompts
    image.ts                  # Sharp optimization + hashing
    image-gen.ts              # Multi-provider image generation
    mock.ts                   # Demo mode fixture data
```

## Deployment

The app auto-deploys to Vercel on push to `master`. Set your environment variables in the Vercel dashboard under **Settings → Environment Variables**.
