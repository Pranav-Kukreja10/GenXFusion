"""
backend/math_auditor.py - Deterministic Shopkeeper Math Auditor & GST Tax Engine
Part of ParchiSetu AI / Bharat GST Vision Engine (Teammate 2 Module).

Core Functions:
1. normalize_indian_unit(raw_unit: str, raw_text: str) -> tuple[str, float]:
   - Maps vernacular regional units to official GST UQC codes.
   - Parses Hindi fractional multipliers (pao=0.25, adha=0.5, sawa=1.25, dedh=1.5, dhai=2.5, etc.).
2. audit_invoice_items(items: list[dict], detected_sector: str = "Kirana", apply_math_fix: bool = False) -> dict:
   - Separates is_struck_out==True items into struck_out_items (excl. from taxable totals).
   - Infers missing unit_price: round(written_line_total / quantity, 2).
   - Detects math errors: abs(expected_line_total - written_line_total) > 0.50.
   - Matches HSN & applies ₹1,000 threshold rules on HSN 61/62/63/64 (even with manual_hsn_override).
   - Calculates 50/50 CGST/SGST splits and generates alerts, HSN summary, and totals.
3. amount_in_words_inr(amount: float) -> str:
   - Formats amounts in the Indian numbering system (Crores, Lakhs, Thousands, Rupees).
4. audit_and_calculate_invoice(...) & audit_line_item(...) for Lane 1 (main.py) integration.
"""

from __future__ import annotations

import re
import math
import logging
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Union, Tuple

# Import Lane 2 HSN Matcher
from hsn_matcher import match_hsn

logger = logging.getLogger("math_auditor")

# Try importing strict Pydantic models from Lane 1 schemas;
# provide zero-dependency fallback dataclasses if running without pydantic.
try:
    from schemas import (
        RawVisionBill,
        RawVisionLineItem,
        AuditedLineItem,
        StruckOutItem,
        InvoiceSummary,
        AuditedInvoiceResponse,
    )
    HAS_PYDANTIC_SCHEMAS = True
except Exception:
    HAS_PYDANTIC_SCHEMAS = False

    class _DictModel:
        def model_dump(self) -> Dict[str, Any]:
            return asdict(self)  # type: ignore

    @dataclass
    class AuditedLineItem(_DictModel):  # type: ignore
        row_id: int
        raw_text: str
        product_name_normalized: str
        quantity: float = 1.0
        raw_unit: Optional[str] = "nag"
        standard_uqc: str = "PCS"
        unit_price: float = 0.0
        written_line_total: float = 0.0
        audited_line_total: float = 0.0
        has_math_error: bool = False
        math_discrepancy: float = 0.0
        hsn_code: str = "9999"
        category_description: str = "General Goods"
        gst_rate: float = 18.0
        cgst_rate: float = 9.0
        sgst_rate: float = 9.0
        cgst_amount: float = 0.0
        sgst_amount: float = 0.0
        igst_rate: float = 0.0
        igst_amount: float = 0.0
        supply_type: str = "INTRA"
        total_with_tax: float = 0.0
        confidence: float = 0.90
        tax_rule_note: Optional[str] = None
        top_3_alternatives: List[Dict[str, Any]] = field(default_factory=list)
        line_number: Optional[int] = None
        raw_text_on_paper: Optional[str] = None
        unit_uqc: Optional[str] = None
        hsn_description: Optional[str] = None
        final_line_total_with_gst: Optional[float] = None
        confidence_score: Optional[float] = None
        hsn_alternatives: Optional[List[Dict[str, Any]]] = None

        def __post_init__(self):
            if self.line_number is None:
                self.line_number = self.row_id
            if self.raw_text_on_paper is None:
                self.raw_text_on_paper = self.raw_text
            if self.unit_uqc is None:
                self.unit_uqc = self.standard_uqc
            if self.hsn_description is None:
                self.hsn_description = self.category_description
            if self.final_line_total_with_gst is None:
                self.final_line_total_with_gst = self.total_with_tax
            if self.confidence_score is None:
                self.confidence_score = self.confidence
            if self.hsn_alternatives is None:
                self.hsn_alternatives = self.top_3_alternatives

    @dataclass
    class StruckOutItem(_DictModel):  # type: ignore
        raw_text: str
        written_line_total: float = 0.0
        row_id: Optional[int] = None
        reason: Optional[str] = "Crossed out or cut with pen markings"

    @dataclass
    class InvoiceSummary(_DictModel):  # type: ignore
        written_grand_total: float = 0.0
        audited_taxable_total: float = 0.0
        total_math_saved: float = 0.0
        total_cgst: float = 0.0
        total_sgst: float = 0.0
        total_igst: float = 0.0
        total_tax: float = 0.0
        supply_type: str = "INTRA"
        final_payable_pakka_total: float = 0.0

    @dataclass
    class AuditedInvoiceResponse(_DictModel):  # type: ignore
        bill_id: str
        detected_sector: str = "GENERAL"
        store_name_guess: Optional[str] = None
        raw_image_b64: Optional[str] = None
        enhanced_image_b64: Optional[str] = None
        active_items: List[AuditedLineItem] = field(default_factory=list)
        struck_out_items: List[StruckOutItem] = field(default_factory=list)
        summary: InvoiceSummary = field(default_factory=InvoiceSummary)
        invoice_id: Optional[str] = None
        merchant_name: Optional[str] = None
        raw_date_written: Optional[str] = None
        normalized_date_iso: Optional[str] = "2026-10-31"
        model_used: Optional[str] = "gemini-3.5-flash-lite"
        cache_hit: bool = False
        enhanced_image_base64: Optional[str] = None

        def __post_init__(self):
            if self.invoice_id is None:
                self.invoice_id = self.bill_id
            if self.merchant_name is None:
                self.merchant_name = self.store_name_guess
            elif self.store_name_guess is None:
                self.store_name_guess = self.merchant_name
            if self.enhanced_image_base64 is None:
                self.enhanced_image_base64 = self.enhanced_image_b64
            elif self.enhanced_image_b64 is None:
                self.enhanced_image_b64 = self.enhanced_image_base64

    class RawVisionBill:  # type: ignore
        pass

    class RawVisionLineItem:  # type: ignore
        pass


