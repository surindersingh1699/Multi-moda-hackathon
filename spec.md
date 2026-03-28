# Project: Budget Cozy Bedroom Stylist

## Overview
A web app that analyzes a bedroom photo and suggests affordable items to make it feel cozy and warm within a $150 budget.

---

## Level 1 MVP (Completed)
- Upload bedroom photo
- Send image to model
- Receive structured JSON recommendations
- Validate response
- Render polished UI with:
  - room reading
  - style direction
  - item cards
  - buy order
  - total cost

---

## Level 2 AR MVP (Current Focus)

### Goal
Allow users to preview one recommended item in their room using 3D preview and AR.

### User Flow
1. User uploads bedroom photo
2. App generates recommendations
3. User selects one item (plant or lamp)
4. User opens preview:
   - Desktop → 3D preview
   - Mobile → AR mode (if supported)
5. User places item in their space (AR)

---

## Supported Categories (Level 2)
- plant
- lighting (lamp)

---

## Requirements
- Support only one item at a time
- Add 3D preview before AR
- Use simple AR integration (no custom engine)
- Provide fallback for unsupported devices

---

## Non-Goals (Important)
- Multiple items in AR
- Room measurement or scaling accuracy
- Wall detection or anchoring
- Occlusion or advanced realism
- Real product inventory APIs
- Full interior redesign

---

## Definition of Done
- User can preview item in 3D
- AR works on supported mobile devices
- Fallback preview works everywhere
- Level 1 functionality remains intact