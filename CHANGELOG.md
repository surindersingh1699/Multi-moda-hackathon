# Changelog

All notable changes to **Roomify** are documented here.

---

## 2026-03-30

### Usage Limits & Monetization
- Enforce auth and track usage in Supabase — 5 free generations per user
- Show a banner when the limit is reached prompting users to join the waitlist

### Authentication
- Add Supabase auth with Google OAuth sign-in
- Add AuthProvider context, AuthModal component, auth callback route
- Add session-refreshing middleware
- Set up client-side, server-side, and middleware Supabase clients

### Analytics
- Add PostHog analytics with typed event tracking
- Track `page_view`, `upload_photo`, and `generate_room` events
- Stub functions for validation events (`hit_limit`, `waitlist`, `would_pay`)
- Skip tracking on localhost to keep dev activity out of dashboards

### Image Handling
- Add HEIC/HEIF support — auto-convert iPhone/Samsung photos to JPEG client-side via `heic2any`
- Detect image dimensions from PNG/JPEG headers and pick matching `gpt-image-1` size (landscape/portrait/square)
- Remove DALL-E 3 fallback in favor of clean error on `gpt-image-1` failure

---

## 2026-03-28

### Branding & Landing Page
- Rebrand to **Roomify** with integrated landing hero, how-it-works section, and floating doodle background
- Polish UI copy — more conversational and friendly microcopy
- Add sticky branded header, tech-stack footer, and Share My Makeover button (Web Share API with clipboard fallback)

### AI Pipeline
- Switch to image-only based room analysis pipeline (analyze route, prompt, schema, validation)
- Add Google Gemini as fallback when OpenAI is unavailable
- Add `/api/analyze` endpoint for AI room analysis
- Add data layer: schema, validation, prompt, and mock data

### Shopping Agent
- Add AI shopping agent with real product matching via Amazon
- Add Google Shopping fallback when Amazon search yields no results
- Product thumbnails, real prices, buy-now links, copy shopping list button

### UX & Animations
- Add celebration effects: confetti burst and audio chime on results reveal
- Add progressive step indicators replacing static loading spinner
- Sync loading animation, celebration, and results reveal timing
- Buffer API results and speed up remaining loading steps once API responds
- Add "Try a Different Vibe" quick reroll buttons (Cozy Hygge, Minimalist, Boho Chic, Dark Academia, Cottagecore)
- Add `fadeSwap` animation for smooth loading step transitions

### Core Components
- Add image upload component with drag-and-drop, validation (JPEG/PNG/WebP, 4MB max), live preview
- Add results display with room reading, style direction, item cards, priority/price/store badges, Amazon links, budget progress bar
- Add interactive room decorator with canvas-based drag-and-drop item placement
- Add app shell with main page and root layout, state machine (idle/loading/error/results)

### AR Infrastructure (Level 2 Foundation)
- Add supported category definitions (plants, lighting)
- Add category-to-model mapping and AR eligibility helper
- Add GLB 3D models for plant and lamp

### Design System
- Add terracotta theme with design tokens and animations
- Add doodle SVG illustration components (bears, stars, sparkles)

### Infrastructure & Config
- Add project config and build setup (Next.js, Tailwind, TypeScript)
- Add Unkey rate limiting (10 req/60s) — later removed to fix 401 errors on Vercel
- Add `.vercel` to gitignore
- Add test fixture images for room analysis scenarios
- Add project documentation: CLAUDE.md, PROJECT_STATE.md, spec.md

### Documentation
- Add project README with setup guide and API docs