# ============================================================================
# Indian Vernacular Unit & Fractional Quantity Parser
# ============================================================================

VERNACULAR_UQC_MAP: Dict[str, str] = {
    # Length / Fabric
    "thaan": "MTR",
    "than": "MTR",
    "meter": "MTR",
    "metre": "MTR",
    "mtr": "MTR",
    "gaz": "YD",
    "gaj": "YD",
    "yard": "YD",
    "yd": "YD",
    # Strips / Medical
    "patta": "STRP",
    "patte": "STRP",
    "strip": "STRP",
    "strips": "STRP",
    # Bottles / Liquids
    "shishi": "BTL",
    "bottle": "BTL",
    "btl": "BTL",
    "litre": "LTR",
    "liter": "LTR",
    "ltr": "LTR",
    "balti": "LTR",
    "ml": "MLT",
    # Bags / Sacks
    "bori": "BAG",
    "katta": "BAG",
    "bag": "BAG",
    "bags": "BAG",
    "bora": "BAG",
    "thela": "BAG",
    # Boxes / Cartons
    "peti": "BOX",
    "box": "BOX",
    "boxes": "BOX",
    "dabba": "BOX",
    "dibba": "BOX",
    "carton": "BOX",
    # Discrete Counts
    "nag": "PCS",
    "piece": "PCS",
    "pieces": "PCS",
    "pc": "PCS",
    "pcs": "PCS",
    "nos": "PCS",
    "no": "PCS",
    "packet": "PAC",
    "pkt": "PAC",
    "pack": "PAC",
    # Pairs & Dozens
    "jodi": "PAR",
    "pair": "PAR",
    "pairs": "PAR",
    "dozen": "DOZ",
    "darjan": "DOZ",
    "doz": "DOZ",
    # Weights
    "kilo": "KGS",
    "kg": "KGS",
    "kgs": "KGS",
    "kilogram": "KGS",
    "gram": "GMS",
    "gm": "GMS",
    "gms": "GMS",
    "ser": "KGS",
    "seer": "KGS",
    "quintal": "QTL",
    # Coils / Bundles
    "coil": "BDL",
    "bundle": "BDL",
    "bdl": "BDL",
    "roll": "ROL",
}

# Hindi Fractional Multiplier Dictionary
HINDI_FRACTIONS: List[Tuple[str, float]] = [
    ("saadhe panch", 5.5),
    ("saadhe char", 4.5),
    ("saadhe teen", 3.5),
    ("dhai", 2.5),
    ("dhaii", 2.5),
    ("dedh", 1.5),
    ("derh", 1.5),
    ("deedh", 1.5),
    ("sawa", 1.25),
    ("aadha", 0.5),
    ("adha", 0.5),
    ("paav", 0.25),
    ("pao", 0.25),
    ("quarter", 0.25),
    ("half", 0.5),
]


def normalize_indian_unit(raw_unit: Optional[str], raw_text: Optional[str] = "") -> Tuple[str, float]:
    """
    Maps vernacular units to official GST UQC codes (e.g. thaan->MTR, gaz->YD,
    patta->STRP, shishi->BTL, bori->BAG, peti->BOX, nag->PCS, jodi->PAR, kilo->KGS).
    Parses Hindi fractional multipliers (pao=0.25, adha=0.5, sawa=1.25, dedh=1.5, dhai=2.5, etc.).

    Returns:
        tuple[standard_uqc, parsed_multiplier]
    """
    combined = f"{raw_unit or ''} {raw_text or ''}".lower()

    # 1. Check Hindi fractional multipliers first
    multiplier = 1.0
    for frac_word, val in HINDI_FRACTIONS:
        pattern = r"\b" + re.escape(frac_word) + r"\b"
        if re.search(pattern, combined):
            multiplier = val
            break

    # If no fraction found, check for numeric quantity at start of raw_unit or raw_text
    if multiplier == 1.0:
        match_num = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kilo|gm|mtr|meter|gaz|peti|bori|katta|nag|pc|pcs|jodi|patta|shishi|balti|dozen|coil)?", combined)
        if match_num:
            try:
                parsed_val = float(match_num.group(1))
                if parsed_val > 0:
                    multiplier = parsed_val
            except ValueError:
                pass

    # 2. Extract standard UQC code
    words = re.findall(r"[a-zA-Z]+", combined)
    uqc = "PCS"
    for w in words:
        if w in VERNACULAR_UQC_MAP:
            uqc = VERNACULAR_UQC_MAP[w]
            break

    # If already a valid UQC
    upper_unit = (raw_unit or "").upper().strip()
    valid_uqcs = {
        "PCS", "KGS", "MTR", "BOX", "BAG", "STRP", "PAR", "DOZ",
        "LTR", "SET", "PAC", "ROL", "YD", "YDS", "GMS", "CAN", "BTL", "BDL"
    }
    if upper_unit in valid_uqcs:
        uqc = "YD" if upper_unit == "YDS" else upper_unit

    return (uqc, multiplier)


