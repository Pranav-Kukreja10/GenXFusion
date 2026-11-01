# 🇮🇳 TrueTax AI (GenXFusion)

### AI-Powered Vernacular Invoice Intelligence, HSN Semantic Audit & GST Automation Platform

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3+-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-33%20Passing%20(100%25)-success.svg)](./test_all.py)
[![Compliance](https://img.shields.io/badge/CBIC%20GST-Compliant-emerald.svg)](https://cbic.gov.in)

> **Problem Statement #25 — Vernacular OCR Handwritten Invoice-to-GST Formatter**  
> Transform unstructured, regional-language handwritten *kacha* bills into verified, audit-ready, and statutory GST-compliant digital records with automated HSN classification, mathematical auditing, and official GSTR-1 JSON filing exports.

---

## 📌 Executive Summary

Over 65 million micro, small, and medium enterprises (MSMEs) and local retailers across India—from rural Kirana grocers and textile merchants to hardware distributors—rely on informal handwritten slips (*kacha parchi*). These paper receipts are written in regional Indian scripts (Hindi, Hinglish, Gujarati, Tamil, etc.), contain shorthand notation, use non-standard units (*nag, thaan, bori, peti*), and suffer from arithmetic calculation slips and missing statutory details.

**TrueTax AI** bridges the informal paper economy and India's formal Goods and Services Tax (GST) framework through a high-throughput, multi-stage automated pipeline:
1. **Intelligent Vernacular Ingestion**: Normalizes poor camera angles, uneven lighting, and harsh shadows.
2. **Vision OCR & Algebraic Self-Healing**: Accurately extracts messy handwritten entries, correctly resolving rupee-slash merges and non-standard Hindi units.
3. **Sub-2.5ms HSN Vector Classification**: Matches vernacular item names to the national 8-digit HSN catalogue with dynamic GST slab threshold enforcement (e.g., apparel > ₹1,000 auto-upgraded from 5% to 12%).
4. **Mathematical Audit & Doubt Engine**: Catches arithmetic discrepancies, flags lumpsum ambiguities with explicit verification doubts, and prevents silent hallucination.
5. **Precision GST Ledger & Compliance Suite**: Validates 15-character GSTINs using the official Indian Mod-36 checksum, recalculates intra-state (CGST+SGST) vs. inter-state (IGST) taxes in real time, and exports print-ready standard Tax Invoices and official GSTR-1 JSON.

---

## 🏗️ System Architecture

```text
                           ┌───────────────────────────────┐
                           │      HANDWRITTEN BILL         │
                           │   (Photo / Scan / Upload)     │
                           └───────────────┬───────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: ADAPTIVE IMAGE PREPROCESSING (OpenCV & Pillow)                                │
│ • Illumination leveling & shadow removal                                               │
│ • Adaptive binarization & edge-preserving contrast enhancement                         │
│ • SHA-256 invoice tamper-proofing & cryptographic fingerprinting                       │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: MULTIMODAL VERNACULAR EXTRACTION & ALGEBRAIC RECONSTRUCTION                   │
│ • Multi-model cascade (Gemini 2.5 Flash / Flash-Lite / Pro)                            │
│ • Shorthand vernacular parsing (Hindi, Hinglish, numerals, regional symbols)           │
│ • Algebraic Self-Healing Engine: Resolves merged rupee slashes & unit artifacts        │
│ • Struck-out / scratched item separation                                               │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: SEMANTIC HSN CLASSIFICATION & DYNAMIC TAX RULES                               │
│ • Sub-2.5ms hybrid semantic token-vector ranking across national HSN master            │
│ • Priority order: Written HSN > Exact Match > Semantic Similarity > LLM Fallback      │
│ • Dynamic CBIC Statutory Threshold Rules:                                              │
│     - Apparel / Garments: ≤ ₹1,000 @ 5% GST  │  > ₹1,000 @ 12% GST                    │
│     - Footwear:           ≤ ₹1,000 @ 12% GST │  > ₹1,000 @ 18% GST                    │
│ • Sector auto-detection (Textiles, FMCG/Kirana, Construction, Hardware, Pharma, Auto) │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: MATHEMATICAL AUDIT & ZERO-SILENT-HALLUCINATION DOUBT ENGINE                   │
│ • Line item arithmetic verification: (Quantity × Unit Price) vs Written Line Total     │
│ • Discrepancy isolation & one-click single-line and batch reconciliation               │
│ • Doubt Engine: Flags unpriced lumpsum bills without silent fabricated rates           │
│ • Mod-36 Checksum Validation on 15-character Indian GSTINs                             │
│ • Place of Supply Routing: Intra-State (50/50 CGST+SGST) vs Inter-State (100% IGST)   │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 5: EDITORIAL LEDGER WORKSPACE & STATUTORY EXPORTS                                │
│ • High-contrast monochrome workspace with Segoe UI curved typography                   │
│ • Scroll-independent, always-visible Top Navigation & Action Bar                       │
│ • Live interactive ledger editing with sub-5ms arithmetic recalculation                │
│ • One-Click Outputs:                                                                   │
│     ├── Official GSTR-1 JSON (B2B Table 4A & B2CS Table 7)                             │
│     ├── Print-Ready Standard GST Tax Invoice (with HSN tax summary & INR words)        │
│     └── Multi-GSTIN Merchant Branch Switcher & Profile Khata                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Technical Capabilities

### 1. Algebraic Self-Healing Vision OCR
Handwritten Indian bills frequently contain merged text artifacts such as `"@ 265/="` where the rupee slash character (`/`) gets OCR-misread as a digit `1` or `7` (turning `₹265` into `₹2,651`), or Hindi unit suffixes attached directly to numbers (e.g., `95बैग` merged as `956`). The TrueTax AI algebraic engine cross-references written line totals, quantities, and rates to self-heal and isolate transcription errors prior to tax computation.

### 2. Zero-Silent-Hallucination Doubt Engine
Unlike generic OCR solutions that silently invent placeholder prices when faced with incomplete slips, TrueTax AI adheres to a strict statutory audit policy. If a bill contains a lumpsum amount with unitemized items, or missing critical fields (such as Supplier GSTIN or Invoice Date), the engine returns structured `pending_doubts` requiring user sign-off or one-click proportional allocation.

### 3. Dynamic Statutory CBIC Slabs
Under Indian GST Law, certain goods undergo statutory rate jumps depending on the unit transaction price. TrueTax AI automatically tracks and executes dynamic tax threshold upgrades:
* **Garments & Apparel**: Items priced ≤ ₹1,000 stay at 5% GST; items priced > ₹1,000 are automatically upgraded to 12% GST with an audit citation.
* **Footwear**: Items priced ≤ ₹1,000 stay at 12% GST; items priced > ₹1,000 upgrade to 18% GST.

### 4. Official Indian Mod-36 GSTIN Validation
All 15-character Goods and Services Tax Identification Numbers (GSTIN) are checked against the statutory Government of India Mod-36 checksum algorithm (character set `0-9A-Z` with prime factor 36), detecting transcription typos before invoice generation.

### 5. GSTR-1 JSON & Standard Tax Invoice
* **GSTR-1 JSON Export**: Directly uploadable to the GST Common Portal, categorizing supplies into **B2B** (registered buyers with GSTIN) and **B2CS** (unregistered retail consumers) with complete HSN summaries.
* **Print-Ready Tax Invoice**: Formatted according to Rule 46 of the CGST Rules, 2017, including bilingual headers, supplier/buyer GSTIN details, HSN tax summary tables, odd-paisa rounding rules, and totals spelled out in words using the Indian numbering system (*Lakhs & Crores*).

---

## 💻 Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 8.3 | Ultra-fast client, reactive state management |
| **Styling** | Tailwind CSS 4.0 | Sleek high-contrast monochrome design system |
| **Backend** | Python 3.10+, FastAPI | Async REST API, Pydantic schema validation |
| **Vision & AI** | Google Gemini API | Multimodal vernacular handwriting extraction |
| **Image Processing** | OpenCV (cv2), Pillow, NumPy | Illumination leveling, contrast enhancement |
| **Classification** | Hybrid Token-Vector Engine | Sub-2.5ms semantic HSN catalogue matching |
| **Data Engine** | Pandas, SQLite, SQLAlchemy | HSN master directory & multi-branch merchant store |
| **Auth & Security** | JWT (PyJWT), Passlib (Bcrypt) | Merchant profile & secure session management |
| **Testing** | Node Test Runner, Pytest | 33 automated tests across frontend and backend |

---

## 📂 Repository Directory Structure

```text
Graviton/
├── backend/
│   ├── auth_db.py              # SQLite merchant auth & multi-GSTIN branches
│   ├── gst_validator.py        # Mod-36 GSTIN validation & statutory compliance checks
│   ├── gstr1_exporter.py       # Official GSTR-1 JSON builder (B2B & B2CS)
│   ├── hsn_matcher.py          # Semantic HSN search & dynamic rate rules
│   ├── image_preprocessor.py   # OpenCV contrast enhancement & SHA-256 fingerprinting
│   ├── main.py                 # FastAPI application & REST router endpoints
│   ├── math_auditor.py         # Algebraic self-healing & line-item arithmetic auditor
│   ├── schemas.py              # Pydantic models for shared 4-lane data contract
│   └── vision_router.py        # Gemini multimodal vernacular OCR cascade
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActionBar.jsx             # Fixed scroll-independent action toolbar
│   │   │   ├── AlertBar.jsx               # Arithmetic discrepancy banner
│   │   │   ├── AuthModal.jsx              # Merchant multi-branch modal
│   │   │   ├── CustomDropdown.jsx         # Accessible keyboard-navigable dropdown
│   │   │   ├── DashboardPage.jsx          # Full audit workspace split view
│   │   │   ├── Header.jsx                 # Fixed glassmorphic navigation bar
│   │   │   ├── InvoiceDetailsStrip.jsx    # Supplier, Buyer & POS compliance form
│   │   │   ├── LandingPage.jsx            # Modern bill upload & scanning intake
│   │   │   ├── LedgerTable.jsx            # Responsive zero-horizontal-scroll item table
│   │   │   ├── LineItemRow.jsx            # Individual editable audited line row
│   │   │   ├── PakkaInvoiceModal.jsx      # Printable standard GST Tax Invoice
│   │   │   ├── ScanConversion.jsx         # 4-stage bill processing visualizer
│   │   │   ├── SummaryCards.jsx           # 4 primary financial KPI metric cards
│   │   │   ├── VerificationQueue.jsx      # Structured Doubt Engine resolution queue
│   │   │   └── VisualInspector.jsx        # Receipt photo viewer with zoom & pan
│   │   ├── context/                       # Auth, Bills, and Theme state contexts
│   │   ├── services/                      # API client service layer
│   │   └── utils/                         # GST math, states, UQC & testing utilities
│   ├── package.json
│   └── vite.config.js
│
├── data/
│   ├── hsn_master.csv          # Comprehensive national HSN master catalogue
│   ├── parchisetu.db           # SQLite database
│   └── truetax.db              # Active merchant & audit database
│
├── test_all.py                 # 8-stage end-to-end backend integration test suite
├── test_comprehensive_suite.py # 12-stage statutory compliance & edge-case test suite
├── requirements.txt            # Python backend dependencies
├── .env.example                # Sample environment configuration
└── README.md
```

---

## 🚀 Quickstart Guide

### Prerequisites
* **Python 3.10+**
* **Node.js 18+ & npm**
* **Google Gemini API Key** ([Get one here](https://aistudio.google.com/))

---

### Step 1: Clone & Configure

```bash
# Clone the repository
git clone https://github.com/Pranav-Kukreja10/GenXFusion.git
cd GenXFusion

# Create your .env file
cp .env.example .env
```

Open `.env` in your text editor and provide your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
HOST=127.0.0.1
PORT=8000
DEBUG=True
```

---

### Step 2: Backend Setup & Launch

```bash
# Create and activate a Python virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Windows (CMD):
venv\Scripts\activate.bat

# Linux / macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
* **API Server**: `http://127.0.0.1:8000`
* **Interactive Swagger UI**: `http://127.0.0.1:8000/docs`
* **Alternative ReDoc**: `http://127.0.0.1:8000/redoc`

---

### Step 3: Frontend Setup & Launch

Open a second terminal:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
* **Web Application**: `http://localhost:5173`

---

## 📡 Comprehensive API Reference

All backend endpoints are built using FastAPI with strict Pydantic data validation and CORS support.

### 1. Invoice Processing & Auditing
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/invoice/parse` | Upload bill image (multipart/form-data) or sample preset for full OCR, HSN audit, and tax calculation. *(Alias: `/api/scan-bill`)* |
| `POST` | `/api/v1/invoice/recalculate` | Live recalculation of line totals, tax slabs, and intra/inter-state tax allocations. *(Alias: `/api/recalculate`)* |
| `POST` | `/api/v1/invoice/export-gstr1` | Generate official Indian GSTR-1 JSON ready for GST portal upload. *(Alias: `/api/export-gstr1`)* |

### 2. Statutory Validation & Catalogue Search
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/hsn/search` | Search 360+ national HSN codes with live vector similarity (`?q=cement&limit=10`). |
| `GET` | `/api/v1/gst/validate-gstin` | Validate 15-digit GSTIN using the official Mod-36 checksum algorithm (`?gstin=03AAEPG1807C1ZM`). |
| `GET` | `/api/v1/gst/demo-gstin` | Generate a verified Indian demo GSTIN for testing specific states and business entities. |
| `GET` | `/api/v1/gst/next-invoice-number` | Query or generate the next compliant sequential invoice number under Rule 46(b). |
| `GET` | `/api/v1/health` | Live system health check verifying OpenCV, HSN engine, and database status. *(Alias: `/health`)* |

### 3. Merchant Profile & Multi-GSTIN Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new merchant account with email/phone and password. |
| `POST` | `/api/v1/auth/login` | Authenticate merchant and issue JWT bearer token. |
| `GET` | `/api/v1/auth/me` | Fetch active merchant profile and configured business details. |
| `POST` | `/api/v1/auth/gstins` | Add and manage branch GSTINs across multiple Indian states. |
| `POST` | `/api/v1/auth/gstins/default` | Switch active default branch GSTIN for printed invoices. |

---

## 🧪 Testing & Verification

The platform maintains an automated test suite across both frontend and backend to guarantee arithmetic fidelity, checksum accuracy, and zero functional regression.

### Running Backend Integration Tests
Execute the end-to-end integration and statutory compliance suites:

```bash
# Run the 8-stage integration test suite
python test_all.py

# Run the 12-stage statutory compliance and edge-case test suite
python test_comprehensive_suite.py
```

**Test Coverage Highlights:**
* ✅ **Mod-36 Checksum**: Tests valid and corrupt GSTINs against the official 36-character prime modulus.
* ✅ **Algebraic Self-Healing**: Verifies accurate extraction of merged Hindi unit characters and rupee slashes.
* ✅ **CBIC Slabs**: Tests automatic rate switching (5% vs 12% on apparel, 12% vs 18% on footwear).
* ✅ **Intra vs Inter-State**: Validates sub-5ms switching between 50/50 CGST+SGST and 100% IGST.
* ✅ **GSTR-1 JSON Structure**: Verifies exact schema compliance for Table 4A (B2B) and Table 7 (B2CS).

---

### Running Frontend Tests & Production Build
Run the frontend unit tests and production build verification:

```bash
cd frontend

# Run 21 unit tests (Node.js native test runner)
npm test

# Run code style and lint check
npm run lint

# Compile production bundle
npm run build
```

**Frontend Test Suites:**
* ✅ **GST Calculation & Live Rounding**: Validates odd-paisa round-off distribution to CGST, exempt items, and live recalculation sync.
* ✅ **Scan Stages Engine**: Validates stage progression timing, reduced-motion paths, and accessible screen-reader announcements.
* ✅ **Bills State & Routing Logic**: Verifies independent invoice state isolation, preset loading, and ID retrieval.

---

## 📄 GSTR-1 JSON Output Schema

When exporting from the dashboard or via `POST /api/v1/invoice/export-gstr1`, the output adheres to the official GST Common Portal specification:

```json
{
  "gstin": "03AAEPG1807C1ZM",
  "fp": "112026",
  "gt": 2688.0,
  "cur_gt": 2688.0,
  "b2b": [
    {
      "ctin": "03BBBPA9999D1ZK",
      "inv": [
        {
          "inum": "INV-2026-001",
          "idt": "01-11-2026",
          "val": 2688.0,
          "pos": "03",
          "rchrg": "N",
          "inv_typ": "R",
          "itms": [
            {
              "num": 1,
              "itm_det": {
                "txval": 2400.0,
                "rt": 12.0,
                "camt": 144.0,
                "samt": 144.0,
                "csamt": 0.0
              }
            }
          ]
        }
      ]
    }
  ],
  "b2cs": [],
  "hsn": {
    "data": [
      {
        "num": 1,
        "hsn_sc": "6204",
        "desc": "Women Suits & Ensembles",
        "uqc": "PCS",
        "qty": 1.0,
        "val": 2688.0,
        "txval": 2400.0,
        "camt": 144.0,
        "samt": 144.0,
        "csamt": 0.0
      }
    ]
  }
}
```

---

## 🔒 Security & Privacy

* **Zero Plaintext Storage**: Passwords hashed using bcrypt; API tokens secured with HMAC-SHA256 JWTs.
* **Tamper Evident Audit**: Every processed bill receives a unique SHA-256 fingerprint matching the image and line-item sequence.
* **Local First Privacy**: All HSN classifications, mathematical checks, and database records can run completely on-premise without transmitting merchant sales data to third parties.
* **Environment Isolation**: API credentials and secrets are managed via strictly ignored `.env` profiles.

---

## 🤝 Contributing

1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/NewFeature`).
3. Commit your changes (`git commit -m 'Add NewFeature'`).
4. Push to the branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Engineered by <strong>GenXFusion</strong> · Built for Indian Small Businesses & Digital GST Empowerment</sub>
</div>
