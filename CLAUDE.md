# Claude Project Instructions

## Core Rules
- Always follow Plan → Build → Verify
- Never implement multiple features at once
- Keep scope minimal
- Prioritize production quality, reliability, and user experience

---

## Level 1 Rules (Still Apply)
- Do not break recommendation pipeline
- Do not modify API behavior unnecessarily
- Keep UI stable

---

## Level 2 AR Rules
- Build 3D preview BEFORE AR
- Support only ONE item at a time
- Start with plant and lamp categories only
- Do not build custom AR engine
- Use simplest integration approach
- Add fallback for unsupported devices
- Do not expand scope beyond AR preview

---

## Implementation Guidelines
- One task per prompt
- Do not refactor unrelated code
- Validate functionality after each step
- Keep components modular (ar/ folder)

---

## Folder Structure Suggestion

components/
  ar/
    ModelViewer.tsx
    ArPreview.tsx
    ArButton.tsx

public/
  models/
    plant.glb
    lamp.glb

lib/
  ar/
    utils.ts
    supportedItems.ts

---

## Testing Rules
- First test on desktop (3D preview)
- Then test on mobile (AR)
- Never debug AR before preview works

---

## Fallback Rules
- If AR fails → use 3D preview
- If model fails → show fallback UI
- If device unsupported → disable AR button

---

## Anti-Patterns (Avoid)
- Adding multiple features at once
- Breaking Level 1 flow
- Overengineering AR
- Debugging everything at once
