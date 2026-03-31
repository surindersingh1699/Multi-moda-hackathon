# Project: Roomify — AI Room Stylist

## Overview
A web app that analyzes any room photo and suggests affordable styling items to transform the space within the user's budget ($50–$150).

---

## Level 1 MVP (Completed)
- Upload room photo
- AI vision analysis with room type auto-detection
- 2-step pipeline: GPT-4o vision → GPT-4o-mini recommendations
- Structured JSON recommendations with validation
- Render polished UI with:
  - room reading
  - style direction
  - item cards
  - buy order
  - total cost
- SSE streaming for progressive results
- Content caching for repeat uploads
- Multi-provider image generation (Imagen 3 → Flux → gpt-image-1)

---

## Supported Room Types
- Bedroom
- Living room
- Kitchen
- Bathroom
- Office
- Studio
- Any room (auto-detected by GPT-4o vision)

---

## Requirements
- Budget validation (sum of item prices must match total within 10%)
- Server-side image optimization (sharp, 1536px max)
- Graceful fallbacks at every level (OpenAI → Gemini → Mock)
- Works with partial or no API keys (mock mode)

---

## Non-Goals
- Room measurement or scaling accuracy
- Wall detection or anchoring
- Occlusion or advanced realism
- Full interior redesign
- Real-time inventory tracking

---

## Definition of Done
- User uploads any room photo and gets relevant recommendations
- Room type is correctly identified
- All items are within budget
- Styled room preview generates successfully
- Product links are real and clickable
- App works with partial API keys
