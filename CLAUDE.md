# Claude Project Instructions

## Core Rules
- Always follow Plan → Build → Verify
- Never implement multiple features at once
- Keep scope minimal
- Prioritize production quality, reliability, and user experience

---

## Pipeline Rules
- Do not break the recommendation pipeline (analyze → find-products → generate-styled-room)
- Do not modify API response shapes without updating client consumers
- Keep UI stable — test after every backend change

---

## Implementation Guidelines
- One task per prompt
- Do not refactor unrelated code
- Validate functionality after each step
- Keep components modular

---

## Architecture Notes
- 2-step analysis: GPT-4o vision (detail: high) → GPT-4o-mini text recommendations
- Image generation fallback chain: Imagen 3 → Flux Kontext → gpt-image-1
- AI fallback: OpenAI → Gemini → Mock data
- Server-side image optimization with sharp (1536px max)
- SSE streaming from /api/analyze (cache hits return plain JSON)
- Content cache by image hash (1hr TTL, 100 entries)

---

## Key Files
- `src/lib/image.ts` — sharp optimization + hashing
- `src/lib/image-gen.ts` — multi-provider image generation
- `src/lib/prompt.ts` — split vision + recommendation prompts
- `src/lib/schema.ts` — types + OpenAI/Gemini JSON schemas
- `src/lib/validate.ts` — server + client validators
- `src/app/api/analyze/route.ts` — SSE streaming analysis
- `src/app/api/generate-styled-room/route.ts` — image editing
- `src/app/api/find-products/route.ts` — SerpAPI product search

---

## Anti-Patterns (Avoid)
- Adding multiple features at once
- Breaking existing API response shapes
- Hardcoding room types (room type is auto-detected)
- Sending unoptimized images to APIs
- Using `detail: "low"` on vision calls