# ============================================================================
# Indian Number to Words Converter (INR Lakhs & Crores)
# ============================================================================

ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen"]
TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _two_digits_to_words(n: int) -> str:
    if n < 20:
        return ONES[n]
    tens_digit = n // 10
    ones_digit = n % 10
    return TENS[tens_digit] + ("-" + ONES[ones_digit] if ones_digit > 0 else "")


def _three_digits_to_words(n: int) -> str:
    hundred = n // 100
    rem = n % 100
    words = []
    if hundred > 0:
        words.append(ONES[hundred] + " Hundred")
    if rem > 0:
        words.append(_two_digits_to_words(rem))
    return " ".join(words)


def amount_in_words_inr(amount: float) -> str:
    """
    Converts a rupee float into formal Indian Lakh/Crore words.
    Example: 2688.0 -> 'Two Thousand Six Hundred Eighty-Eight Rupees Only'
    """
    if amount is None or math.isnan(amount) or amount == 0.0:
        return "Zero Rupees Only"

    rupees = int(math.floor(abs(amount)))
    paise = int(round((abs(amount) - rupees) * 100))

    if rupees == 0 and paise == 0:
        return "Zero Rupees Only"

    crore = rupees // 10000000
    rupees %= 10000000
    lakh = rupees // 100000
    rupees %= 100000
    thousand = rupees // 1000
    rupees %= 1000
    hundreds = rupees

    parts = []
    if crore > 0:
        parts.append(_two_digits_to_words(crore) + " Crore")
    if lakh > 0:
        parts.append(_two_digits_to_words(lakh) + " Lakh")
    if thousand > 0:
        parts.append(_two_digits_to_words(thousand) + " Thousand")
    if hundreds > 0:
        parts.append(_three_digits_to_words(hundreds))

    rupee_str = " ".join(parts).strip()
    if not rupee_str:
        rupee_str = "Zero"

    rupee_clause = f"{rupee_str} Rupees"
    if paise > 0:
        paise_str = _two_digits_to_words(paise)
        return f"{rupee_clause} and {paise_str} Paise Only"
    return f"{rupee_clause} Only"


# ============================================================================
# Main Invoice Item Auditor
# ============================================================================

