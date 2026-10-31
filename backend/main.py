"""
main.py - Bharat GST Vision Engine / ParchiSetu AI (Lane 1 Backend)
FastAPI application for Vernacular OCR Handwritten Invoice-to-GST Formatter.

Endpoints:
1. POST /api/v1/invoice/parse (and alias /api/scan-bill)
2. POST /api/v1/invoice/recalculate (and alias /api/recalculate)
3. POST /api/v1/invoice/export-gstr1 (and alias /api/export-gstr1)
4. GET /api/v1/health (and alias /health)
"""

from __future__ import annotations
import logging
import os
import uuid
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, File, UploadFile, Query, HTTPException, Body, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("parchsetu_main")

# Internal Lane 1 Modules
from schemas import (
    RawVisionBill,
    RawVisionLineItem,
    AuditedLineItem,
    StruckOutItem,
    InvoiceSummary,
    AuditedInvoiceResponse,
    RecalculateRequest,
    GSTR1ExportRequest,
)
from image_preprocessor import preprocess_bill_image, compute_sha256
from vision_router import parse_bill_with_gemini, MODEL_FALLBACK_CASCADE
from gstr1_exporter import export_to_gstr1_json
from gst_validator import (
    validate_gstin,
    validate_invoice_compliance,
    generate_valid_gstin,
    INDIAN_STATES,
    check_and_register_invoice_number,
    generate_next_sequential_invoice_number,
    get_indian_financial_year,
)
import auth_db

# Initialize SQLite database and seed demo account with 3 multi-state branches
auth_db.init_db()

