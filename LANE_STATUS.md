# Bharat GST Vision Engine / ParchiSetu AI — Team Handoff & Lane Status

> **Status:** 🟢 **LANE 1 & LANE 2 FULLY OPERATIONAL + LIVE COMMAND CENTER DASHBOARD DEPLOYED**  
> **Server URL:** `http://127.0.0.1:8000/` or `http://localhost:8000/`  
> **Interactive Swagger API Docs:** `http://127.0.0.1:8000/docs`

---

## 1. Summary of Completed Features

### Lane 1: Vision Gateway & CLAHE Preprocessing
- **`image_preprocessor.py`**: OpenCV LAB-space CLAHE shadow removal (`clipLimit=2.0`, `tileGridSize=(8,8)`). Generates dual image data URLs (`raw_image_b64` vs `enhanced_image_b64`) for split-screen comparison slider.
- **`vision_router.py`**: Quota-safe cascade (`gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.1-flash-lite` $\rightarrow$ `gemini-2.5-flash`) with SHA-256 caching (`ocr_cache.json` for 0 RPD re-scans in <50ms). Indian vernacular conversions for regional fractions (`Pao`, `Adha`, `Paune`, `Sawa`, `Dedh`, `Dhai`) and units (`Peti` $\rightarrow$ `BOX`, `Thaan` $\rightarrow$ `MTR`, `Nag` $\rightarrow$ `PCS`).
- **`schemas.py`**: Frozen Pydantic v2 contract supporting `bill_id`, `detected_sector`, `active_items`, `struck_out_items`, and `summary`.

### Lane 2: PyTorch HSN Vector Engine & Deterministic Math Auditor
- **`data/hsn_master.csv`**: 106 curated Indian items across 6 sectors with Hinglish aliases, including HSN `6907` Ceramic & Vitrified Tiles (18% GST).
- **Ceramic Tiles Rule**: Any items containing `tile`, `tiles`, `ceramic`, `vitrified`, `honey onyx`, `vista plano`, or from `Ceramics` merchants are mapped to HSN `6907` (18% GST, 9% CGST + 9% SGST), preventing misclassification to 2523 (Cement 28%).
- **Customer & Freight Extraction**: Supports `customer_name`, `customer_phone`, `customer_address`, `extra_charges` (Freight/Kiraya), and `discount_amount`.
- **`hsn_matcher.py`**: Neural vector matching (PyTorch `sentence-transformers/all-MiniLM-L6-v2`) + ultra-fast hybrid TF-IDF / token-vector fallback engine (<0.05ms, 100% crash-proof).
- **Conditional Indian GST Slab Rules**:
  - Textiles / Garments (HSN 61, 62, 63): Unit price $> ₹1,000 \implies 12.0\%$ GST with note `Garment > ₹1,000: Auto-upgraded from 5% to 12% GST`; Unit price $\le ₹1,000 \implies 5.0\%$ GST.
  - Footwear (HSN 64): Unit price $> ₹1,000 \implies 18.0\%$ GST; Unit price $\le ₹1,000 \implies 12.0\%$ GST.
  - Foodgrains (Atta/Rice): Loose/Khulla $\implies 0.0\%$ GST; Branded/Packaged $\implies 5.0\%$ GST.
- **`math_auditor.py`**: Deterministic discrepancy detection (`abs((qty * unit_price) - written_line_total) > 0.50`), unit price inference, and struck-out item exclusion to `struck_out_items` (₹0 GST impact).
- **`gstr1_exporter.py`**: Converts audited invoices to the official Indian Government GSTR-1 offline tool schema (`b2cs` table grouped by tax rate & intra/inter-state supply, plus `hsn` summary table).

### Live Command Center Dashboard
- **`static/index.html` (Mounted at `GET /`)**:
  - 3 Quick 1-Click Judge Demos (Textile ₹1000 rule, Hardware math error, Kirana loose vs packed).
  - OpenCV CLAHE image inspector (Raw Photo vs Shadow-Removed Scan toggle).
  - Live interactive GST table with inline Quantity/Rate editing calling `POST /api/v1/invoice/recalculate` in <5ms.
  - Red Math Alert row highlighting with 1-click **"🔧 Fix Math"** button.
  - Struck-out items exclusion card.
  - 1-click **"⬇️ Download Official GSTR-1 Portal JSON"** button.
  - 1-click **"🖨️ View & Print Pakka GST Tax Invoice"** modal with supplier/buyer details, HSN summary, and print styling.

---

## 2. API Endpoints Available Right Now

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the full-stack interactive Command Center UI |
| `GET` | `/docs` | Interactive Swagger UI API documentation |
| `GET` | `/api/v1/health` | Service health, model cascade, and Lane 2 integration status |
| `GET` | `/api/v1/hsn/search?q=...` | Live search in HSN Master Catalog (106+ items) |
| `POST` | `/api/v1/invoice/parse` *(or `/api/scan-bill`)* | Full AI OCR + CLAHE Preprocessing + Deterministic Tax Audit |
| `POST` | `/api/v1/invoice/recalculate` *(or `/api/recalculate`)* | <5ms deterministic recalculation for UI edits |
| `POST` | `/api/v1/invoice/export-gstr1` *(or `/api/export-gstr1`)* | Official GST Portal GSTR-1 JSON export |

---

## 3. Instructions for Frontend Teammates (Lane 3 & 4)
- **Local Dev Proxy**: Point your Vite/Next.js dev server proxy to `http://127.0.0.1:8000`.
- **CORS**: Configured with `allow_origins=["*"]`, all methods and headers allowed.
- **Mock Mode**: Pass `?mock=True` to `POST /api/v1/invoice/parse` anytime for rapid UI component testing without consuming API quota.