def audit_invoice_items(
    items: List[Dict[str, Any]],
    detected_sector: str = "Kirana",
    apply_math_fix: bool = False,
    supplier_state_code: str = "03",
    buyer_state_code: str = "03"
) -> Dict[str, Any]:
    """
    Comprehensive shopkeeper math auditor:
    1. Struck-out items (is_struck_out==True) separated into struck_out_items (excl. from tax & totals).
    2. Missing unit_price inferred: round(written_line_total / quantity, 2).
    3. Math error flagged: abs(expected_line_total - written_line_total) > 0.50.
    4. Calls match_hsn(...) and applies conditional ₹1,000 threshold rules on HSN 61/62/63/64
       even when manual_hsn_override is provided.
    5. Automatic Intra-State (CGST+SGST) vs. Inter-State (IGST) Detection:
       - supplier_state_code == buyer_state_code -> supply_type='INTRA', 50/50 CGST & SGST.
       - supplier_state_code != buyer_state_code -> supply_type='INTER', 100% IGST.
    6. Returns audit_alerts, hsn_summary_table, and totals with Indian Rupee words.
    """
    active_items: List[Dict[str, Any]] = []
    struck_out_items: List[Dict[str, Any]] = []
    alert_messages: List[str] = []

    # Inter-state vs. Intra-state detection
    supp_code = str(supplier_state_code or "03").strip().zfill(2)
    buy_code = str(buyer_state_code or "03").strip().zfill(2)
    is_inter_state = (supp_code != buy_code)
    supply_type = "INTER" if is_inter_state else "INTRA"

    if is_inter_state:
        alert_messages.append(
            f"Inter-State Supply Detected (State {supp_code} → {buy_code}): Auto-switched from CGST+SGST to full IGST."
        )

    math_errors_count = 0
    struck_out_count = 0
    dynamic_tax_rules_count = 0
    total_math_discrepancy = 0.0

    written_taxable_sum = 0.0
    audited_taxable_total = 0.0
    total_cgst = 0.0
    total_sgst = 0.0
    total_igst = 0.0

    # Grouping for HSN summary table
    hsn_summary_dict: Dict[str, Dict[str, Any]] = {}

    for idx, item in enumerate(items, start=1):
        raw_text = str(item.get("raw_text_on_paper") or item.get("raw_text") or "").strip()
        p_name = str(item.get("product_name_normalized") or raw_text or "Goods").strip()
        is_struck = bool(item.get("is_struck_out", False))
        written_total = round(float(item.get("written_line_total", 0.0)), 2)

        # 1. Struck-Out Items Isolation
        if is_struck:
            struck_out_count += 1
            reason = item.get("reason") or "Crossed out or cut with pen on receipt"
            struck_out_items.append({
                "row_id": item.get("row_id") or idx,
                "raw_text": raw_text,
                "written_line_total": written_total,
                "reason": reason
            })
            alert_messages.append(f"Row {idx} Struck Out: '{raw_text}' was excluded from taxable invoice (₹0.00).")
            continue

        # 2. Parse Vernacular Unit & Quantity
        raw_unit_str = item.get("raw_quantity") or item.get("raw_unit") or ""
        std_uqc, parsed_multiplier = normalize_indian_unit(raw_unit_str, raw_text)

        raw_qty = item.get("quantity")
        if raw_qty is not None and float(raw_qty) > 0:
            qty = float(raw_qty)
        else:
            qty = parsed_multiplier

        # 3. Unit Price Inference & Math Check
        raw_price = item.get("unit_price")
        if raw_price is not None and float(raw_price) > 0:
            price = round(float(raw_price), 2)
        else:
            price = round(written_total / qty, 2) if qty > 0 else written_total

        expected_total = round(qty * price, 2)
        math_diff = round(written_total - expected_total, 2)
        has_error = abs(math_diff) > 0.50

        if has_error:
            math_errors_count += 1
            total_math_discrepancy += math_diff
            math_note = (
                f"Math Discrepancy: Written ₹{written_total:.2f} vs Audited ₹{expected_total:.2f} "
                f"({qty} {std_uqc} @ ₹{price:.2f}) [Diff: ₹{math_diff:+.2f}]"
            )
            alert_messages.append(f"Row {idx} Math Error: {math_note}")
        else:
            math_note = None

        # Taxable line amount
        audited_line_total = expected_total if (apply_math_fix or not has_error) else expected_total

        # 4. HSN Matching & Threshold Logic
        manual_override = item.get("manual_hsn_override") or item.get("hsn_code")
        hsn_result = match_hsn(
            product_name_normalized=p_name,
            raw_text=raw_text,
            detected_sector=detected_sector,
            unit_price=price,
            unit=std_uqc
        )

        if manual_override and str(manual_override).strip() not in ("", "None", "9999"):
            final_hsn = str(manual_override).strip()
            category_desc = item.get("category_description") or hsn_result["category_description"]

            # Apply threshold check on manual override if in garment/footwear chapters
            hsn_prefix = final_hsn[:2]
            if hsn_prefix in ("61", "62", "63"):
                if price > 1000.0:
                    final_gst_rate = 12.0
                    tax_rule_triggered = True
                    tax_rule_note = f"Indian GST Threshold Rule (HSN {hsn_prefix}): Unit price ₹{price:.0f} > ₹1000 → Slab auto-upgraded from 5% to 12% GST"
                else:
                    final_gst_rate = 5.0
                    tax_rule_triggered = True
                    tax_rule_note = f"Indian GST Threshold Rule (HSN {hsn_prefix}): Unit price ₹{price:.0f} ≤ ₹1000 → Lower 5% GST slab applied"
            elif hsn_prefix == "64":
                if price > 1000.0:
                    final_gst_rate = 18.0
                    tax_rule_triggered = True
                    tax_rule_note = f"Indian GST Threshold Rule (HSN 64): Unit price ₹{price:.0f} > ₹1000 → Slab auto-upgraded from 12% to 18% GST"
                else:
                    final_gst_rate = 12.0
                    tax_rule_triggered = True
                    tax_rule_note = f"Indian GST Threshold Rule (HSN 64): Unit price ₹{price:.0f} ≤ ₹1000 → Lower 12% GST slab applied"
            else:
                user_rate = item.get("gst_rate")
                final_gst_rate = float(user_rate) if user_rate is not None else float(hsn_result["gst_rate"])
                tax_rule_triggered = False
                tax_rule_note = f"Manual HSN {final_hsn} applied"
        else:
            final_hsn = str(hsn_result["hsn_code"])
            category_desc = hsn_result["category_description"]
            final_gst_rate = float(hsn_result["gst_rate"])
            tax_rule_triggered = bool(hsn_result.get("tax_rule_triggered", False))
            tax_rule_note = hsn_result.get("tax_rule_note")

        if tax_rule_triggered and tax_rule_note:
            dynamic_tax_rules_count += 1
            alert_messages.append(f"Row {idx} GST Rule: {tax_rule_note}")

        # 5. Inter-State vs. Intra-State Tax Calculation
        if is_inter_state:
            igst_rate = final_gst_rate
            cgst_rate = 0.0
            sgst_rate = 0.0
            igst_amt = round(audited_line_total * (igst_rate / 100.0), 2)
            cgst_amt = 0.0
            sgst_amt = 0.0
            total_tax_amt = igst_amt
        else:
            igst_rate = 0.0
            cgst_rate = round(final_gst_rate / 2.0, 2)
            sgst_rate = round(final_gst_rate / 2.0, 2)
            igst_amt = 0.0
            cgst_amt = round(audited_line_total * (cgst_rate / 100.0), 2)
            sgst_amt = round(audited_line_total * (sgst_rate / 100.0), 2)
            total_tax_amt = round(cgst_amt + sgst_amt, 2)

        line_grand_total = round(audited_line_total + total_tax_amt, 2)

        active_item_dict = {
            "row_id": item.get("row_id") or idx,
            "raw_text": raw_text,
            "product_name_normalized": p_name,
            "quantity": qty,
            "raw_unit": raw_unit_str or std_uqc.lower(),
            "standard_uqc": std_uqc,
            "unit_price": price,
            "written_line_total": written_total,
            "audited_line_total": audited_line_total,
            "expected_line_total": expected_total,
            "has_math_error": has_error,
            "math_discrepancy": math_diff,
            "math_error_note": math_note,
            "hsn_code": final_hsn,
            "category_description": category_desc,
            "gst_rate": final_gst_rate,
            "cgst_rate": cgst_rate,
            "sgst_rate": sgst_rate,
            "igst_rate": igst_rate,
            "cgst_amount": cgst_amt,
            "sgst_amount": sgst_amt,
            "igst_amount": igst_amt,
            "total_tax_amount": total_tax_amt,
            "line_grand_total": line_grand_total,
            "total_with_tax": line_grand_total,
            "supply_type": supply_type,
            "confidence": float(item.get("confidence") or hsn_result.get("confidence", 0.90)),
            "tax_rule_triggered": tax_rule_triggered,
            "tax_rule_note": tax_rule_note,
            "top_3_alternatives": hsn_result.get("top_3_alternatives", [])
        }
        active_items.append(active_item_dict)

        written_taxable_sum += written_total
        audited_taxable_total += audited_line_total
        total_cgst += cgst_amt
        total_sgst += sgst_amt
        total_igst += igst_amt

        # Aggregate HSN Summary Table
        hsn_key = final_hsn
        if hsn_key not in hsn_summary_dict:
            hsn_summary_dict[hsn_key] = {
                "hsn_code": final_hsn,
                "description": category_desc[:30],
                "standard_uqc": std_uqc,
                "total_quantity": 0.0,
                "taxable_value": 0.0,
                "gst_rate": final_gst_rate,
                "cgst_amount": 0.0,
                "sgst_amount": 0.0,
                "igst_amount": 0.0,
                "total_tax": 0.0
            }
        hsn_summary_dict[hsn_key]["total_quantity"] += qty
        hsn_summary_dict[hsn_key]["taxable_value"] += audited_line_total
        hsn_summary_dict[hsn_key]["cgst_amount"] += cgst_amt
        hsn_summary_dict[hsn_key]["sgst_amount"] += sgst_amt
        hsn_summary_dict[hsn_key]["igst_amount"] += igst_amt
        hsn_summary_dict[hsn_key]["total_tax"] += total_tax_amt

    # Format HSN Summary Table rows
    hsn_summary_table = [
        {
            "hsn_code": row["hsn_code"],
            "description": row["description"],
            "standard_uqc": row["standard_uqc"],
            "total_quantity": round(row["total_quantity"], 3),
            "taxable_value": round(row["taxable_value"], 2),
            "gst_rate": round(row["gst_rate"], 2),
            "cgst_amount": round(row["cgst_amount"], 2),
            "sgst_amount": round(row["sgst_amount"], 2),
            "igst_amount": round(row["igst_amount"], 2),
            "total_tax": round(row["total_tax"], 2)
        }
        for row in hsn_summary_dict.values()
    ]

    # Summaries
    written_taxable_sum = round(written_taxable_sum, 2)
    audited_taxable_total = round(audited_taxable_total, 2)
    total_cgst = round(total_cgst, 2)
    total_sgst = round(total_sgst, 2)
    total_igst = round(total_igst, 2)
    total_tax = round(total_cgst + total_sgst + total_igst, 2)
    final_payable_pakka = round(audited_taxable_total + total_tax, 2)
    total_math_saved = round(max(0.0, written_taxable_sum - audited_taxable_total), 2)

    totals = {
        "written_grand_total": written_taxable_sum,
        "audited_taxable_total": audited_taxable_total,
        "total_cgst": total_cgst,
        "total_sgst": total_sgst,
        "total_igst": total_igst,
        "total_tax": total_tax,
        "supply_type": supply_type,
        "supplier_state_code": supp_code,
        "buyer_state_code": buy_code,
        "final_payable_pakka_total": final_payable_pakka,
        "total_math_saved": total_math_saved,
        "amount_in_words_inr": amount_in_words_inr(final_payable_pakka)
    }

    audit_alerts = {
        "math_errors_count": math_errors_count,
        "struck_out_count": struck_out_count,
        "dynamic_tax_rules_count": dynamic_tax_rules_count,
        "total_math_discrepancy_amount": round(total_math_discrepancy, 2),
        "alert_messages": alert_messages
    }

    return {
        "detected_sector": detected_sector,
        "active_items": active_items,
        "struck_out_items": struck_out_items,
        "audit_alerts": audit_alerts,
        "hsn_summary_table": hsn_summary_table,
        "totals": totals
    }