security_bearer = HTTPBearer(auto_error=False)

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> Dict[str, Any]:
    """Dependency validating HS256 JWT Bearer token and returning user profile with branches."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    token = credentials.credentials
    payload = auth_db.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid signature.")
    user_id = payload.get("user_id")
    user = auth_db.get_user_profile(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
    return user


# ============================================================================
# Dynamic Integration Hooks for Lane 2 (hsn_matcher & math_auditor)
# ============================================================================
try:
    from hsn_matcher import match_hsn_item, search_hsn_catalog
    EXTERNAL_HSN_AVAILABLE = True
    logger.info("✅ External Teammate 2 'hsn_matcher' found and imported.")
except ImportError:
    try:
        from backend.hsn_matcher import match_hsn_item, search_hsn_catalog
        EXTERNAL_HSN_AVAILABLE = True
        logger.info("✅ External Teammate 2 'backend.hsn_matcher' found and imported.")
    except ImportError:
        EXTERNAL_HSN_AVAILABLE = False
        search_hsn_catalog = None
        logger.info("ℹ️ External 'hsn_matcher' not found. Using built-in high-accuracy fallback HSN matcher.")

try:
    from math_auditor import audit_and_calculate_invoice, detect_doubts
    EXTERNAL_MATH_AVAILABLE = True
    logger.info("✅ External Teammate 2 'math_auditor' found and imported.")
except ImportError:
    try:
        from backend.math_auditor import audit_and_calculate_invoice, detect_doubts
        EXTERNAL_MATH_AVAILABLE = True
        logger.info("✅ External Teammate 2 'backend.math_auditor' found and imported.")
    except ImportError:
        EXTERNAL_MATH_AVAILABLE = False
        logger.info("ℹ️ External 'math_auditor' not found. Using built-in deterministic fallback math auditor.")
    logger.info("ℹ️ External 'math_auditor' not found. Using built-in deterministic fallback math auditor.")


# ============================================================================
# Built-In Fallback HSN Matcher & Indian GST Slab Logic (Lane 2 Fallback)
# ============================================================================

def fallback_match_hsn(
    product_name: str,
    sector: str = "GENERAL",
    unit_price: float = 0.0,
    raw_text: str = ""
) -> Dict[str, Any]:
    """
    Built-in fallback HSN matcher checking item keywords first,
    then falling back to detected_sector default 4-digit chapter head.
    """
    clean_name = product_name.lower().strip()
    raw_lower = raw_text.lower().strip()
    sector_upper = (sector or "GENERAL").upper()

    # Priority Check: Ceramic Tiles, Vitrified, Spenza, Kajaria, Flooring
    # Must ALWAYS map to HSN 6907 (18% GST), NEVER to 2523 (Cement 28%)
    is_tile_item = any(k in clean_name or k in raw_lower for k in [
        "tile", "tiles", "ceramic", "ceramics", "spenza", "vitrified",
        "onyx", "plano", "marbonite", "kajaria", "somany", "nitco", "honey onyx", "vista plano"
    ])
    if is_tile_item:
        return {
            "hsn_code": "6907",
            "category_description": "Ceramic Flags, Paving, Hearth or Wall Tiles, Vitrified Tiles",
            "gst_rate": 18.0,
            "tax_rule_note": "Ceramic & Vitrified Tiles (18% GST)",
            "top_3_alternatives": [
                {"hsn_code": "6907", "label": "6907 - Ceramic & Vitrified Tiles (18%)", "gst_rate": 18.0},
                {"hsn_code": "6802", "label": "6802 - Granite & Marble Slabs (18%)", "gst_rate": 18.0},
                {"hsn_code": "6910", "label": "6910 - Ceramic Sanitaryware (18%)", "gst_rate": 18.0},
            ],
        }

    # 1. Check Item Keywords: TEXTILES / APPAREL
    is_textile_item = any(k in clean_name for k in ["lehnga", "suit", "saree", "sari", "kurti", "fabric", "cloth", "kapda", "astar", "shirting", "pant", "jeans", "shirt", "t-shirt", "dupatta", "towel", "bedsheet"])
    
    # 2. Check Item Keywords: ELECTRONICS
    is_elec_item = any(k in clean_name for k in ["bulb", "led", "wire", "switch", "fan", "socket", "cable", "adapter", "battery"])
    
    # 3. Check Item Keywords: GROCERY
    is_groc_item = any(k in clean_name for k in ["atta", "flour", "rice", "chawal", "dal", "daal", "oil", "tel", "ghee", "sugar", "cheeni", "tea", "chai", "salt", "namkeen", "masala", "soap", "biscuit"])
    
    # 4. Check Item Keywords: HARDWARE, TIMBER, FURNITURE
    is_hard_item = any(k in clean_name or k in raw_lower for k in [
        "cement", "paint", "screw", "nut", "bolt", "pipe", "pvc", "plywood",
        "timber", "wood", "lakkad", "lakdi", "sona timber", "sofa", "chair", "table", "bed", "furniture"
    ])
    
    # 5. Check Item Keywords: MEDICAL
    is_med_item = any(k in clean_name for k in ["tablet", "paracetamol", "syrup", "capsule", "medicine", "dolo", "bandage", "crocin"])
    
    # 6. Check Item Keywords: FOOTWEAR
    is_foot_item = any(k in clean_name for k in ["shoes", "joota", "chappal", "sandals", "slippers"])

    # Determine matched category
    if is_elec_item or (not (is_textile_item or is_groc_item or is_hard_item or is_med_item or is_foot_item) and "ELECTRONIC" in sector_upper):
        if any(k in clean_name for k in ["bulb", "led", "lamp"]):
            hsn = "8539"
            desc = "LED Lamps & Electric Bulbs"
        elif any(k in clean_name for k in ["wire", "cable"]):
            hsn = "8544"
            desc = "Insulated Copper Wire & Cables"
        else:
            hsn = "8536"
            desc = "Electrical Switches & Sockets"
        return {
            "hsn_code": hsn,
            "category_description": desc,
            "gst_rate": 18.0,
            "tax_rule_note": "Standard Electricals (18% GST)",
            "top_3_alternatives": [
                {"hsn_code": "8539", "label": "LED Lamps / Bulbs (18%)", "gst_rate": 18.0},
                {"hsn_code": "8544", "label": "Electrical Wire & Cables (18%)", "gst_rate": 18.0},
                {"hsn_code": "8536", "label": "Electrical Switches (18%)", "gst_rate": 18.0},
            ],
        }

    if is_textile_item or (not (is_groc_item or is_hard_item or is_med_item or is_foot_item) and "TEXTILE" in sector_upper):
        if any(k in clean_name for k in ["lehnga", "suit", "kurti", "saree"]):
            hsn = "6204"
            desc = "Women Suits & Ensembles"
        elif any(k in clean_name for k in ["shirt", "pant", "trousers"]):
            hsn = "6203"
            desc = "Men Suits & Trousers"
        elif any(k in clean_name for k in ["cotton", "astar", "fabric", "kapda"]):
            hsn = "5208"
            desc = "Woven Cotton Fabric"
        else:
            hsn = "6204"
            desc = "Readymade Garments & Ensembles"

        # Indian GST Slab Rule for Garments:
        # If unit_price > 1000 => 12% GST; else 5% GST
        if unit_price > 1000.0:
            rate = 12.0
            rule_note = "Garment > ₹1,000: Auto-upgraded from 5% to 12% GST"
        else:
            rate = 5.0
            rule_note = "Standard Garment <= ₹1,000: 5% GST applied"

        alternatives = [
            {"hsn_code": "6204", "label": "Readymade Suit/Lehnga (5%/12%)", "gst_rate": 12.0 if unit_price > 1000 else 5.0},
            {"hsn_code": "5208", "label": "Unstitched Cotton Fabric (5%)", "gst_rate": 5.0},
            {"hsn_code": "6203", "label": "Men Readymade Apparel (5%/12%)", "gst_rate": 12.0 if unit_price > 1000 else 5.0},
        ]
        return {
            "hsn_code": hsn,
            "category_description": desc,
            "gst_rate": rate,
            "tax_rule_note": rule_note,
            "top_3_alternatives": alternatives,
        }

    if is_groc_item or (not (is_hard_item or is_med_item or is_foot_item) and "GROCERY" in sector_upper):
        is_loose = any(k in raw_lower for k in ["khulla", "loose", "bori", "katta"])
        if any(k in clean_name for k in ["atta", "flour"]):
            hsn = "1101"
            desc = "Wheat Flour / Atta"
            rate = 0.0 if is_loose else 5.0
            rule_note = "Loose Wheat Flour (0% GST)" if is_loose else "Packaged/Branded Wheat Flour (5% GST)"
        elif any(k in clean_name for k in ["rice", "chawal"]):
            hsn = "1006"
            desc = "Rice / Basmati Rice"
            rate = 0.0 if is_loose else 5.0
            rule_note = "Loose Rice (0% GST)" if is_loose else "Packaged Basmati Rice (5% GST)"
        elif any(k in clean_name for k in ["oil", "tel", "ghee"]):
            hsn = "1512"
            desc = "Edible Cooking Oil / Ghee"
            rate = 5.0
            rule_note = "Edible Oils (5% GST)"
        elif any(k in clean_name for k in ["soap", "sabun", "detergent"]):
            hsn = "3401"
            desc = "Toilet Soap & Cleaning Agents"
            rate = 18.0
            rule_note = "Standard Soap/Cleaning (18% GST)"
        else:
            hsn = "1101"
            desc = "Kirana & Food Staples"
            rate = 5.0
            rule_note = "Standard Grocery Provisions (5% GST)"

        alternatives = [
            {"hsn_code": "1101", "label": "Flour/Atta Packaged (5%)", "gst_rate": 5.0},
            {"hsn_code": "1006", "label": "Rice Packaged (5%)", "gst_rate": 5.0},
            {"hsn_code": "1512", "label": "Edible Cooking Oil (5%)", "gst_rate": 5.0},
        ]
        return {
            "hsn_code": hsn,
            "category_description": desc,
            "gst_rate": rate,
            "tax_rule_note": rule_note,
            "top_3_alternatives": alternatives,
        }

    if is_hard_item or (not (is_med_item or is_foot_item) and ("HARDWARE" in sector_upper or "TIMBER" in sector_upper)):
        # Cement (28% GST) ONLY if explicitly contains cement keywords
        if any(c in clean_name or c in raw_lower for c in ["cement", "सीमेंट", "ultratech", "ambuja", "acc cement", "birla"]):
            hsn = "2523"
            desc = "Portland Cement"
            rate = 28.0
            rule_note = "Cement (Highest 28% GST Slab)"
        elif any(t in clean_name or t in raw_lower for t in ["timber", "wood", "plywood", "lakkad", "lakdi", "sona timber", "plank", "ply"]):
            hsn = "4407"
            desc = "Wood, Timber, Plywood & Veneered Panels"
            rate = 18.0
            rule_note = "Timber & Wood Products (18% GST)"
        elif any(f in clean_name or f in raw_lower for f in ["sofa", "chair", "table", "bed", "furniture", "almirah", "wardrobe"]):
            hsn = "9403"
            desc = "Furniture, Sofas, Wooden & Metal Articles"
            rate = 18.0
            rule_note = "Furniture Articles (18% GST)"
        elif "paint" in clean_name:
            hsn = "3208"
            desc = "Paints & Varnishes"
            rate = 18.0
            rule_note = "Paints (18% GST)"
        else:
            hsn = "4412"
            desc = "Building Materials, Hardware & Panels"
            rate = 18.0
            rule_note = "Standard Hardware/Building Supplies (18% GST)"
        return {
            "hsn_code": hsn,
            "category_description": desc,
            "gst_rate": rate,
            "tax_rule_note": rule_note,
            "top_3_alternatives": [
                {"hsn_code": "4407", "label": "4407 - Sawn Timber & Wood (18%)", "gst_rate": 18.0},
                {"hsn_code": "4412", "label": "4412 - Plywood & Panels (18%)", "gst_rate": 18.0},
                {"hsn_code": "2523", "label": "2523 - Portland Cement (28%)", "gst_rate": 28.0},
            ],
        }

    if is_med_item or (not is_foot_item and "MEDICAL" in sector_upper):
        return {
            "hsn_code": "3004",
            "category_description": "Medicaments / Essential Drugs",
            "gst_rate": 12.0,
            "tax_rule_note": "Essential Pharmaceutical Drugs (12% GST)",
            "top_3_alternatives": [
                {"hsn_code": "3004", "label": "Medicaments & Tablets (12%)", "gst_rate": 12.0},
                {"hsn_code": "3005", "label": "First Aid Bandages/Dressings (12%)", "gst_rate": 12.0},
                {"hsn_code": "3002", "label": "Vaccines & Sera (5%)", "gst_rate": 5.0},
            ],
        }

    if is_foot_item or "FOOTWEAR" in sector_upper:
        rate = 18.0 if unit_price > 1000 else 12.0
        rule_note = "Footwear > ₹1,000: 18% GST" if unit_price > 1000 else "Footwear <= ₹1,000: 12% GST"
        return {
            "hsn_code": "6402",
            "category_description": "Footwear with Rubber/Plastic Outer Soles",
            "gst_rate": rate,
            "tax_rule_note": rule_note,
            "top_3_alternatives": [
                {"hsn_code": "6402", "label": "Footwear (12%/18%)", "gst_rate": rate},
                {"hsn_code": "6403", "label": "Leather Footwear (18%)", "gst_rate": 18.0},
            ],
        }

    # DEFAULT GENERAL COMMODITY
    return {
        "hsn_code": "9999",
        "category_description": "General Merchandise / Sundry Items",
        "gst_rate": 18.0,
        "tax_rule_note": "Standard Merchandise (18% GST)",
        "top_3_alternatives": [
            {"hsn_code": "9999", "label": "General Merchandise (18%)", "gst_rate": 18.0},
            {"hsn_code": "1101", "label": "Provisions/Grocery (5%)", "gst_rate": 5.0},
            {"hsn_code": "6204", "label": "Textiles (12%)", "gst_rate": 12.0},
        ],
    }


# ============================================================================
# Built-In Fallback Math Auditor & Pipeline (Lane 2 Fallback)
# ============================================================================

def fallback_audit_and_calculate_invoice(
    raw_bill: RawVisionBill,
    bill_id: str,
    enhanced_image_b64: Optional[str] = None,
    raw_image_b64: Optional[str] = None,
    model_used: str = "gemini-3.5-flash-lite",
    cache_hit: bool = False
) -> AuditedInvoiceResponse:
    """
    Built-in deterministic calculation engine to audit math and split GST.
    """
    active_items: List[AuditedLineItem] = []
    struck_out_items: List[StruckOutItem] = []

    written_taxable_sum = 0.0
    audited_taxable_total = 0.0
    total_cgst = 0.0
    total_sgst = 0.0

    for idx, item in enumerate(raw_bill.items, start=1):
        # 1. Check if line item was struck out / cancelled
        if item.is_struck_out:
            struck_out_items.append(
                StruckOutItem(
                    row_id=idx,
                    raw_text=item.raw_text_on_paper,
                    written_line_total=float(item.written_line_total),
                    reason="Crossed out or cancelled with pen markings"
                )
            )
            continue

        # 2. Extract and infer unit price if missing
        raw_text_on_paper = str(getattr(item, "raw_text_on_paper", None) or getattr(item, "raw_text", "") or "")
        qty = float(item.quantity) if item.quantity > 0 else 1.0
        written_total = float(item.written_line_total)
        written_taxable_sum += written_total

        unit_price = float(item.unit_price) if (item.unit_price is not None and item.unit_price > 0) else None
        ocr_self_healed_note: Optional[str] = None

        # Algebraic Self-Healing Step A: Rupee Slash Notation ("/-" -> Qty 2 misread)
        has_slash_tail = any(s in raw_text_on_paper for s in ["/-", "/2", "/=", "।-", "₹"]) or ("/-" in (item.raw_quantity or ""))
        is_at_slash = bool(re.search(r"@\s*[-–]?\s*\d+\s*/", raw_text_on_paper))
        if qty == 2.0:
            if unit_price is not None and abs(unit_price - written_total) < 1.0 and written_total > 0:
                qty = 1.0
                unit_price = written_total
                ocr_self_healed_note = "Self-healed: Rupee slash '/-' misread as quantity 2 -> corrected to Qty 1.0"
            elif (has_slash_tail or is_at_slash) and (unit_price is None or abs(unit_price - written_total) < 1.0):
                qty = 1.0
                unit_price = written_total
                ocr_self_healed_note = "Self-healed: Rupee slash '/-' misread as quantity 2 -> corrected to Qty 1.0"

        # Algebraic Self-Healing Step B: Hindi Unit Digit Merge ("2 बोरा" -> Qty 21)
        if unit_price is not None and unit_price > 0 and qty > 1.0 and not ocr_self_healed_note:
            expected_int_qty = round(written_total / unit_price)
            if expected_int_qty > 0 and abs((expected_int_qty * unit_price) - written_total) < 0.50:
                if str(int(qty)).startswith(str(expected_int_qty)) and qty != float(expected_int_qty):
                    ocr_self_healed_note = (
                        f"Self-healed: Unit merge misread (read Qty {qty}) -> "
                        f"algebraically corrected to Qty {expected_int_qty:.1f}"
                    )
                    qty = float(expected_int_qty)

        # Missing unit price inference
        if unit_price is None or unit_price <= 0:
            unit_price = round(written_total / qty, 2)
            if not ocr_self_healed_note:
                ocr_self_healed_note = f"Inferred unit price: ₹{unit_price:.2f} (Total ₹{written_total:.2f} / Qty {qty})"

        # 3. Calculate audited math
        audited_line_total = round(qty * unit_price, 2)
        math_discrepancy = round(written_total - audited_line_total, 2)
        has_math_error = abs(math_discrepancy) > 0.50
        if ocr_self_healed_note and abs(math_discrepancy) <= 0.50:
            has_math_error = False
            math_discrepancy = 0.0

        # 4. Match HSN and GST Slab
        written_hsn = getattr(item, "written_hsn_code", None)
        sug_hsn = getattr(item, "suggested_hsn_4digit", None)
        sug_slab = getattr(item, "suggested_gst_slab", None)

        if EXTERNAL_HSN_AVAILABLE:
            try:
                hsn_info = match_hsn_item(
                    product_name_normalized=item.product_name_normalized,
                    raw_text=raw_text_on_paper,
                    item_sector=raw_bill.detected_sector,
                    unit_price=unit_price,
                    written_hsn_code=written_hsn,
                    suggested_hsn_4digit=sug_hsn,
                    suggested_gst_slab=sug_slab
                )
            except Exception as e:
                logger.warning(f"External HSN matcher failed: {e}. Using fallback.")
                hsn_info = fallback_match_hsn(
                    item.product_name_normalized,
                    raw_bill.detected_sector,
                    unit_price,
                    raw_text_on_paper
                )
        else:
            hsn_info = fallback_match_hsn(
                item.product_name_normalized,
                raw_bill.detected_sector,
                unit_price,
                raw_text_on_paper
            )

        gst_rate = float(hsn_info["gst_rate"])
        cgst_rate = round(gst_rate / 2.0, 2)
        sgst_rate = round(gst_rate / 2.0, 2)

        cgst_amount = round(audited_line_total * (cgst_rate / 100.0), 2)
        sgst_amount = round(audited_line_total * (sgst_rate / 100.0), 2)
        total_with_tax = round(audited_line_total + cgst_amount + sgst_amount, 2)

        audited_taxable_total += audited_line_total
        total_cgst += cgst_amount
        total_sgst += sgst_amount

        active_items.append(
            AuditedLineItem(
                row_id=idx,
                line_number=idx,
                raw_text=raw_text_on_paper,
                raw_text_on_paper=raw_text_on_paper,
                product_name_normalized=item.product_name_normalized,
                quantity=qty,
                raw_unit=item.raw_quantity,
                standard_uqc=item.unit_uqc,
                unit_uqc=item.unit_uqc,
                unit_price=unit_price,
                written_line_total=written_total,
                audited_line_total=audited_line_total,
                has_math_error=has_math_error,
                math_discrepancy=math_discrepancy,
                hsn_code=str(hsn_info["hsn_code"]),
                category_description=hsn_info["category_description"],
                hsn_description=hsn_info["category_description"],
                gst_rate=gst_rate,
                cgst_rate=cgst_rate,
                sgst_rate=sgst_rate,
                cgst_amount=cgst_amount,
                sgst_amount=sgst_amount,
                total_with_tax=total_with_tax,
                final_line_total_with_gst=total_with_tax,
                confidence=float(item.confidence_score),
                confidence_score=float(item.confidence_score),
                tax_rule_note=hsn_info.get("tax_rule_note"),
                ocr_self_healed_note=ocr_self_healed_note,
                written_hsn_code=written_hsn,
                suggested_hsn_4digit=sug_hsn,
                suggested_gst_slab=sug_slab,
                cbic_schedule=hsn_info.get("cbic_schedule"),
                statutory_chapter_note=hsn_info.get("statutory_chapter_note"),
                rag_citation=hsn_info.get("rag_citation"),
                top_3_alternatives=hsn_info.get("top_3_alternatives", []),
                hsn_alternatives=hsn_info.get("top_3_alternatives", [])
            )
        )

    # 5. Grand total summaries
    written_grand_total = (
        float(raw_bill.written_grand_total)
        if raw_bill.written_grand_total is not None and raw_bill.written_grand_total > 0
        else round(written_taxable_sum, 2)
    )

    extra_charges = float(raw_bill.extra_charges or 0.0)
    discount_amount = float(raw_bill.discount_amount or 0.0)

    total_math_saved = round(max(0.0, written_grand_total - audited_taxable_total), 2)
    final_payable_pakka = round(audited_taxable_total + total_cgst + total_sgst + extra_charges - discount_amount, 2)

    summary = InvoiceSummary(
        written_grand_total=round(written_grand_total, 2),
        audited_taxable_total=round(audited_taxable_total, 2),
        total_math_saved=total_math_saved,
        extra_charges=extra_charges,
        discount_amount=discount_amount,
        total_cgst=round(total_cgst, 2),
        total_sgst=round(total_sgst, 2),
        final_payable_pakka_total=final_payable_pakka
    )

    raw_inv_id = getattr(raw_bill, "invoice_id", None)
    if raw_inv_id and len(str(raw_inv_id).strip()) <= 16:
        inv_num = str(raw_inv_id).strip()
    elif raw_inv_id and len(str(raw_inv_id).strip()) > 16:
        inv_num = str(raw_inv_id).strip()[:16]
    else:
        inv_num = f"INV-{bill_id[:8].upper()}" if (bill_id and len(bill_id) > 16) else (bill_id or "INV-0001")
    store_addr = getattr(raw_bill, "store_address", None)
    raw_merchant = getattr(raw_bill, "merchant_name", None)
    merchant_name = raw_merchant.strip() if raw_merchant and raw_merchant.strip().lower() not in ("none", "null", "unknown", "") else None
    store_name_guess = merchant_name

    supp_gstin = getattr(raw_bill, "supplier_gstin", None)
    if supp_gstin and str(supp_gstin).strip().lower() in ("none", "null", ""):
        supp_gstin = None
    supp_val = validate_gstin(supp_gstin) if supp_gstin else {"is_valid": False, "state_code": None, "state_name": None}
    supp_state = supp_val["state_code"] if supp_val.get("is_valid") else None
    supp_state_name = INDIAN_STATES.get(supp_state) if supp_state else None

    raw_date = getattr(raw_bill, "raw_date_written", None) or getattr(raw_bill, "raw_date_text", None)
    if raw_date and str(raw_date).strip().lower() not in ("none", "null", "", "today"):
        raw_date_written = str(raw_date).strip()
        raw_date_text = raw_date_written
        normalized_date_iso = raw_date_written
        date_source = "EXTRACTED_FROM_RECEIPT"
    else:
        raw_date_written = None
        raw_date_text = None
        normalized_date_iso = None
        date_source = "MISSING_ON_PAPER_REQUIRES_INPUT"

    written_subtotal = float(getattr(raw_bill, "written_subtotal", None) or 0.0)
    try:
        from math_auditor import detect_doubts
        pending_doubts = detect_doubts(
            raw_bill=raw_bill,
            active_items=active_items,
            written_grand_total=written_grand_total,
            written_subtotal=written_subtotal,
            supp_val=supp_val,
            eff_supp_gstin=supp_gstin,
            normalized_date_iso=normalized_date_iso,
            merchant_name=merchant_name,
        )
    except Exception:
        pending_doubts = []

    is_100_percent_compliant = (
        len([d for d in pending_doubts if d.severity == "BLOCKING"]) == 0
        and supp_gstin is not None
        and supp_val.get("is_valid", False)
        and normalized_date_iso is not None
        and len(active_items) > 0
        and audited_taxable_total > 0
    )

    compliance_audit = validate_invoice_compliance({
        "supplier_gstin": supp_gstin,
        "merchant_name": merchant_name,
        "raw_date_written": raw_date_written,
        "normalized_date_iso": normalized_date_iso,
        "invoice_id": inv_num,
        "items": [it.model_dump() for it in active_items],
        "place_of_supply": supp_state,
        "supplier_state": supp_state,
    })

    return AuditedInvoiceResponse(
        bill_id=bill_id,
        invoice_id=inv_num,
        bill_number=inv_num,
        detected_sector=raw_bill.detected_sector,
        store_name_guess=store_name_guess,
        merchant_name=merchant_name,
        store_address=store_addr,
        supplier_gstin=supp_gstin,
        extracted_supplier_gstin=supp_gstin,
        supplier_state_code=supp_state,
        supplier_state_name=supp_state_name,
        place_of_supply_state_code=supp_state,
        place_of_supply_state_name=supp_state_name,
        is_inter_state=False,
        supply_type="B2CS",
        supply_type_b2b="B2CS",
        customer_name=raw_bill.customer_name,
        customer_phone=raw_bill.customer_phone,
        customer_address=raw_bill.customer_address,
        extra_charges=extra_charges,
        discount_amount=discount_amount,
        raw_date_written=raw_date_written,
        raw_date_text=raw_date_text,
        normalized_date_iso=normalized_date_iso,
        date_source=date_source,
        is_100_percent_compliant=is_100_percent_compliant,
        pending_doubts=pending_doubts,
        compliance_audit=compliance_audit,
        model_used=model_used,
        cache_hit=cache_hit,
        raw_image_b64=raw_image_b64,
        enhanced_image_b64=enhanced_image_b64,
        enhanced_image_base64=enhanced_image_b64,
        active_items=active_items,
        items=active_items,
        struck_out_items=struck_out_items,
        summary=summary
    )


# ============================================================================
# Realistic Mock Generator for Testing without API Keys
# ============================================================================

def create_rich_mock_invoice() -> AuditedInvoiceResponse:
    """
    Returns a rich, realistic multi-item response meeting all hackathon test requirements:
    1. Item 1: Normal standard grocery item (Basmati Rice, no math error)
    2. Item 2: Math Error item ('3 x 45 = 120' -> actual 135, has_math_error=True)
    3. Item 3: Textile threshold item (> ₹1,000 -> 12% GST auto-upgraded)
    4. Item 4: Struck-out cut item ('2 mtr Astar Kapda - 160 (cut)') in struck_out_items
    """
    bill_id = "mock_" + uuid.uuid4().hex[:12]

    # Item 1: Normal item
    item1_sched = "Schedule I (2.5% CGST + 2.5% SGST) - CBIC Notification 1/2017-CT(Rate)"
    item1_note = "Matched via Vector RAG [Sim: 0.96] -> Chapter 10 (Cereals): Rice, wheat, foodgrains, Heading 1006: Basmati Rice Packaged (5.0% under Schedule I)"
    item1 = AuditedLineItem(
        row_id=1,
        line_number=1,
        raw_text="5 kg Basmati Rice @ 110",
        raw_text_on_paper="5 kg Basmati Rice @ 110",
        product_name_normalized="Basmati Rice Branded",
        quantity=5.0,
        raw_unit="5 kg",
        standard_uqc="KGS",
        unit_uqc="KGS",
        unit_price=110.0,
        written_line_total=550.0,
        audited_line_total=550.0,
        has_math_error=False,
        math_discrepancy=0.0,
        hsn_code="1006",
        category_description="Basmati Rice Packaged",
        hsn_description="Basmati Rice Packaged",
        gst_rate=5.0,
        cgst_rate=2.5,
        sgst_rate=2.5,
        igst_rate=0.0,
        cgst_amount=13.75,
        sgst_amount=13.75,
        igst_amount=0.0,
        total_with_tax=577.50,
        final_line_total_with_gst=577.50,
        confidence=0.96,
        confidence_score=0.96,
        tax_rule_note="Packaged Foodgrains (5% GST)",
        cbic_schedule=item1_sched,
        statutory_chapter_note=item1_note,
        rag_citation={
            "cbic_schedule": item1_sched,
            "chapter": "10",
            "statutory_chapter_note": item1_note,
            "vector_similarity": 0.96,
            "legal_grounding": "Heading 1006 classified under Chapter 10. Rate: 5% pursuant to Schedule I."
        },
        top_3_alternatives=[
            {"hsn_code": "1006", "label": "Packaged Basmati Rice (5%)", "gst_rate": 5.0},
            {"hsn_code": "1101", "label": "Wheat Flour / Atta (5%)", "gst_rate": 5.0},
            {"hsn_code": "1006", "label": "Loose Unbranded Rice (0%)", "gst_rate": 0.0},
        ],
        hsn_alternatives=[
            {"hsn_code": "1006", "label": "Packaged Basmati Rice (5%)", "gst_rate": 5.0},
            {"hsn_code": "1101", "label": "Wheat Flour / Atta (5%)", "gst_rate": 5.0},
        ]
    )

    # Item 2: Math Error item (Shopkeeper undercharged 3 x 45 = 120 instead of 135)
    item2_sched = "Schedule III (9% CGST + 9% SGST) - CBIC Notification 1/2017-CT(Rate)"
    item2_note = "Matched via Vector RAG [Sim: 0.88] -> Chapter 85 (Electrical Machinery & Equipment), Heading 8539: LED Lamps & Bulbs (18.0% under Schedule III)"
    item2 = AuditedLineItem(
        row_id=2,
        line_number=2,
        raw_text="3 Nag LED Bulb @ 45 = 120",
        raw_text_on_paper="3 Nag LED Bulb @ 45 = 120",
        product_name_normalized="Syska LED Bulb 9W",
        quantity=3.0,
        raw_unit="3 Nag",
        standard_uqc="PCS",
        unit_uqc="PCS",
        unit_price=45.0,
        written_line_total=120.0,
        audited_line_total=135.0,
        has_math_error=True,
        math_discrepancy=-15.0,
        hsn_code="8539",
        category_description="LED Lamps & Bulbs",
        hsn_description="LED Lamps & Bulbs",
        gst_rate=18.0,
        cgst_rate=9.0,
        sgst_rate=9.0,
        igst_rate=0.0,
        cgst_amount=12.15,
        sgst_amount=12.15,
        igst_amount=0.0,
        total_with_tax=159.30,
        final_line_total_with_gst=159.30,
        confidence=0.88,
        confidence_score=0.88,
        tax_rule_note="Standard Electricals (18% GST)",
        cbic_schedule=item2_sched,
        statutory_chapter_note=item2_note,
        rag_citation={
            "cbic_schedule": item2_sched,
            "chapter": "85",
            "statutory_chapter_note": item2_note,
            "vector_similarity": 0.88,
            "legal_grounding": "Heading 8539 classified under Chapter 85. Rate: 18% pursuant to Schedule III."
        },
        top_3_alternatives=[
            {"hsn_code": "8539", "label": "LED Lamps & Bulbs (18%)", "gst_rate": 18.0},
            {"hsn_code": "8544", "label": "Electric Wire & Cable (18%)", "gst_rate": 18.0},
        ],
        hsn_alternatives=[
            {"hsn_code": "8539", "label": "LED Lamps & Bulbs (18%)", "gst_rate": 18.0},
        ]
    )

    # Item 3: Textile threshold item (> ₹1,000 threshold auto-upgraded to 12%)
    item3_sched = "Schedule II (6% CGST + 6% SGST) - CBIC Notification 1/2017-CT(Rate)"
    item3_note = "Matched via Vector RAG [Sim: 0.94] -> Chapter 62 (Articles of Apparel, Not Knitted), Heading 6204: Women Suits & Ensembles (12.0% under Schedule II) | Rule: Garment > ₹1,000: Auto-upgraded from 5% to 12% GST"
    item3 = AuditedLineItem(
        row_id=3,
        line_number=3,
        raw_text="1 Wedding Lehnga/Suit @ 2400",
        raw_text_on_paper="1 Wedding Lehnga/Suit @ 2400",
        product_name_normalized="Wedding Lehnga Suit",
        quantity=1.0,
        raw_unit="1 nag",
        standard_uqc="PCS",
        unit_uqc="PCS",
        unit_price=2400.0,
        written_line_total=2400.0,
        audited_line_total=2400.0,
        has_math_error=False,
        math_discrepancy=0.0,
        hsn_code="6204",
        category_description="Women Suits & Ensembles",
        hsn_description="Women Suits & Ensembles",
        gst_rate=12.0,
        cgst_rate=6.0,
        sgst_rate=6.0,
        igst_rate=0.0,
        cgst_amount=144.0,
        sgst_amount=144.0,
        igst_amount=0.0,
        total_with_tax=2688.0,
        final_line_total_with_gst=2688.0,
        confidence=0.94,
        confidence_score=0.94,
        tax_rule_note="Garment > ₹1,000: Auto-upgraded from 5% to 12% GST",
        cbic_schedule=item3_sched,
        statutory_chapter_note=item3_note,
        rag_citation={
            "cbic_schedule": item3_sched,
            "chapter": "62",
            "statutory_chapter_note": item3_note,
            "vector_similarity": 0.94,
            "legal_grounding": "Heading 6204 classified under Chapter 62. Rate: 12% pursuant to Schedule II."
        },
        top_3_alternatives=[
            {"hsn_code": "6204", "label": "Readymade Suit/Lehnga (5%/12%)", "gst_rate": 12.0},
            {"hsn_code": "5208", "label": "Unstitched Cotton Fabric (5%)", "gst_rate": 5.0},
            {"hsn_code": "6203", "label": "Men Suits / Trousers (12%)", "gst_rate": 12.0},
        ],
        hsn_alternatives=[
            {"hsn_code": "6204", "label": "Readymade Suit/Lehnga (5%/12%)", "gst_rate": 12.0},
            {"hsn_code": "5208", "label": "Unstitched Cotton Fabric (5%)", "gst_rate": 5.0},
        ]
    )

    # Item 4: Struck-out item
    struck1 = StruckOutItem(
        row_id=4,
        raw_text="2 mtr Astar Kapda - 160 (cut)",
        written_line_total=160.0,
        reason="Crossed out / cancelled with pen on receipt"
    )

    # Totals
    taxable_sum = round(item1.audited_line_total + item2.audited_line_total + item3.audited_line_total, 2)
    written_sum = round(item1.written_line_total + item2.written_line_total + item3.written_line_total, 2)
    tot_cgst = round(item1.cgst_amount + item2.cgst_amount + item3.cgst_amount, 2)
    tot_sgst = round(item1.sgst_amount + item2.sgst_amount + item3.sgst_amount, 2)
    tot_igst = 0.0
    final_pakka = round(taxable_sum + tot_cgst + tot_sgst, 2)

    summary = InvoiceSummary(
        written_grand_total=written_sum,
        audited_taxable_total=taxable_sum,
        total_math_saved=0.0,
        total_cgst=tot_cgst,
        total_sgst=tot_sgst,
        total_igst=tot_igst,
        final_payable_pakka_total=final_pakka
    )

    supplier_gstin = "03AAEPG1807C1ZM"
    compliance_audit = validate_invoice_compliance(
        invoice_data={
            "merchant_name": "Punjab Cloth & Readymade House",
            "store_name_guess": "Punjab Cloth & Readymade House",
            "raw_date_written": "31/10/2026",
            "normalized_date_iso": "2026-10-31",
            "active_items": [item1.model_dump(), item2.model_dump(), item3.model_dump()],
            "supplier_state_code": "03",
            "place_of_supply_state_code": "03",
        },
        supplier_gstin=supplier_gstin,
        buyer_gstin=None,
        pos_state_code="03"
    )

    return AuditedInvoiceResponse(
        bill_id=bill_id,
        invoice_id=f"INV-{bill_id[:8].upper()}" if len(bill_id) > 16 else bill_id,
        detected_sector="TEXTILE",
        store_name_guess="Punjab Cloth & Readymade House",
        merchant_name="Punjab Cloth & Readymade House",
        supplier_gstin=supplier_gstin,
        supplier_state_code="03",
        supplier_state_name="Punjab",
        buyer_gstin=None,
        buyer_state_code=None,
        buyer_state_name=None,
        place_of_supply_state_code="03",
        place_of_supply_state_name="Punjab",
        is_inter_state=False,
        supply_type_b2b="B2CS",
        customer_name="Sandeep Goyal",
        customer_phone="94653-47478",
        customer_address="Gali-8, Daba Colony, Ludhiana, Punjab",
        extra_charges=0.0,
        discount_amount=0.0,
        raw_date_written="31/10/2026",
        normalized_date_iso="2026-10-31",
        compliance_audit=compliance_audit,
        model_used="demo-mock-pipeline",
        cache_hit=False,
        raw_image_b64="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
        enhanced_image_b64="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
        enhanced_image_base64="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...",
        active_items=[item1, item2, item3],
        struck_out_items=[struck1],
        summary=summary
    )


# ============================================================================
# FastAPI Application Initialization
# ============================================================================

app = FastAPI(
    title="ParchiSetu AI - Lane 1 Backend & AI Vision Gateway",
    description="Vernacular OCR Handwritten Invoice-to-GST Formatter (Problem Statement #25)",
    version="1.0.0"
)

# Configure CORS for Frontend (Vite / Next.js / PWA on any localhost port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


FRONTEND_DIST_DIR = Path("frontend/dist") if Path("frontend/dist").exists() else Path("backend/../frontend/dist")
STATIC_DIR = Path("static") if Path("static").exists() else Path("backend/static")

if FRONTEND_DIST_DIR.exists() and (FRONTEND_DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST_DIR / "assets")), name="react_assets")

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ============================================================================
# 1. Root & Health Check Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Serves the frontend application: compiled Vite React app if available, else static dashboard."""
    # 1. Priority: Compiled Vite React Production App
    if FRONTEND_DIST_DIR.exists() and (FRONTEND_DIST_DIR / "index.html").exists():
        return FileResponse(
            str(FRONTEND_DIST_DIR / "index.html"),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    # 2. Fallback: Vanilla JS static dashboard
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(
            str(index_file),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    return {
        "service": "ParchiSetu AI - Bharat GST Vision Engine (Lane 1 & 2)",
        "status": "online",
        "documentation": "/docs",
        "health_check": "/api/v1/health",
        "endpoints": {
            "parse_invoice": "POST /api/v1/invoice/parse (or /api/scan-bill)",
            "recalculate_invoice": "POST /api/v1/invoice/recalculate (or /api/recalculate)",
            "export_gstr1": "POST /api/v1/invoice/export-gstr1 (or /api/export-gstr1)",
            "hsn_search": "GET /api/v1/hsn/search?q=...",
        }
    }


# ============================================================================
# 1.5 SQLite + JWT Authentication & Multi-GSTIN Merchant Profile System
# ============================================================================

@app.post("/api/v1/auth/register")
async def api_register(payload: Dict[str, Any] = Body(...)):
    """Registers a new merchant user and optional initial GSTIN branch."""
    email_or_phone = str(payload.get("email_or_phone", "")).strip()
    password = str(payload.get("password", "")).strip()
    full_name = str(payload.get("full_name", "")).strip()
    contact_phone = str(payload.get("contact_phone", "")).strip()
    default_business_name = str(payload.get("default_business_name", "")).strip()
    initial_gstin = str(payload.get("initial_gstin", "")).strip()

    if not email_or_phone or not password or not full_name:
        raise HTTPException(status_code=400, detail="email_or_phone, password, and full_name are required.")

    try:
        user_profile = auth_db.register_user(
            email_or_phone=email_or_phone,
            password=password,
            full_name=full_name,
            contact_phone=contact_phone,
            default_business_name=default_business_name,
            initial_gstin=initial_gstin
        )
        token = auth_db.create_access_token(user_profile["id"], user_profile["email_or_phone"])
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_profile,
            "merchant_gstins": user_profile.get("merchant_gstins", []),
            "default_gstin": user_profile.get("default_gstin")
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/auth/login")
async def api_login(payload: Dict[str, Any] = Body(...)):
    """Authenticates credentials or provides 1-click Demo Login pre-loaded with 3 multi-state branches."""
    demo_mode = bool(payload.get("demo_mode", False))
    email_or_phone = str(payload.get("email_or_phone", "")).strip().lower()
    password = str(payload.get("password", "")).strip()

    if demo_mode or email_or_phone in ("demo", "demo@parchisetu.in", "9876543210"):
        return auth_db.get_demo_login_response()

    if not email_or_phone or not password:
        raise HTTPException(status_code=400, detail="email_or_phone and password are required.")

    user_profile = auth_db.authenticate_user(email_or_phone, password)
    if not user_profile:
        raise HTTPException(status_code=401, detail="Invalid email/phone or password.")

    token = auth_db.create_access_token(user_profile["id"], user_profile["email_or_phone"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_profile,
        "merchant_gstins": user_profile.get("merchant_gstins", []),
        "default_gstin": user_profile.get("default_gstin")
    }


@app.get("/api/v1/auth/me")
async def api_get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Returns currently authenticated user profile and all saved GSTIN branches."""
    return {
        "user": user,
        "merchant_gstins": user.get("merchant_gstins", []),
        "default_gstin": user.get("default_gstin")
    }


@app.post("/api/v1/auth/gstins")
async def api_add_gstin(payload: Dict[str, Any] = Body(...), user: Dict[str, Any] = Depends(get_current_user)):
    """Adds a new GSTIN branch after validating Mod-36 checksum. Auto-derives state code and name."""
    gstin = str(payload.get("gstin", "")).strip().upper()
    trade_name = str(payload.get("trade_name", "")).strip() or user.get("default_business_name") or user.get("full_name")
    branch_address = str(payload.get("branch_address", "")).strip()
    branch_phone = str(payload.get("branch_phone", "")).strip() or user.get("contact_phone", "")
    invoice_prefix = str(payload.get("invoice_prefix", "")).strip()
    is_default = bool(payload.get("is_default", False))

    if not gstin:
        raise HTTPException(status_code=400, detail="GSTIN is required.")

    try:
        new_branch = auth_db.add_merchant_gstin(
            user_id=user["id"],
            gstin=gstin,
            trade_name=trade_name,
            branch_address=branch_address,
            branch_phone=branch_phone,
            invoice_prefix=invoice_prefix,
            is_default=is_default
        )
        updated_profile = auth_db.get_user_profile(user["id"])
        return {
            "status": "success",
            "branch": new_branch,
            "merchant_gstins": updated_profile.get("merchant_gstins", []),
            "default_gstin": updated_profile.get("default_gstin")
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/v1/auth/gstins/{gstin_id}/default")
async def api_make_default_gstin(gstin_id: int, user: Dict[str, Any] = Depends(get_current_user)):
    """Switches the active default GSTIN branch for this merchant profile."""
    success = auth_db.set_default_gstin(user["id"], gstin_id)
    if not success:
        raise HTTPException(status_code=404, detail="GSTIN branch not found.")
    profile = auth_db.get_user_profile(user["id"])
    return {
        "status": "success",
        "default_gstin": profile.get("default_gstin"),
        "merchant_gstins": profile.get("merchant_gstins", [])
    }


@app.delete("/api/v1/auth/gstins/{gstin_id}")
async def api_delete_gstin(gstin_id: int, user: Dict[str, Any] = Depends(get_current_user)):
    """Deletes a GSTIN branch and auto-promotes the next remaining branch as default."""
    success = auth_db.delete_merchant_gstin(user["id"], gstin_id)
    if not success:
        raise HTTPException(status_code=404, detail="GSTIN branch not found.")
    profile = auth_db.get_user_profile(user["id"])
    return {
        "status": "success",
        "merchant_gstins": profile.get("merchant_gstins", []),
        "default_gstin": profile.get("default_gstin")
    }


@app.get("/api/v1/gst/validate-gstin")
async def api_validate_gstin(gstin: str = Query(..., description="15-character Indian GSTIN")):
    """Instant validation of Indian GSTIN with Mod-36 check-digit verification in <2ms."""
    return validate_gstin(gstin)


@app.get("/api/v1/gst/demo-gstin")
async def api_demo_gstin(
    state_code: str = Query("03", description="2-digit State Code (e.g. 03 for Punjab)"),
    entity_type: str = Query("P", description="PAN Entity Type: P=Proprietor, C=Company, F=Firm")
):
    """Generates a 100% valid Indian GSTIN with mathematically verified Mod-36 checksum."""
    valid_gstin = generate_valid_gstin(state_code, entity_type)
    val = validate_gstin(valid_gstin)
    return {
        "gstin": valid_gstin,
        "state_code": val["state_code"],
        "state_name": val["state_name"],
        "pan": val["pan"],
        "entity_type": val["entity_type"],
        "checksum_valid": val["checksum_valid"]
    }


@app.get("/api/v1/gst/states")
async def api_get_states():
    """Returns official 38 Indian State / Union Territory GST codes and names."""
    return {"states": INDIAN_STATES}


@app.post("/api/v1/invoice/register-number")
async def api_register_invoice_number(payload: Dict[str, Any] = Body(...)):
    """Validates and checks invoice number uniqueness within FY under CGST Rule 46(b)."""
    supplier_key = payload.get("supplier_key") or payload.get("supplier_gstin") or "DEFAULT"
    financial_year = payload.get("financial_year") or get_indian_financial_year(payload.get("invoice_date"))
    invoice_number = payload.get("invoice_number", "")
    auto_register = bool(payload.get("auto_register", False))

    return check_and_register_invoice_number(
        supplier_key=supplier_key,
        financial_year=financial_year,
        invoice_number=invoice_number,
        auto_register=auto_register
    )


@app.get("/api/v1/invoice/next-number")
async def api_next_invoice_number(
    supplier_key: str = Query("DEFAULT", description="Supplier GSTIN or identifier"),
    financial_year: Optional[str] = Query(None, description="Financial Year (e.g. 2026-27)")
):
    """Generates the next sequential invoice number for a supplier and FY."""
    fy = financial_year or get_indian_financial_year()
    next_num = generate_next_sequential_invoice_number(supplier_key, fy)
    return {"financial_year": fy, "next_invoice_number": next_num}


@app.get("/api/v1/hsn/search")
async def search_hsn(
    q: str = Query(..., min_length=1, description="Keyword, item name, or HSN code"),
    limit: int = Query(10, ge=1, le=50, description="Max results")
):
    """Search HSN Master Catalog across 6 Indian market sectors."""
    if EXTERNAL_HSN_AVAILABLE and search_hsn_catalog is not None:
        results = search_hsn_catalog(query=q, limit=limit)
    else:
        results = []
    return {
        "query": q,
        "count": len(results),
        "results": results
    }


@app.get("/api/v1/health")
@app.get("/health")
async def health_check():
    """Health check endpoint displaying active model cascade, cache status, and lane integration."""
    api_key_set = bool(os.getenv("GEMINI_API_KEY") and os.getenv("GEMINI_API_KEY") != "your_key_here")
    return {
        "status": "healthy",
        "service": "ParchiSetu AI - Lane 1 AI Vision Gateway",
        "gemini_api_configured": api_key_set,
        "model_cascade": MODEL_FALLBACK_CASCADE,
        "caching_enabled": False,
        "teammate_integrations": {
            "hsn_matcher": "external" if EXTERNAL_HSN_AVAILABLE else "built-in fallback",
            "math_auditor": "external" if EXTERNAL_MATH_AVAILABLE else "built-in fallback"
        }
    }


# ============================================================================
# 2. Parse Handwritten Invoice Endpoint
# ============================================================================

@app.post("/api/v1/invoice/parse", response_model=AuditedInvoiceResponse)
@app.post("/api/scan-bill", response_model=AuditedInvoiceResponse)
async def parse_invoice(
    file: Optional[UploadFile] = File(None),
    mock: bool = Query(False, description="Return rich realistic mock response immediately"),
    bypass_cache: bool = Query(False, description="Bypass local SHA-256 OCR cache")
):
    """
    Accepts an uploaded image file of a handwritten shop receipt, runs OpenCV CLAHE shadow removal,
    routes to Gemini Vision OCR via quota-safe fallback cascade, and applies deterministic math & GST auditing.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    api_key_valid = bool(api_key and api_key.strip() not in ("", "your_key_here"))

    # Return mock if requested, or if no file was uploaded, or if API key is unconfigured
    if mock or file is None:
        logger.info("Serving rich mock invoice (mock explicitly requested).")
        return create_rich_mock_invoice()

    try:
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")

        # Step 1: OpenCV CLAHE Preprocessing & Shadow Removal
        prep_result = preprocess_bill_image(image_bytes)
        sha256_hash = prep_result["sha256_hash"]
        pil_image = prep_result["pil_image"]
        enhanced_b64 = prep_result["enhanced_image_b64"]
        raw_b64 = prep_result["raw_image_b64"]

        # Step 2: Route through multi-model Gemini Vision with fallback & cache
        raw_bill, model_used, cache_hit = parse_bill_with_gemini(
            pil_image=pil_image,
            sha256_hash=sha256_hash,
            bypass_cache=True,
            api_key=api_key
        )

        # Step 3: Math Auditor & GST Classification
        if EXTERNAL_MATH_AVAILABLE:
            try:
                response = audit_and_calculate_invoice(
                    raw_bill=raw_bill,
                    bill_id=sha256_hash,
                    enhanced_image_b64=enhanced_b64,
                    raw_image_b64=raw_b64,
                    model_used=model_used,
                    cache_hit=cache_hit
                )
                return response
            except Exception as e:
                logger.warning(f"External math_auditor raised: {e}. Falling back to internal auditor.")

        # Built-in auditor fallback
        response = fallback_audit_and_calculate_invoice(
            raw_bill=raw_bill,
            bill_id=sha256_hash,
            enhanced_image_b64=enhanced_b64,
            raw_image_b64=raw_b64,
            model_used=model_used,
            cache_hit=cache_hit
        )
        return response

    except Exception as e:
        logger.error(f"Error during invoice parsing: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=502, detail=f"Scan failed: {e}")


# ============================================================================
# 3. Recalculate Invoice Endpoint (<5ms Instant Recalculation)
# ============================================================================

@app.post("/api/v1/invoice/recalculate", response_model=AuditedInvoiceResponse)
@app.post("/api/recalculate", response_model=AuditedInvoiceResponse)
async def recalculate_invoice(payload: Dict[str, Any] = Body(...)):
    """
    Accepts edited active_items and header fields from Frontend UI and recalculates all lines,
    CGST/SGST/IGST splits, dynamic conditional threshold rules, CBIC RAG citations, and grand totals in <5ms.
    """
    try:
        bill_id = payload.get("bill_id") or payload.get("invoice_id") or f"recalc_{uuid.uuid4().hex[:8]}"
        sector = payload.get("detected_sector", "GENERAL")
        store_name = payload.get("store_name_guess") or payload.get("merchant_name") or "Bharat Store"
        customer_name = payload.get("customer_name")
        customer_phone = payload.get("customer_phone")
        customer_address = payload.get("customer_address")
        extra_charges = float(payload.get("extra_charges") or 0.0)
        discount_amount = float(payload.get("discount_amount") or 0.0)
        raw_date = payload.get("raw_date_written", "Today")
        raw_image_b64 = payload.get("raw_image_b64")
        enhanced_image_b64 = payload.get("enhanced_image_b64") or payload.get("enhanced_image_base64")

        # Resolve Merchant Name (Zero Silent Autofill)
        raw_store = payload.get("merchant_name") or payload.get("store_name_guess")
        store_name = raw_store.strip() if raw_store and raw_store.strip().lower() not in ("none", "null", "unknown", "", "unspecified store") else None

        # Resolve Supplier GSTIN and State (Zero Silent Autofill)
        raw_gstin = payload.get("supplier_gstin") or payload.get("extracted_supplier_gstin")
        supplier_gstin = raw_gstin.strip() if raw_gstin and raw_gstin.strip().lower() not in ("none", "null", "") else None
        supp_val = validate_gstin(supplier_gstin) if supplier_gstin else {"is_valid": False, "state_code": None, "state_name": None}
        supplier_state = supp_val["state_code"] if supp_val.get("is_valid") else payload.get("supplier_state_code")
        supplier_state_name = INDIAN_STATES.get(supplier_state) if supplier_state else None

        # Resolve Buyer GSTIN and Supply Mode
        buyer_gstin = payload.get("buyer_gstin")
        buyer_val = validate_gstin(buyer_gstin)
        supply_mode = "B2B" if buyer_val["is_valid"] else "B2CS"
        buyer_state = buyer_val["state_code"] if buyer_val["is_valid"] else payload.get("buyer_state_code")
        buyer_state_name = INDIAN_STATES.get(buyer_state) if buyer_state else None

        # Resolve Place of Supply (POS) and Inter-State Tax Mode
        raw_pos = payload.get("place_of_supply_state_code") or supplier_state
        pos_code = str(raw_pos).zfill(2) if raw_pos else None
        pos_name = INDIAN_STATES.get(pos_code) if pos_code else None

        # Statutory IGST Rule (Section 7 of IGST Act): Inter-State when Supplier State != Place of Supply State
        if supplier_state and pos_code:
            is_inter_state = bool(supplier_state != pos_code)
        elif payload.get("is_inter_state") is not None:
            is_inter_state = bool(payload.get("is_inter_state"))
        else:
            is_inter_state = False

        raw_active_items = payload.get("active_items", [])
        raw_struck_items = payload.get("struck_out_items", [])

        audited_active: List[AuditedLineItem] = []
        written_taxable_sum = 0.0
        audited_taxable_total = 0.0
        total_cgst = 0.0
        total_sgst = 0.0
        total_igst = 0.0

        for idx, item in enumerate(raw_active_items, start=1):
            qty = float(item.get("quantity", 1.0))
            written_total = float(item.get("written_line_total", 0.0))
            written_taxable_sum += written_total

            if item.get("unit_price") is not None and float(item.get("unit_price")) > 0:
                unit_price = float(item["unit_price"])
            else:
                unit_price = round(written_total / qty, 2) if qty > 0 else written_total

            audited_line_total = round(qty * unit_price, 2)
            math_discrepancy = round(written_total - audited_line_total, 2)
            has_math_error = abs(math_discrepancy) > 0.50

            # Match or recalculate HSN using external matcher if available
            product_name = item.get("product_name_normalized") or item.get("raw_text") or "Goods"
            raw_text = item.get("raw_text") or product_name

            if EXTERNAL_HSN_AVAILABLE:
                hsn_info = match_hsn_item(
                    product_name,
                    raw_text,
                    sector,
                    unit_price,
                    written_hsn_code=item.get("written_hsn_code") or item.get("hsn_code")
                )
            else:
                hsn_info = fallback_match_hsn(product_name, sector, unit_price, raw_text)

            user_gst_rate = item.get("gst_rate")
            gst_rate = float(user_gst_rate) if user_gst_rate is not None else float(hsn_info["gst_rate"])

            # Check dynamic GST threshold rules (Apparel & Footwear)
            hsn_code = str(item.get("hsn_code") or hsn_info["hsn_code"])
            tax_rule_note = item.get("tax_rule_note") or hsn_info.get("tax_rule_note")
            is_apparel_hsn = hsn_code.startswith(("61", "62", "63", "52"))
            is_footwear_hsn = hsn_code.startswith("64")

            if is_apparel_hsn:
                if unit_price > 1000.0:
                    gst_rate = 12.0
                    tax_rule_note = "Garment > ₹1,000: Auto-upgraded from 5% to 12% GST"
                elif user_gst_rate is None:
                    gst_rate = 5.0
                    tax_rule_note = "Standard Garment <= ₹1,000: 5% GST applied"
            elif is_footwear_hsn:
                if unit_price > 1000.0:
                    gst_rate = 18.0
                    tax_rule_note = "Footwear > ₹1,000: 18% GST"
                elif user_gst_rate is None:
                    gst_rate = 12.0
                    tax_rule_note = "Footwear <= ₹1,000: 12% GST"

            # Inter-State (IGST) vs Intra-State (CGST + SGST) Split
            if is_inter_state:
                cgst_rate = 0.0
                sgst_rate = 0.0
                igst_rate = gst_rate
                cgst_amount = 0.0
                sgst_amount = 0.0
                igst_amount = round(audited_line_total * (igst_rate / 100.0), 2)
                total_with_tax = round(audited_line_total + igst_amount, 2)
            else:
                cgst_rate = round(gst_rate / 2.0, 2)
                sgst_rate = round(gst_rate / 2.0, 2)
                igst_rate = 0.0
                cgst_amount = round(audited_line_total * (cgst_rate / 100.0), 2)
                sgst_amount = round(audited_line_total * (sgst_rate / 100.0), 2)
                igst_amount = 0.0
                total_with_tax = round(audited_line_total + cgst_amount + sgst_amount, 2)

            audited_taxable_total += audited_line_total
            total_cgst += cgst_amount
            total_sgst += sgst_amount
            total_igst += igst_amount

            category_desc = item.get("category_description") or item.get("hsn_description") or hsn_info["category_description"]

            # Statutory RAG Citation
            cbic_sched = item.get("cbic_schedule") or hsn_info.get("cbic_schedule")
            stat_note = item.get("statutory_chapter_note") or hsn_info.get("statutory_chapter_note")
            rag_cit = item.get("rag_citation") or hsn_info.get("rag_citation")

            audited_active.append(
                AuditedLineItem(
                    row_id=item.get("row_id") or idx,
                    line_number=item.get("line_number") or idx,
                    raw_text=item.get("raw_text") or product_name,
                    raw_text_on_paper=item.get("raw_text_on_paper") or item.get("raw_text") or product_name,
                    product_name_normalized=product_name,
                    quantity=qty,
                    raw_unit=item.get("raw_unit", "nag"),
                    standard_uqc=item.get("standard_uqc", "PCS"),
                    unit_uqc=item.get("unit_uqc", item.get("standard_uqc", "PCS")),
                    unit_price=unit_price,
                    written_line_total=written_total,
                    audited_line_total=audited_line_total,
                    has_math_error=has_math_error,
                    math_discrepancy=math_discrepancy,
                    hsn_code=hsn_code,
                    category_description=category_desc,
                    hsn_description=category_desc,
                    gst_rate=gst_rate,
                    cgst_rate=cgst_rate,
                    sgst_rate=sgst_rate,
                    igst_rate=igst_rate,
                    cgst_amount=cgst_amount,
                    sgst_amount=sgst_amount,
                    igst_amount=igst_amount,
                    total_with_tax=total_with_tax,
                    final_line_total_with_gst=total_with_tax,
                    confidence=float(item.get("confidence", 0.95)),
                    confidence_score=float(item.get("confidence_score", 0.95)),
                    tax_rule_note=tax_rule_note,
                    cbic_schedule=cbic_sched,
                    statutory_chapter_note=stat_note,
                    rag_citation=rag_cit,
                    top_3_alternatives=item.get("top_3_alternatives", hsn_info.get("top_3_alternatives", [])),
                    hsn_alternatives=item.get("hsn_alternatives", hsn_info.get("top_3_alternatives", []))
                )
            )

        # Struck out items
        struck_items = [
            StruckOutItem(
                row_id=int(st.get("row_id") or 0),
                raw_text=st.get("raw_text", ""),
                written_line_total=float(st.get("written_line_total", 0.0)),
                reason=st.get("reason", "Crossed out on receipt")
            )
            for st in raw_struck_items
        ]

        # Summaries
        written_grand_total = round(written_taxable_sum, 2)
        total_math_saved = round(max(0.0, written_grand_total - audited_taxable_total), 2)
        final_payable_pakka = round(
            audited_taxable_total + total_cgst + total_sgst + total_igst + extra_charges - discount_amount, 2
        )

        summary = InvoiceSummary(
            written_grand_total=written_grand_total,
            audited_taxable_total=round(audited_taxable_total, 2),
            total_math_saved=total_math_saved,
            extra_charges=extra_charges,
            discount_amount=discount_amount,
            total_cgst=round(total_cgst, 2),
            total_sgst=round(total_sgst, 2),
            total_igst=round(total_igst, 2),
            final_payable_pakka_total=final_payable_pakka
        )

        # Date resolution (Zero Silent Autofill)
        raw_date = payload.get("raw_date_written") or payload.get("raw_date_text")
        normalized_date = payload.get("normalized_date_iso") or raw_date
        if not normalized_date or str(normalized_date).strip().lower() in ("none", "null", "", "today"):
            normalized_date = None
            date_source = "MISSING_ON_PAPER_REQUIRES_INPUT"
        else:
            date_source = "USER_ENTERED" if not raw_date else "EXTRACTED_FROM_RECEIPT"

        # Strict Doubt Detection
        dummy_bill = RawVisionBill(
            detected_sector=sector,
            merchant_name=store_name,
            supplier_gstin=supplier_gstin,
            raw_date_written=raw_date,
            written_grand_total=written_grand_total,
            written_subtotal=float(payload.get("written_subtotal") or 0.0),
        )
        try:
            from math_auditor import detect_doubts
            pending_doubts = detect_doubts(
                raw_bill=dummy_bill,
                active_items=audited_active,
                written_grand_total=written_grand_total,
                written_subtotal=float(payload.get("written_subtotal") or 0.0),
                supp_val=supp_val,
                eff_supp_gstin=supplier_gstin,
                normalized_date_iso=normalized_date,
                merchant_name=store_name,
            )
        except Exception:
            pending_doubts = []

        is_100_percent_compliant = (
            len([d for d in pending_doubts if d.severity == "BLOCKING"]) == 0
            and supplier_gstin is not None
            and supp_val.get("is_valid", False)
            and normalized_date is not None
            and len(audited_active) > 0
            and audited_taxable_total > 0
        )

        # Run compliance audit
        compliance_audit = validate_invoice_compliance(
            invoice_data={
                "merchant_name": store_name,
                "store_name_guess": store_name,
                "raw_date_written": raw_date,
                "normalized_date_iso": normalized_date,
                "active_items": [i.model_dump() for i in audited_active],
                "supplier_state_code": supplier_state,
                "place_of_supply_state_code": pos_code,
            },
            supplier_gstin=supplier_gstin,
            buyer_gstin=buyer_gstin,
            pos_state_code=pos_code
        )

        inv_serial = f"INV-{bill_id[:8].upper()}" if len(bill_id) > 16 else bill_id
        return AuditedInvoiceResponse(
            bill_id=bill_id,
            invoice_id=inv_serial,
            bill_number=inv_serial,
            detected_sector=sector,
            store_name_guess=store_name,
            merchant_name=store_name,
            supplier_gstin=supplier_gstin,
            extracted_supplier_gstin=supplier_gstin,
            supplier_state_code=supplier_state,
            supplier_state_name=supplier_state_name,
            buyer_gstin=buyer_gstin,
            buyer_state_code=buyer_state,
            buyer_state_name=buyer_state_name,
            place_of_supply_state_code=pos_code,
            place_of_supply_state_name=pos_name,
            is_inter_state=is_inter_state,
            supply_type=supply_mode,
            supply_type_b2b=supply_mode,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_address=customer_address,
            extra_charges=extra_charges,
            discount_amount=discount_amount,
            raw_date_written=raw_date,
            raw_date_text=raw_date,
            normalized_date_iso=normalized_date,
            date_source=date_source,
            is_100_percent_compliant=is_100_percent_compliant,
            pending_doubts=pending_doubts,
            compliance_audit=compliance_audit,
            model_used="deterministic-recalc",
            cache_hit=False,
            raw_image_b64=raw_image_b64,
            enhanced_image_b64=enhanced_image_b64,
            enhanced_image_base64=enhanced_image_b64,
            active_items=audited_active,
            items=audited_active,
            struck_out_items=struck_items,
            summary=summary
        )

    except Exception as e:
        logger.error(f"Error in recalculation: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to recalculate invoice: {str(e)}")


# ============================================================================
# 4. Export Official Indian GSTR-1 JSON Endpoint
# ============================================================================

@app.post("/api/v1/invoice/export-gstr1")
@app.post("/api/export-gstr1")
async def export_gstr1(payload: Dict[str, Any] = Body(...)):
    """
    Exports audited invoice payload into the official Indian GST Portal GSTR-1 JSON format (B2B/B2CS + HSN Summary).
    """
    try:
        invoice_content = payload.get("invoice") or payload
        gstin = payload.get("supplier_gstin") or payload.get("gstin") or invoice_content.get("supplier_gstin") or "URP"
        fp = payload.get("fp") or payload.get("tax_period") or "102026"
        pos = payload.get("pos_code") or payload.get("pos") or invoice_content.get("place_of_supply_state_code") or "03"
        buyer_gstin = payload.get("buyer_gstin") or invoice_content.get("buyer_gstin")

        gstr1_json = export_to_gstr1_json(
            invoice_data=invoice_content,
            supplier_gstin=gstin,
            tax_period=fp,
            pos_code=pos,
            buyer_gstin=buyer_gstin
        )
        return gstr1_json
    except Exception as e:
        logger.error(f"Failed to export GSTR-1 JSON: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"GSTR-1 Export Failed: {str(e)}")


@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """SPA fallback route for React Router navigation (e.g. /dashboard, /scan)."""
    # Exclude API endpoints and static mounts from SPA fallback
    if full_path.startswith(("api/", "api", "docs", "redoc", "openapi.json", "static/", "assets/", "health")):
        raise HTTPException(status_code=404, detail="Endpoint not found")

    if FRONTEND_DIST_DIR.exists() and (FRONTEND_DIST_DIR / "index.html").exists():
        return FileResponse(
            str(FRONTEND_DIST_DIR / "index.html"),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(
            str(index_file),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    raise HTTPException(status_code=404, detail="Page not found")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)

