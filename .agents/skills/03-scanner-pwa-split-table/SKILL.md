---
name: scanner-pwa-split-table
description: Use for Teammate 3 tasks: frontend/src/components/ScannerDropzone.jsx, frontend/src/components/InvoiceEditorTable.jsx, and Google Stitch MCP table layouts.
---

<LANE_3_CONSTRAINTS>
1. STRICT FILE OWNERSHIP: Only edit `frontend/src/components/ScannerDropzone.jsx` and `frontend/src/components/InvoiceEditorTable.jsx`.
2. LOW-END PHONE CAMERA COMPRESSION: Use `<input type="file" accept="image/*" capture="environment" />` piped into an offscreen HTML5 `<canvas>` that resizes max dimension to `1280px` and exports `image/jpeg` at `0.72` quality (~150KB) before upload.
3. SPLIT-SCREEN WORKBENCH & DEMO SEEDER:
   - Left Pane: Toggle/Slider between Raw Kacha Bill and OpenCV CLAHE Shadow-Removed Image, plus a 1-click "Judge Demo Slip Switcher" (Kirana Slip, Punjab Cloth Slip, Gupta Hardware Slip).
   - Right Pane: Interactive GST Table with Sector Pill Badge, HSN `top_3_alternatives` dropdown, inline Quantity/Rate editing calling `POST /api/recalculate`, and tabular monospace numbers (`font-variant-numeric: tabular-nums`).
</LANE_3_CONSTRAINTS>
