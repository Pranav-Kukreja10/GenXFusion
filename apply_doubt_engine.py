"""
apply_doubt_engine.py - Implements Strict Zero-Hallucination & Doubt Engine in math_auditor.py & main.py
"""
from pathlib import Path

NEW_MATH_AUDITOR = '''"""
math_auditor.py - Deterministic Shopkeeper Math Auditor & GST Calculator
Part of ParchiSetu AI / Bharat GST Vision Engine (Lane 2).

Enforces:
1. Strict Zero-Hallucination: Zero silent defaulting of merchant name, GSTIN, or dates.
2. Doubt Detection Engine: Generates BLOCKING and WARNING DoubtItem objects for ambiguous receipts.
3. Lumpsum Total Detection: Flags bills with lumpsum totals where individual row rates are missing.
4. Rupee slash notation healing: "@ - 1400/-" misread as Qty 2 healed to Qty 1.0.
5. Hindi unit digit merge healing: "2 बोरा" misread as Qty 21 healed algebraically to Qty 2.0.
6. Missing unit-price derivation: unit_price = round(written_line_total / quantity, 2).
7. Full HSN matching & slab assignment using hsn_matcher.py.
8. Exact CGST / SGST 50-50 splits and summary total calculations.
"""

from __future__ import annotations
import logging
import re
from typing import Optional, List, Dict, Any, Union

from schemas import (
    RawVisionBill,
    RawVisionLineItem,
    AuditedLineItem,
    StruckOutItem,
    InvoiceSummary,
    AuditedInvoiceResponse,
    DoubtItem,
)
from hsn_matcher import match_hsn_item
from gst_validator import validate_gstin, validate_invoice_compliance, INDIAN_STATES

logger = logging.getLogger("math_auditor")
logging.basicConfig(level=logging.INFO)

# Regional unit normalization dictionary
REGIONAL_UNIT_NORMALIZATION = {
    "nag": "PCS",
    "piece": "PCS",
    "pc": "PCS",
    "pcs": "PCS",
    "peti": "BOX",
    "dabba": "BOX",
    "box": "BOX",
    "thaan": "MTR",
    "than": "MTR",
    "meter": "MTR",
    "mtr": "MTR",
    "m": "MTR",
    "gaz": "YD",
    "gaj": "YD",
    "yard": "YD",
    "katta": "BAG",
    "bori": "BAG",
    "bag": "BAG",
    "bora": "BAG",
    "बोरा": "BAG",
    "बोरी": "BAG",
    "बैग": "BAG",
    "patta": "STRP",
    "strip": "STRP",
    "jodi": "PAR",
    "pair": "PAR",
    "darjan": "DOZ",
    "dozen": "DOZ",
    "kilo": "KGS",
    "kg": "KGS",
    "kgs": "KGS",
    "gram": "KGS",
    "gm": "KGS",
    "ltr": "LTR",
    "litre": "LTR",
}


def normalize_uqc(raw_unit: Optional[str], default_uqc: str = "PCS") -> str:
    """Normalize regional unit expressions to standard GST UQC."""
    if not raw_unit:
        return default_uqc
    clean = raw_unit.lower().strip()
    return REGIONAL_UNIT_NORMALIZATION.get(clean, default_uqc.upper())


def detect_doubts(
    raw_bill: RawVisionBill,
    active_items: List[AuditedLineItem],
    written_grand_total: float,
    written_subtotal: float,
    supp_val: Dict[str, Any],
    eff_supp_gstin: Optional[str],
    normalized_date_iso: Optional[str],
    merchant_name: Optional[str],
) -> List[DoubtItem]:
    """
    Evaluates invoice for all ambiguities, missing mandatory details, and math discrepancies.
    Returns list of DoubtItem objects categorized by severity (BLOCKING vs WARNING).
    """
    doubts: List[DoubtItem] = []

    # -------------------------------------------------------------------------
    # Case 1: Lumpsum Total Written on Slip, Individual Item Prices Missing
    # -------------------------------------------------------------------------
    eff_written_total = max(float(written_grand_total or 0.0), float(written_subtotal or 0.0))
    unpriced_items = [
        it for it in active_items
        if it.written_line_total <= 0 and (it.unit_price <= 0 or it.written_line_total == 0)
    ]

    if len(unpriced_items) > 0 and eff_written_total > 0:
        doubts.append(
            DoubtItem(
                doubt_id="doubt_lumpsum_total",
                field_type="MISSING_LINE_PRICES_WITH_LUMPSUM",
                severity="BLOCKING",
                detected_value=eff_written_total,
                message=(
                    f"Receipt has a written total of ₹{eff_written_total:,.2f}, but individual rates for "
                    f"{len(unpriced_items)} items are not written on the slip. Please enter individual item rates or confirm consolidated billing."
                ),
                suggested_resolution="Enter individual item rates in the table, or apply the lumpsum total as a consolidated combo.",
            )
        )
    elif len(unpriced_items) > 0 and eff_written_total == 0:
        for it in unpriced_items:
            doubts.append(
                DoubtItem(
                    doubt_id=f"doubt_missing_price_row_{it.row_id}",
                    field_type="MISSING_LINE_PRICE",
                    severity="WARNING",
                    line_number=it.row_id,
                    message=f"Row {it.row_id} ('{it.product_name_normalized}'): No rate or line total written on receipt.",
                    suggested_resolution="Enter unit price or line total in table.",
                )
            )

    # -------------------------------------------------------------------------
    # Case 3: Missing Mandatory Header Details
    # -------------------------------------------------------------------------
    # Merchant Name
    if not merchant_name or merchant_name.strip().lower() in ("bharat kacha dukaan", "unknown", "none", "", "unspecified store", "indian dukaan store", "bharat store"):
        doubts.append(
            DoubtItem(
                doubt_id="doubt_missing_merchant",
                field_type="MISSING_MERCHANT_NAME",
                severity="WARNING",
                message="Merchant/Store Name not found on receipt — please enter manually.",
                suggested_resolution="Type store name in header or banner.",
            )
        )

    # Supplier GSTIN
    if not eff_supp_gstin or str(eff_supp_gstin).strip().lower() in ("", "none", "null"):
        doubts.append(
            DoubtItem(
                doubt_id="doubt_missing_supplier_gstin",
                field_type="MISSING_SUPPLIER_GSTIN",
                severity="WARNING",
                message="Supplier GSTIN not present on receipt — please enter 15-digit GSTIN (or proceed as Unregistered/B2CS).",
                suggested_resolution="Enter 15-digit GSTIN or keep as unregistered B2CS.",
            )
        )
    else:
        # Supplier GSTIN present -> check checksum
        if not supp_val.get("is_valid", False):
            doubts.append(
                DoubtItem(
                    doubt_id="doubt_invalid_gstin_checksum",
                    field_type="INVALID_GSTIN_CHECKSUM",
                    severity="BLOCKING",
                    detected_value=eff_supp_gstin,
                    message=f"Supplier GSTIN '{eff_supp_gstin}' failed validation: {supp_val.get('error_reason') or 'Invalid Mod-36 checksum or format'}",
                    suggested_resolution="Correct the 15th check digit or re-type the 15-digit GSTIN.",
                )
            )

    # Invoice Date
    if not normalized_date_iso or str(normalized_date_iso).strip().lower() in ("", "none", "null"):
        doubts.append(
            DoubtItem(
                doubt_id="doubt_missing_invoice_date",
                field_type="MISSING_INVOICE_DATE",
                severity="WARNING",
                message="Invoice Date not found on receipt — please select the invoice date.",
                suggested_resolution="Select invoice date using the date picker.",
            )
        )

    # -------------------------------------------------------------------------
    # Case 4: Row Multiplication Discrepancy
    # -------------------------------------------------------------------------
    for it in active_items:
        if it.written_line_total > 0 and it.unit_price > 0 and not it.ocr_self_healed_note:
            math_diff = abs((it.quantity * it.unit_price) - it.written_line_total)
            if math_diff > 0.50:
                doubts.append(
                    DoubtItem(
                        doubt_id=f"doubt_math_row_{it.row_id}",
                        field_type="MATH_DISCREPANCY",
                        severity="WARNING",
                        line_number=it.row_id,
                        detected_value=it.written_line_total,
                        message=(
                            f"Row {it.row_id} ('{it.product_name_normalized}'): Handwritten Qty ({it.quantity}) × "
                            f"Rate (₹{it.unit_price:,.2f}) = ₹{it.quantity * it.unit_price:,.2f}, but written total on paper is ₹{it.written_line_total:,.2f}. Discrepancy: ₹{math_diff:,.2f}."
                        ),
                        suggested_resolution="Verify whether the handwritten rate or line total is the intended figure.",
                    )
                )

    # -------------------------------------------------------------------------
    # Case 5: Low OCR Confidence
    # -------------------------------------------------------------------------
    for it in active_items:
        if it.confidence < 0.65:
            doubts.append(
                DoubtItem(
                    doubt_id=f"doubt_confidence_row_{it.row_id}",
                    field_type="LOW_OCR_CONFIDENCE",
                    severity="WARNING",
                    line_number=it.row_id,
                    detected_value=f"{it.confidence * 100:.0f}%",
                    message=f"Row {it.row_id} ('{it.product_name_normalized}') has low ink clarity / legibility ({it.confidence * 100:.0f}% confidence). Please verify details.",
                    suggested_resolution="Confirm product name and numbers against original receipt image.",
                )
            )

    return doubts


def audit_and_calculate_invoice(
    raw_bill: RawVisionBill,
    bill_id: str,
    enhanced_image_b64: Optional[str] = None,
    raw_image_b64: Optional[str] = None,
    model_used: str = "gemini-3.5-flash-lite",
    cache_hit: bool = False,
    supplier_gstin: Optional[str] = None,
    supplier_state_code: Optional[str] = None,
    buyer_gstin: Optional[str] = None,
    place_of_supply_state_code: Optional[str] = None,
    is_inter_state: Optional[bool] = None,
) -> AuditedInvoiceResponse:
    """
    Core mathematical audit and statutory GST calculation engine.
    Audits every line item, handles discrepancies, checks dynamic thresholds,
    applies Intra-state (CGST+SGST) vs Inter-state (IGST) rules, embeds CBIC RAG citations,
    detects doubts and compliance blockers, and returns AuditedInvoiceResponse.
    """
    # 1. Merchant Name (Zero Silent Autofill)
    raw_merchant = getattr(raw_bill, "merchant_name", None)
    if raw_merchant and raw_merchant.strip().lower() not in ("none", "null", "unknown", ""):
        merchant_name = raw_merchant.strip()
    else:
        merchant_name = None

    # 2. State & Interstate tax mode resolution (Zero Silent Autofill)
    eff_supp_gstin = supplier_gstin or getattr(raw_bill, "supplier_gstin", None)
    if eff_supp_gstin and str(eff_supp_gstin).strip().lower() in ("none", "null", ""):
        eff_supp_gstin = None

    supp_val = validate_gstin(eff_supp_gstin) if eff_supp_gstin else {"is_valid": False, "state_code": None, "state_name": None}
    if supp_val["is_valid"]:
        eff_supp_state = supp_val["state_code"]
    elif supplier_state_code:
        eff_supp_state = str(supplier_state_code).zfill(2)
    else:
        eff_supp_state = None

    supp_state_name = INDIAN_STATES.get(eff_supp_state) if eff_supp_state else None

    # Place of supply
    if place_of_supply_state_code:
        eff_pos = str(place_of_supply_state_code).zfill(2)
    else:
        eff_pos = eff_supp_state

    pos_state_name = INDIAN_STATES.get(eff_pos) if eff_pos else None

    # Statutory IGST Rule: Inter-State when Supplier State != Place of Supply State
    if is_inter_state is not None:
        inter_state_flag = bool(is_inter_state)
    else:
        inter_state_flag = bool(eff_supp_state and eff_pos and (eff_supp_state != eff_pos))

    buyer_val = validate_gstin(buyer_gstin)
    supply_mode = "B2B" if buyer_val["is_valid"] else "B2CS"

    # 3. Date Resolution (Zero Silent Autofill)
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

    active_items: List[AuditedLineItem] = []
    struck_out_items: List[StruckOutItem] = []

    written_taxable_sum = 0.0
    audited_taxable_total = 0.0
    total_cgst = 0.0
    total_sgst = 0.0
    total_igst = 0.0

    for idx, item in enumerate(raw_bill.items, start=1):
        # Filter out struck-out / cancelled items
        if item.is_struck_out:
            struck_out_items.append(
                StruckOutItem(
                    row_id=idx,
                    raw_text=item.raw_text_on_paper,
                    written_line_total=float(item.written_line_total or 0.0),
                    reason="Pen cut / scratched off on paper receipt"
                )
            )
            continue

        raw_text_on_paper = str(getattr(item, "raw_text_on_paper", None) or getattr(item, "raw_text", "") or "")
        qty = float(item.quantity) if item.quantity > 0 else 1.0
        written_total = float(item.written_line_total or 0.0)
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

        # Algebraic Step C: Missing Unit Price Derivation (when line total exists)
        if written_total > 0 and qty > 0 and (unit_price is None or unit_price == 0):
            unit_price = round(written_total / qty, 2)
            if not ocr_self_healed_note:
                ocr_self_healed_note = f"Derived unit price: ₹{unit_price:.2f} (Total ₹{written_total:.2f} ÷ Qty {qty})"
        elif unit_price is None:
            unit_price = 0.0

        # Calculate audited math
        audited_line_total = round(qty * unit_price, 2)
        math_discrepancy = round(written_total - audited_line_total, 2)
        has_math_error = abs(math_discrepancy) > 0.50

        # If healed algebraically or unpriced lumpsum row, ensure has_math_error is False
        if ocr_self_healed_note and abs(math_discrepancy) <= 0.50:
            has_math_error = False
            math_discrepancy = 0.0
        elif written_total == 0.0 and unit_price == 0.0:
            has_math_error = False
            math_discrepancy = 0.0

        # Standardize UQC
        standard_uqc = item.unit_uqc or normalize_uqc(item.raw_quantity)

        # HSN Matching with dynamic slab calculation & Statutory CBIC RAG
        written_hsn = getattr(item, "written_hsn_code", None)
        sug_hsn = getattr(item, "suggested_hsn_4digit", None)
        sug_slab = getattr(item, "suggested_gst_slab", None)

        hsn_info = match_hsn_item(
            product_name_normalized=item.product_name_normalized,
            raw_text=raw_text_on_paper,
            item_sector=raw_bill.detected_sector,
            unit_price=unit_price,
            written_hsn_code=written_hsn,
            suggested_hsn_4digit=sug_hsn,
            suggested_gst_slab=sug_slab
        )

        gst_rate = float(hsn_info["gst_rate"])

        # Intra-State (CGST + SGST) vs Inter-State (IGST) Split
        if inter_state_flag:
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

        active_items.append(
            AuditedLineItem(
                row_id=idx,
                line_number=idx,
                raw_text=raw_text_on_paper,
                raw_text_on_paper=raw_text_on_paper,
                product_name_normalized=item.product_name_normalized,
                quantity=qty,
                raw_unit=item.raw_quantity,
                standard_uqc=standard_uqc,
                unit_uqc=standard_uqc,
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
                igst_rate=igst_rate,
                cgst_amount=cgst_amount,
                sgst_amount=sgst_amount,
                igst_amount=igst_amount,
                total_with_tax=total_with_tax,
                final_line_total_with_gst=total_with_tax,
                confidence=float(item.confidence_score or hsn_info.get("confidence", 0.90)),
                confidence_score=float(item.confidence_score or hsn_info.get("confidence", 0.90)),
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

    # Grand total summaries
    written_grand_total = (
        float(raw_bill.written_grand_total)
        if raw_bill.written_grand_total is not None and raw_bill.written_grand_total > 0
        else round(written_taxable_sum, 2)
    )
    written_subtotal = float(getattr(raw_bill, "written_subtotal", None) or 0.0)

    extra_charges = float(raw_bill.extra_charges or 0.0)
    discount_amount = float(raw_bill.discount_amount or 0.0)

    total_math_saved = round(max(0.0, written_grand_total - audited_taxable_total), 2)
    final_payable_pakka = round(
        audited_taxable_total + total_cgst + total_sgst + total_igst + extra_charges - discount_amount, 2
    )

    summary = InvoiceSummary(
        written_grand_total=written_grand_total,
        audited_taxable_total=audited_taxable_total,
        total_math_saved=total_math_saved,
        total_cgst=round(total_cgst, 2),
        total_sgst=round(total_sgst, 2),
        total_igst=round(total_igst, 2),
        extra_charges=extra_charges,
        discount_amount=discount_amount,
        final_payable_pakka_total=final_payable_pakka,
    )

    # Statutory GST Compliance Audit
    compliance_audit = validate_invoice_compliance({
        "supplier_gstin": eff_supp_gstin,
        "merchant_name": merchant_name,
        "raw_date_written": raw_date_written,
        "normalized_date_iso": normalized_date_iso,
        "invoice_id": raw_bill.invoice_id,
        "buyer_gstin": buyer_gstin,
        "items": [it.model_dump() for it in active_items],
        "place_of_supply": eff_pos,
        "supplier_state": eff_supp_state,
    })

    # Strict Doubt Detection
    pending_doubts = detect_doubts(
        raw_bill=raw_bill,
        active_items=active_items,
        written_grand_total=written_grand_total,
        written_subtotal=written_subtotal,
        supp_val=supp_val,
        eff_supp_gstin=eff_supp_gstin,
        normalized_date_iso=normalized_date_iso,
        merchant_name=merchant_name,
    )

    is_100_percent_compliant = (
        len([d for d in pending_doubts if d.severity == "BLOCKING"]) == 0
        and eff_supp_gstin is not None
        and supp_val.get("is_valid", False)
        and normalized_date_iso is not None
        and len(active_items) > 0
        and audited_taxable_total > 0
    )

    return AuditedInvoiceResponse(
        bill_id=bill_id,
        detected_sector=raw_bill.detected_sector,
        store_name_guess=merchant_name,
        merchant_name=merchant_name,
        supplier_gstin=eff_supp_gstin,
        extracted_supplier_gstin=eff_supp_gstin,
        supplier_state_code=eff_supp_state,
        supplier_state_name=supp_state_name,
        invoice_id=raw_bill.invoice_id,
        bill_number=raw_bill.invoice_id,
        store_address=raw_bill.store_address,
        raw_date_written=raw_date_written,
        raw_date_text=raw_date_text,
        normalized_date_iso=normalized_date_iso,
        date_source=date_source,
        customer_name=raw_bill.customer_name,
        customer_phone=raw_bill.customer_phone,
        customer_address=raw_bill.customer_address,
        buyer_gstin=buyer_gstin,
        place_of_supply_state_code=eff_pos,
        place_of_supply_state_name=pos_state_name,
        is_inter_state=inter_state_flag,
        supply_type=supply_mode,
        is_100_percent_compliant=is_100_percent_compliant,
        pending_doubts=pending_doubts,
        raw_image_b64=raw_image_b64 or "",
        enhanced_image_b64=enhanced_image_b64 or "",
        active_items=active_items,
        items=active_items,
        struck_out_items=struck_out_items,
        summary=summary,
        compliance_audit=compliance_audit,
        model_used=model_used,
        cache_hit=cache_hit
    )
'''

def main():
    for root in [Path("."), Path("backend")]:
        target = root / "math_auditor.py"
        print(f"Writing {target}...")
        with open(target, "w", encoding="utf-8") as f:
            f.write(NEW_MATH_AUDITOR.strip() + "\n")
    print("Done upgrading math_auditor.py!")

if __name__ == "__main__":
    main()

