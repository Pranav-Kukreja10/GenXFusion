# TrueTax AI (#25) — Design System Specification

## Brand Identity & Aesthetic
TrueTax AI is a Vernacular OCR & GST Command Center engineered for Indian small shopkeepers (Kirana, Textile, Hardware, Electronics, Medical, Auto). The visual language bridges **Indian Bahi-Khata Trust** with **Modern Calm Fintech** (inspired by Stripe, Razorpay, ClearTax):
- Precision geometry, calm balanced spacing, and zero clutter.
- Single viewport fit with `h-dvh` and zero page-scroll on landing.
- Tactile affordances with soft shadows and emerald accents.

---

## 1. Color Palette

### Primary & Accent
- **Primary Emerald:** `#059669` (Tailwind `emerald-600`)
- **Primary Hover:** `#047857` (Tailwind `emerald-700`)
- **Primary Soft Tint:** `#D1FAE5` (Tailwind `emerald-100`) / `rgba(5, 150, 105, 0.08)`
- **Accent Emerald Glow:** `rgba(5, 150, 105, 0.20)`

### Light Mode Surfaces & Text
- **Light Canvas / Background:** `#FAF8F5` (Warm Ledger Paper)
- **Light Surface / Cards:** `#FFFFFF` (Pure Card White)
- **Light Secondary Surface:** `#F4F0EA` (Muted Warm Neutral)
- **Light Border:** `#E7E2DA` (Refined Paper Border)
- **Light Text Primary:** `#0F172A` (Slate 900 Deep Ink)
- **Light Text Muted:** `#64748B` (Slate 500 Subdued Charcoal)

### Dark Mode Surfaces & Text
- **Dark Canvas / Background:** `#0B0E14` (Deep Nocturnal Canvas)
- **Dark Surface / Cards:** `#131822` (Elevated Deep Navy-Charcoal)
- **Dark Secondary Surface:** `#1B2230` (Muted Charcoal Tint)
- **Dark Border:** `#232B3A` (Subtle Ink Border)
- **Dark Text Primary:** `#E5E7EB` (Slate 200 Crisp Pure)
- **Dark Text Muted:** `#94A3B8` (Slate 400 Zinc Midtone)

### Semantics & Status
- **Warning / Alert (Threshold Triggered):** Amber `#D97706`
- **Error / Math Discrepancy:** Red `#DC2626`
- **Success / Verified:** Emerald `#059669`
- **Dark Action Button (View Dashboard):** `#1E293B` (Light) / `#0F172A` (Dark) with hover `#0F172A` / `#020617`

---

## 2. Typography Hierarchy

- **UI & Display Font:** `Inter`, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Numbers, Codes, HSN & Rupee Amounts:** `JetBrains Mono`, monospace (`tabular-nums`)

### Fluid Scaling (No-Scroll Viewport Rules)
All landing page text uses `clamp()` to seamlessly adapt between mobile (375x667) and large desktop (1440x900 / 1366x650):
- **Hero Headline:** `clamp(1.35rem, 2.5vw, 2.25rem)` (font-extrabold, tracking-tight)
- **Hero Subtitle:** `clamp(0.8125rem, 1.2vw, 1.05rem)` (font-normal, leading-snug)
- **Card Title / Prompt:** `clamp(0.95rem, 1.4vw, 1.15rem)` (font-semibold)
- **Card Meta / Hint:** `clamp(0.7rem, 0.9vw, 0.8rem)` (font-medium)
- **Button Text:** `clamp(0.8125rem, 1vw, 0.9375rem)` (font-semibold)
- **Footer Text:** `clamp(0.65rem, 0.8vw, 0.75rem)` (font-normal)

---

## 3. Elevation, Radius & Borders

- **Container Radius:** `16px` to `24px` (`rounded-2xl` to `rounded-3xl`)
- **Button & Tag Radius:** `10px` to `12px` (`rounded-xl`)
- **Upload Dropzone Border:** `2px dashed #059669` (Light) / `2px dashed #10B981` (Dark) with `12px` dash rhythm
- **Shadows:** Soft diffuse shadows:
  - Card: `0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)`
  - Dark Card: `0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.20)`

---

## 4. Component Structure & Viewport Layout

### 1. Slim Top Bar
- Shield-Check Logo inside rounded emerald square (`#059669`).
- Brand Name: "TrueTax AI" with a `#25` tag badge.
- Right Controls: Dark-Mode Toggle (Sun / Moon) and Circular User Avatar with initials ("MK") opening the profile menu.

### 2. Center Block
- Headline: "Scan a handwritten bill. Get a GST-ready invoice."
- Subtitle: "Upload a photo of a kacha bill. We read it, fix the math and apply the right GST."

### 3. Large Upload Card (~640px Max Width)
- Dashed emerald border with soft emerald tint (`#D1FAE5` at 20% opacity / dark `rgba(5,150,105,0.12)`).
- Circular emerald icon badge with Cloud-Upload.
- Primary instruction: "Drag & drop your bill photo here".
- Accepted types: "JPG, PNG, WEBP".
- Action buttons:
  - **Camera** (solid emerald `#059669`, white text, camera icon)
  - **Browse File** (outlined emerald border, emerald text, folder/file icon)

### 4. Upload Card Interactive States
1. **Idle:** Dashed border, cloud icon, camera + browse buttons.
2. **Drag-Over:** Highlighted emerald border (`#059669`), saturated soft tint, scaled-up icon.
3. **Scanning (Auto-triggers on file drop):**
   - Thumbnail preview of the receipt.
   - Animated progress bar.
   - 4-step progressive pipeline indicator:
     `Shadow removal` → `OCR` → `HSN match` → `GST audit`.
4. **Success:** Emerald verification check: "Bill scanned: 4 items found".
5. **Error:** Red alert state: "Couldn't read this photo. Try again with better light." with a retry action.

### 5. Prominent Primary Action
- Full-width dark charcoal button: "View Dashboard →" (`#1E293B` light / `#0F172A` dark).

### 6. Tiny Footer
- "GSTN Schema v3.1 compliant · Your bills stay on your device"