# ============================================================================
# Backward-Compatible Lane 1 Hooks (main.py Integration)
# ============================================================================

def audit_line_item(
    row_id: int,
    raw_text: str,
    product_name_normalized: str,
    quantity: float,
    written_line_total: float,
    unit_price: Optional[float] = None,
    raw_unit: Optional[str] = None,
    standard_uqc: Optional[str] = None,
    detected_sector: str = "GENERAL",
    confidence_score: float = 0.90,
    override_gst_rate: Optional[float] = None,
    override_hsn_code: Optional[str] = None,
    supplier_state_code: str = "03",
    buyer_state_code: str = "03"
) -> AuditedLineItem:
    """Audits a single active line item returning AuditedLineItem."""
    items = [{
        "row_id": row_id,
        "raw_text": raw_text,
        "product_name_normalized": product_name_normalized,
        "quantity": quantity,
        "written_line_total": written_line_total,
        "unit_price": unit_price,
        "raw_unit": raw_unit,
        "standard_uqc": standard_uqc,
        "confidence": confidence_score,
        "manual_hsn_override": override_hsn_code,
        "gst_rate": override_gst_rate
    }]
    res = audit_invoice_items(
        items=items,
        detected_sector=detected_sector,
        supplier_state_code=supplier_state_code,
        buyer_state_code=buyer_state_code
    )
    item_res = res["active_items"][0]

    return AuditedLineItem(
        row_id=row_id,
        line_number=row_id,
        raw_text=raw_text,
        raw_text_on_paper=raw_text,
        product_name_normalized=product_name_normalized,
        quantity=item_res["quantity"],
        raw_unit=item_res["raw_unit"],
        standard_uqc=item_res["standard_uqc"],
        unit_uqc=item_res["standard_uqc"],
        unit_price=item_res["unit_price"],
        written_line_total=item_res["written_line_total"],
        audited_line_total=item_res["audited_line_total"],
        has_math_error=item_res["has_math_error"],
        math_discrepancy=item_res["math_discrepancy"],
        hsn_code=item_res["hsn_code"],
        category_description=item_res["category_description"],
        hsn_description=item_res["category_description"],
        gst_rate=item_res["gst_rate"],
        cgst_rate=item_res["cgst_rate"],
        sgst_rate=item_res["sgst_rate"],
        cgst_amount=item_res["cgst_amount"],
        sgst_amount=item_res["sgst_amount"],
        igst_rate=item_res.get("igst_rate", 0.0),
        igst_amount=item_res.get("igst_amount", 0.0),
        supply_type=item_res.get("supply_type", "INTRA"),
        total_with_tax=item_res["total_with_tax"],
        final_line_total_with_gst=item_res["line_grand_total"],
        confidence=float(confidence_score),
        confidence_score=float(confidence_score),
        tax_rule_note=item_res["tax_rule_note"],
        top_3_alternatives=item_res["top_3_alternatives"],
        hsn_alternatives=item_res["top_3_alternatives"],
    )


