# Bharat GST Vision Engine — 4-Lane Shared Contract

## Immutable JSON Response Contract (`POST /api/scan-bill` & `POST /api/recalculate`)
All 4 teammates MUST adhere strictly to this payload structure:
```json
{
  "bill_id": "sha256_hash_string",
  "detected_sector": "TEXTILE",
  "store_name_guess": "Punjab Cloth & Readymade House",
  "raw_image_b64": "data:image/jpeg;base64,...",
  "enhanced_image_b64": "data:image/jpeg;base64,...",
  "active_items": [
    {
      "row_id": 1,
      "raw_text": "1 Wedding Lehnga/Suit @ 2400",
      "product_name_normalized": "Wedding Lehnga Suit",
      "quantity": 1.0,
      "raw_unit": "nag",
      "standard_uqc": "PCS",
      "unit_price": 2400.0,
      "written_line_total": 2400.0,
      "audited_line_total": 2400.0,
      "has_math_error": false,
      "math_discrepancy": 0.0,
      "hsn_code": "6204",
      "category_description": "Women Suits & Ensembles",
      "gst_rate": 12.0,
      "cgst_rate": 6.0,
      "sgst_rate": 6.0,
      "cgst_amount": 144.0,
      "sgst_amount": 144.0,
      "total_with_tax": 2688.0,
      "confidence": 0.91,
      "tax_rule_note": "Garment > ₹1,000: Auto-upgraded from 5% to 12% GST",
      "top_3_alternatives": [
        {"hsn_code": "6204", "label": "Readymade Suit/Lehnga (5%/12%)", "gst_rate": 12.0},
        {"hsn_code": "5208", "label": "Unstitched Cotton Fabric (5%)", "gst_rate": 5.0}
      ]
    }
  ],
  "struck_out_items": [
    {"raw_text": "2 mtr Astar Kapda - 160 (cut)", "written_line_total": 160.0}
  ],
  "summary": {
    "written_grand_total": 2400.0,
    "audited_taxable_total": 2400.0,
    "total_math_saved": 0.0,
    "total_cgst": 144.0,
    "total_sgst": 144.0,
    "final_payable_pakka_total": 2688.0
  }
}
```

## 4-Person File Ownership Lock (Never Cross Lanes!)

* **Lane 1:** `backend/main.py`, `backend/schemas.py`, `backend/vision_router.py`, `backend/image_preprocessor.py`
* **Lane 2:** `backend/data/hsn_master.csv`, `backend/hsn_matcher.py`, `backend/math_auditor.py`, `backend/gstr1_exporter.py`
* **Lane 3:** `frontend/src/components/ScannerDropzone.jsx`, `frontend/src/components/InvoiceEditorTable.jsx`
* **Lane 4:** `frontend/src/components/AuditAlertsCard.jsx`, `frontend/src/components/PakkaInvoiceModal.jsx`
