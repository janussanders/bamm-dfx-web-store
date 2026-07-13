# DDR-040: Feature image lightbox (Free Learn More + Premium View)

**Date:** 2026-07-13  
**Status:** Implemented  
**Parent:** [DDR-037](DDR-037-Free-Features-Marketing-Images.md), [DDR-039](DDR-039-Feature-Image-List-Query-Overflow.md)  
**Surfaces:** Homepage BAMM Basic Learn More; `/premium` Select Premium Features cards  
**Out of scope:** Admin Features Management thumbnails; Motoko/backend; Stripe/RESEND/entitlement APIs

## Problem

Marketing screenshots for Free (Learn More) and Premium cards are hard to inspect at card size. Operators want:

1. A **larger popup** when the user intentionally views an image (Free or Premium).
2. On **Premium**, the card’s primary job remains **select for payment**; image inspection must not toggle selection by accident.
3. On Premium image hover, a centered **“View”** chip that opens the lightbox.
4. Premium thumbnails should be **more visible** in the card layout.

Must not break Stripe checkout, cart selection, bundles, RESEND, or Admin upload workflows.

## Decision

### Frontend-only lightbox

Ship a shared presentational component (e.g. `FeatureImageLightbox` + thin `FeatureImagePreview` wrapper) using the existing shadcn `Dialog`. No Motoko changes, no new candid methods, no Admin API changes.

Image bytes continue to come from:

| Path | Source |
|------|--------|
| List metadata | `getPremiumFeatures` / `getCoreFeatures` (images stripped — DDR-039) |
| Display bytes | `getFeatureImage(featureId)` via `useFeatureImage` / `FeatureImageThumb` |

The lightbox shows the **same** bytes already loaded for the thumbnail (or refetches `getFeatureImage` if needed). Do **not** add a second storage path or higher-res upload pipeline in this DDR.

### Interaction model

#### Premium (`PremiumProducts.tsx`)

Today the entire `Card` uses `onClick → handleFeatureToggle` (selection for Stripe line items). That conflicts with “click image to view.”

| Region | Behavior |
|--------|----------|
| Card chrome (title, price, description, radio affordance) | Unchanged — click toggles selection |
| Image preview region | **Does not** toggle selection |
| Hover over image (pointer fine) | Centered **View** chip fades in |
| Activate View (click chip or image) | `stopPropagation` → open lightbox |
| Keyboard | Image region is focusable; Enter/Space opens View (not toggle) |
| Touch | No hover; show a persistent small View control on the image (or first tap opens View — prefer persistent chip on coarse pointers via `matchMedia('(hover: hover)')`) |

Implementation sketch:

```tsx
// Card keeps selection onClick on non-image areas OR:
// Card onClick = toggle, image wrapper onClick = (e) => { e.stopPropagation(); openLightbox(); }
```

Preferred structure:

1. Keep card `onClick` for selection on header/description/radio.
2. Wrap the image in a `button`/`div` with `onClick={(e) => { e.stopPropagation(); open(); }}`.
3. Overlay absolute-centered View chip (`pointer-events-none` on chip label; parent handles click).
4. Lift lightbox state to page level (one dialog instance): `{ featureId, alt, bytes } | null`.

#### Free (Landing Learn More)

Images are not inside a payment card. Clicking the image opens the same lightbox. Optional hover View chip for consistency; click-anywhere-on-image is enough.

Do not change Learn More accordion toggle, Download CTA, or navigate-to-premium buttons.

### Visual treatment (Premium visibility)

Without changing brand system defaults:

- Raise preview max height (e.g. `max-h-64` → `max-h-80` or `min-h-[12rem]` with `object-contain`).
- Slightly stronger preview frame (`border border-border/50`, `bg-muted/40`).
- Keep aspect natural (`object-contain`); do not crop UI screenshots with `object-cover`.
- View chip: compact pill, primary/secondary contrast, centered; visible on hover (desktop) / always on touch.

Lightbox dialog:

- Large dialog (`max-w-4xl` / nearly full viewport on mobile).
- Image `object-contain`, full width inside dialog.
- Title = feature name; close via Dialog close / Escape / overlay click.
- No “Add to cart” or checkout controls inside the lightbox (avoids Stripe confusion).

### Shared component API (suggested)

```tsx
type FeatureImagePreviewProps = {
  featureId: string;
  alt: string;
  embedded?: Uint8Array;
  /** When true, show View chip + open lightbox; never used for selection. */
  enableLightbox?: boolean;
  /** Premium card: stopPropagation so parent selection onClick is untouched. */
  isolateClicks?: boolean;
  className?: string;
  maxPreviewClassName?: string; // e.g. max-h-80
};
```

Page owns:

```tsx
const [lightbox, setLightbox] = useState<null | { alt: string; bytes: Uint8Array }>(null);
```

### Workflow safety locks

| Workflow | Lock |
|----------|------|
| Stripe Checkout / `selectedFeatures` / bundles | Image View must `stopPropagation`; no changes to `handleFeatureToggle`, checkout session creation, success/cancel URLs |
| RESEND / trial email / license delivery | Untouched |
| Admin Features Management upload/remove/init | Untouched (no lightbox required in Admin for this DDR) |
| DDR-039 image size / `getFeatureImage` | Reuse existing hooks; do not re-embed blobs into list queries |
| IC0503 / Motoko | Frontend-only deploy (`canisters=frontend`) |

### Accessibility

- View control has accessible name: `View larger image of {featureName}`.
- Dialog labeled with feature name.
- Focus trap via existing Dialog primitive; restore focus to View control on close.
- Do not open lightbox when no image bytes.

### Non-goals

- Separate “hi-res” asset upload in Admin.
- Zoom/pan library, carousels, or multi-image galleries.
- Changing Premium copy, prices, or disclaimer text.
- Opening lightbox from Admin table thumbnails (can follow later).

## Implementation plan (when approved)

1. Add `FeatureImageLightbox` (Dialog) + enhance `FeatureImageThumb` / new `FeatureImagePreview` with View overlay + `isolateClicks`.
2. Wire Premium cards: isolate image clicks; bump preview size; page-level lightbox state.
3. Wire Landing Learn More Free images to the same lightbox.
4. Manual QA checklist (below).
5. Frontend-only deploy (DDR-038). Update this DDR status → Implemented.

## Test plan

- [ ] Premium: click title/description/radio → selection toggles; cart/Stripe path unchanged.
- [ ] Premium: hover image → View chip; click View/image → lightbox; selection **unchanged**.
- [ ] Premium: Escape/overlay closes lightbox; can still checkout with selection.
- [ ] Premium: bundle mode still dims/disables à-la-carte as today.
- [ ] Free Learn More: click image → lightbox; accordion and Download unaffected.
- [ ] Features without images: no View chip / no empty dialog.
- [ ] Touch device: View still reachable without relying on hover.
- [ ] Admin upload / Initialize / Recover list still work (smoke).
- [ ] No Motoko deploy required for this feature.

## Homepage Free images vs Premium (follow-up)

Premium cards mount `FeatureImagePreview` only after `getPremiumFeatures` returns, so `embedded` is available on first image query. Homepage Free mounted previews immediately and raced a null `getFeatureImage` cache before `getCoreFeatures` embedded bytes arrived — images appeared after Admin upload (query invalidate) but vanished on refresh. Fix: prefer embedded bytes; wait for `listSettled` before network fetch.