def audit_and_calculate_invoice(
    raw_bill: Union[RawVisionBill, Dict[str, Any]],
    bill_id: str,
    enhanced_image_b64: Optional[str] = None,
    raw_image_b64: Optional[str] = None,
    model_used: str = "gemini-3.5-flash-lite",
    cache_hit: bool = False,
    supplier_state_code: str = "03",
    buyer_state_code: str = "03"
) -> AuditedInvoiceResponse:
    """Adapter function returning AuditedInvoiceResponse for FastAPI main.py."""
    if hasattr(raw_bill, "detected_sector"):
        sector = getattr(raw_bill, "detected_sector", "GENERAL")
        store_name = getattr(raw_bill, "merchant_name", None) or "Bharat Dukaan"
        raw_date = getattr(raw_bill, "raw_date_written", None) or "Today"
        raw_items = getattr(raw_bill, "items", [])
        items_payload = [
            {
                "row_id": getattr(it, "line_number", idx),
                "raw_text": getattr(it, "raw_text_on_paper", ""),
                "product_name_normalized": getattr(it, "product_name_normalized", ""),
                "quantity": getattr(it, "quantity", 1.0),
                "raw_quantity": getattr(it, "raw_quantity", ""),
                "unit_uqc": getattr(it, "unit_uqc", "PCS"),
                "unit_price": getattr(it, "unit_price", None),
                "written_line_total": getattr(it, "written_line_total", 0.0),
                "is_struck_out": getattr(it, "is_struck_out", False),
                "confidence": getattr(it, "confidence_score", 0.90)
            }
            for idx, it in enumerate(raw_items, start=1)
        ]
    else:
        sector = raw_bill.get("detected_sector", "GENERAL")
        store_name = raw_bill.get("merchant_name") or raw_bill.get("store_name_guess") or "Bharat Dukaan"
        raw_date = raw_bill.get("raw_date_written", "Today")
        items_payload = raw_bill.get("items", [])

    res = audit_invoice_items(
        items=items_payload,
        detected_sector=sector,
        supplier_state_code=supplier_state_code,
        buyer_state_code=buyer_state_code
    )

    active_objs = [
        AuditedLineItem(
            row_id=it["row_id"],
            raw_text=it["raw_text"],
            product_name_normalized=it["product_name_normalized"],
            quantity=it["quantity"],
            raw_unit=it["raw_unit"],
            standard_uqc=it["standard_uqc"],
            unit_price=it["unit_price"],
            written_line_total=it["written_line_total"],
            audited_line_total=it["audited_line_total"],
            has_math_error=it["has_math_error"],
            math_discrepancy=it["math_discrepancy"],
            hsn_code=it["hsn_code"],
            category_description=it["category_description"],
            gst_rate=it["gst_rate"],
            cgst_rate=it["cgst_rate"],
            sgst_rate=it["sgst_rate"],
            cgst_amount=it["cgst_amount"],
            sgst_amount=it["sgst_amount"],
            igst_rate=it.get("igst_rate", 0.0),
            igst_amount=it.get("igst_amount", 0.0),
            supply_type=it.get("supply_type", "INTRA"),
            total_with_tax=it["total_with_tax"],
            confidence=it["confidence"],
            tax_rule_note=it["tax_rule_note"],
            top_3_alternatives=it["top_3_alternatives"]
        )
        for it in res["active_items"]
    ]

    struck_objs = [
        StruckOutItem(
            row_id=st["row_id"],
            raw_text=st["raw_text"],
            written_line_total=st["written_line_total"],
            reason=st["reason"]
        )
        for st in res["struck_out_items"]
    ]

    tot = res["totals"]
    summary_obj = InvoiceSummary(
        written_grand_total=tot["written_grand_total"],
        audited_taxable_total=tot["audited_taxable_total"],
        total_math_saved=tot["total_math_saved"],
        total_cgst=tot["total_cgst"],
        total_sgst=tot["total_sgst"],
        total_igst=tot.get("total_igst", 0.0),
        total_tax=tot.get("total_tax", 0.0),
        supply_type=tot.get("supply_type", "INTRA"),
        final_payable_pakka_total=tot["final_payable_pakka_total"]
    )

    return AuditedInvoiceResponse(
        bill_id=bill_id,
        invoice_id=bill_id,
        detected_sector=sector,
        store_name_guess=store_name,
        merchant_name=store_name,
        raw_date_written=raw_date,
        normalized_date_iso="2026-10-31",
        model_used=model_used,
        cache_hit=cache_hit,
        raw_image_b64=raw_image_b64,
        enhanced_image_b64=enhanced_image_b64,
        enhanced_image_base64=enhanced_image_b64,
        active_items=active_objs,
        struck_out_items=struck_objs,
        summary=summary_obj
    )


