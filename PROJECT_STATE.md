# PROJECT STATE

## Current Milestone
ML Pipeline Optimization

---

## Done Means
- 2-step analysis pipeline (GPT-4o vision + GPT-4o-mini recommendations)
- Server-side image optimization with sharp
- SSE streaming from /api/analyze
- Content caching by image hash
- Multi-provider image generation (Imagen 3 → Flux → gpt-image-1)
- Room type auto-detection (no bedroom hardcoding)
- Gemini fallback with JSON schema enforcement
- Price sum validation
- No TypeScript build errors

---

## Completed
- UI shell
- API integration (analyze, find-products, generate-styled-room)
- JSON validation + price sum check
- Recommendation rendering
- Loading + error states
- Supabase auth with Google OAuth
- Usage limits (5 free generations)
- PostHog analytics
- HEIC conversion support
- 2-step analysis pipeline
- Sharp image optimization
- SSE streaming
- Content caching
- Multi-provider image generation abstraction
- Positive-framing prompts
- Room-type-agnostic prompts

---

## Next Tasks
1. Test Imagen 3 with real GOOGLE_API_KEY
2. Test Flux Kontext with real REPLICATE_API_TOKEN
3. Verify SSE streaming end-to-end in browser
4. Replace SerpAPI with direct product search solution

---

## Later
- AR/3D preview for recommended items
- Multiple item placement
- Save designs
- Advanced product APIs
