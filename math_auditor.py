"""
math_auditor.py - Deterministic Shopkeeper Math Auditor & GST Calculator
Part of ParchiSetu AI / Bharat GST Vision Engine (Lane 2).

Performs:
1. Missing unit-price inference: unit_price = round(written_line_total / quantity, 2).
2. Calculation error detection: has_math_error = abs((quantity * unit_price) - written_line_total) > 0.50.
3. Struck-out / cancelled item exclusion into struck_out_items (₹0 GST impact).
4. Full HSN matching & slab assignment using hsn_matcher.py.
5. Exact CGST / SGST 50-50 splits and summary total calculations.
"""

from __future__ import annotations
import logging
from typing import Optional, List, Dict, Any

from schemas import (
    RawVisionBill,
    RawVisionLineItem,
    AuditedLineItem,
    StruckOutItem,
    InvoiceSummary,
    AuditedInvoiceResponse,
)
from hsn_matcher import match_hsn_item

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


def audit_and_calculate_invoice(
    raw_bill: RawVisionBill,
    bill_id: str,
    enhanced_image_b64: Optional[str] = None,
    raw_image_b64: Optional[str] = None,
    model_used: str = "gemini-3.5-flash-lite",
    cache_hit: bool = False
) -> AuditedInvoiceResponse:
    """
    Core mathematical audit and GST calculation engine.
    Audits every line item, handles discrepancies, checks dynamic thresholds,
    and returns an AuditedInvoiceResponse.
    """
    active_items: List[AuditedLineItem] = []
    struck_out_items: List[StruckOutItem] = []

    written_taxable_sum = 0.0
    audited_taxable_total = 0.0
    total_cgst = 0.0
    total_sgst = 0.0

    for idx, item in enumerate(raw_bill.items, start=1):
        # 1. Filter out struck-out / cancelled items
        if item.is_struck_out:
            struck_out_items.append(
                StruckOutItem(
                    row_id=idx,
                    raw_text=item.raw_text_on_paper,
                    written_line_total=float(item.written_line_total),
                    reason="Pen cut / scratched off on paper receipt"
                )
            )
            continue

        # 2. Extract and infer unit price if missing
        qty = float(item.quantity) if item.quantity > 0 else 1.0
        written_total = float(item.written_line_total)
        written_taxable_sum += written_total

        if item.unit_price is not None and item.unit_price > 0:
            unit_price = float(item.unit_price)
        else:
            unit_price = round(written_total / qty, 2)

        # 3. Calculate audited math
        audited_line_total = round(qty * unit_price, 2)
        math_discrepancy = round(written_total - audited_line_total, 2)
        has_math_error = abs(math_discrepancy) > 0.50

        # 4. Standardize UQC
        standard_uqc = item.unit_uqc or normalize_uqc(item.raw_quantity)

        # 5. HSN Matching with dynamic slab calculation
        hsn_info = match_hsn_item(
            product_name_normalized=item.product_name_normalized,
            raw_text=item.raw_text_on_paper,
            item_sector=raw_bill.detected_sector,
            unit_price=unit_price
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
                raw_text=item.raw_text_on_paper,
                raw_text_on_paper=item.raw_text_on_paper,
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
                cgst_amount=cgst_amount,
                sgst_amount=sgst_amount,
                total_with_tax=total_with_tax,
                final_line_total_with_gst=total_with_tax,
                confidence=float(item.confidence_score or hsn_info.get("confidence", 0.90)),
                confidence_score=float(item.confidence_score or hsn_info.get("confidence", 0.90)),
                tax_rule_note=hsn_info.get("tax_rule_note"),
                top_3_alternatives=hsn_info.get("top_3_alternatives", []),
                hsn_alternatives=hsn_info.get("top_3_alternatives", [])
            )
        )

    # 6. Grand total summaries
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

    return AuditedInvoiceResponse(
        bill_id=bill_id,
        invoice_id=bill_id,
        detected_sector=raw_bill.detected_sector,
        store_name_guess=raw_bill.merchant_name or "Bharat Kacha Dukaan",
        merchant_name=raw_bill.merchant_name or "Bharat Kacha Dukaan",
        customer_name=raw_bill.customer_name,
        customer_phone=raw_bill.customer_phone,
        customer_address=raw_bill.customer_address,
        extra_charges=extra_charges,
        discount_amount=discount_amount,
        raw_date_written=raw_bill.raw_date_written or "Today",
        normalized_date_iso="2026-10-31",
        model_used=model_used,
        cache_hit=cache_hit,
        raw_image_b64=raw_image_b64,
        enhanced_image_b64=enhanced_image_b64,
        enhanced_image_base64=enhanced_image_b64,
        active_items=active_items,
        struck_out_items=struck_out_items,
        summary=summary
    )