# ============================================================================
# Self-Test Verification Suite
# ============================================================================

if __name__ == "__main__":
    import json

    print("================================================================================")
    print("RUNNING BHARAT GST VISION ENGINE - TEAMMATE 2 MODULE SELF-TEST")
    print("================================================================================")

    # --------------------------------------------------------------------------
    # Test 1: Kirana Bill
    # - Dedh peti Aashirvaad Atta -> 5% packed
    # - 2 kg Khulla Chawal -> 0% loose
    # - 3 Nag Lux Soap @ 45 = 145 -> catches ₹10 math error (3 * 45 = 135 vs 145)
    # - 1 kg Maida cut -> Struck-out item
    # --------------------------------------------------------------------------
    print("\n--- TEST 1: Kirana Bill ---")
    kirana_items = [
        {
            "row_id": 1,
            "raw_text": "Dedh peti Aashirvaad Atta",
            "product_name_normalized": "Aashirvaad Atta",
            "quantity": 1.5,
            "unit_price": 360.0,
            "written_line_total": 540.0,
            "is_struck_out": False
        },
        {
            "row_id": 2,
            "raw_text": "2 kg Khulla Chawal",
            "product_name_normalized": "Khulla Chawal",
            "quantity": 2.0,
            "unit_price": 40.0,
            "written_line_total": 80.0,
            "is_struck_out": False
        },
        {
            "row_id": 3,
            "raw_text": "3 Nag Lux Soap @ 45 = 145",
            "product_name_normalized": "Lux Soap",
            "quantity": 3.0,
            "unit_price": 45.0,
            "written_line_total": 145.0,  # Shopkeeper error: 3 * 45 = 135
            "is_struck_out": False
        },
        {
            "row_id": 4,
            "raw_text": "1 kg Maida cut",
            "product_name_normalized": "Maida",
            "quantity": 1.0,
            "unit_price": 35.0,
            "written_line_total": 35.0,
            "is_struck_out": True
        }
    ]

    res_kirana = audit_invoice_items(kirana_items, detected_sector="Kirana")

    # Assertions
    assert len(res_kirana["active_items"]) == 3, "Expected 3 active items in Kirana bill"
    assert len(res_kirana["struck_out_items"]) == 1, "Expected 1 struck-out item in Kirana bill"

    item_atta = res_kirana["active_items"][0]
    assert item_atta["gst_rate"] == 5.0, f"Expected 5% GST for packed atta, got {item_atta['gst_rate']}%"
    print(f"✅ Atta: Packaged Commodity Rule -> HSN {item_atta['hsn_code']} @ {item_atta['gst_rate']}% GST")

    item_rice = res_kirana["active_items"][1]
    assert item_rice["gst_rate"] == 0.0, f"Expected 0% GST for loose rice, got {item_rice['gst_rate']}%"
    print(f"✅ Rice: Loose Commodity Rule -> HSN {item_rice['hsn_code']} @ {item_rice['gst_rate']}% GST")

    item_soap = res_kirana["active_items"][2]
    assert item_soap["has_math_error"] is True, "Expected math error on Lux Soap (145 vs 135)"
    assert item_soap["math_discrepancy"] == 10.0, f"Expected math discrepancy +10.0, got {item_soap['math_discrepancy']}"
    print(f"✅ Lux Soap: Detected Shopkeeper Math Error -> Discrepancy ₹{item_soap['math_discrepancy']:.2f}")

    struck_item = res_kirana["struck_out_items"][0]
    assert struck_item["raw_text"] == "1 kg Maida cut"
    print(f"✅ Struck-Out: Excluded '{struck_item['raw_text']}' from taxable amount")
    print(f"   Amount in Words: {res_kirana['totals']['amount_in_words_inr']}")

    # --------------------------------------------------------------------------
    # Test 2: Textile Bill
    # - 10 Gaz Cotton Kapda @ 120 -> 5% unstitched
    # - 1 Cotton Kurti @ 850 -> 5% GST (<= 1000)
    # - 1 Heavy Wedding Suit @ 2400 -> 12% GST threshold rule (> 1000)
    # --------------------------------------------------------------------------
    print("\n--- TEST 2: Textile Bill ---")
    textile_items = [
        {
            "row_id": 1,
            "raw_text": "10 Gaz Cotton Kapda @ 120",
            "product_name_normalized": "Cotton Kapda",
            "quantity": 10.0,
            "unit_price": 120.0,
            "written_line_total": 1200.0,
            "is_struck_out": False
        },
        {
            "row_id": 2,
            "raw_text": "1 Cotton Kurti @ 850",
            "product_name_normalized": "Cotton Kurti",
            "quantity": 1.0,
            "unit_price": 850.0,
            "written_line_total": 850.0,
            "is_struck_out": False
        },
        {
            "row_id": 3,
            "raw_text": "1 Heavy Wedding Suit @ 2400",
            "product_name_normalized": "Heavy Wedding Suit",
            "quantity": 1.0,
            "unit_price": 2400.0,
            "written_line_total": 2400.0,
            "is_struck_out": False
        }
    ]

    res_textile = audit_invoice_items(textile_items, detected_sector="Textile")

    item_kapda = res_textile["active_items"][0]
    assert item_kapda["standard_uqc"] == "YD", f"Expected UQC 'YD' for Gaz, got {item_kapda['standard_uqc']}"
    assert item_kapda["gst_rate"] == 5.0, "Unstitched cotton fabric should be 5%"
    print(f"✅ Cotton Kapda: Normalized 10 Gaz -> 10 YD @ {item_kapda['gst_rate']}% GST")

    item_kurti = res_textile["active_items"][1]
    assert item_kurti["gst_rate"] == 5.0, f"Kurti <= 1000 should be 5%, got {item_kurti['gst_rate']}%"
    assert item_kurti["tax_rule_triggered"] is True
    print(f"✅ Kurti (₹850 <= ₹1,000): {item_kurti['tax_rule_note']}")

    item_suit = res_textile["active_items"][2]
    assert item_suit["gst_rate"] == 12.0, f"Wedding Suit > 1000 should be 12%, got {item_suit['gst_rate']}%"
    assert item_suit["tax_rule_triggered"] is True
    print(f"✅ Wedding Suit (₹2400 > ₹1,000): {item_suit['tax_rule_note']}")
    print(f"   Amount in Words: {res_textile['totals']['amount_in_words_inr']}")

    # --------------------------------------------------------------------------
    # Test 3: Hardware / Electronics Bill
    # - 4 Nag 9W LED Bulb @ 90 -> 12% GST
    # - 2 Bori UltraTech Cement @ 380 -> 28% GST
    # --------------------------------------------------------------------------
    print("\n--- TEST 3: Hardware / Electronics Bill ---")
    elec_hard_items = [
        {
            "row_id": 1,
            "raw_text": "4 Nag 9W LED Bulb @ 90",
            "product_name_normalized": "9W LED Bulb",
            "quantity": 4.0,
            "unit_price": 90.0,
            "written_line_total": 360.0,
            "is_struck_out": False
        },
        {
            "row_id": 2,
            "raw_text": "2 Bori UltraTech Cement @ 380",
            "product_name_normalized": "UltraTech Cement",
            "quantity": 2.0,
            "unit_price": 380.0,
            "written_line_total": 760.0,
            "is_struck_out": False
        }
    ]

    res_elec_hard = audit_invoice_items(elec_hard_items, detected_sector="Hardware")

    item_bulb = res_elec_hard["active_items"][0]
    assert item_bulb["gst_rate"] == 12.0, f"LED Bulb should be 12%, got {item_bulb['gst_rate']}%"
    print(f"✅ LED Bulb: HSN {item_bulb['hsn_code']} @ {item_bulb['gst_rate']}% GST")

    item_cement = res_elec_hard["active_items"][1]
    assert item_cement["standard_uqc"] == "BAG", f"Bori should normalize to BAG, got {item_cement['standard_uqc']}"
    assert item_cement["gst_rate"] == 28.0, f"Cement should be 28%, got {item_cement['gst_rate']}%"
    print(f"✅ Cement: Normalized 2 Bori -> 2 BAG, HSN {item_cement['hsn_code']} @ {item_cement['gst_rate']}% GST")
    print(f"   Amount in Words: {res_elec_hard['totals']['amount_in_words_inr']}")

    print("\n================================================================================")
    print("🎉 ALL SELF-TEST SCENARIOS PASSED WITH 100% ACCURACY!")
    print("================================================================================")
