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
    cache_hit: bool = False,
    supplier_gstin: Optional[str] = None,
    supplier_state_code: Optional[str] = "03",
    buyer_gstin: Optional[str] = None,
    place_of_supply_state_code: Optional[str] = "03",
    is_inter_state: Optional[bool] = None,
) -> AuditedInvoiceResponse:
    """
    Core mathematical audit and statutory GST calculation engine.
    Audits every line item, handles discrepancies, checks dynamic thresholds,
    applies Intra-state (CGST+SGST) vs Inter-state (IGST) rules, embeds CBIC RAG citations,
    and returns an AuditedInvoiceResponse with compliance audit.
    """
    # 1. State & Interstate tax mode resolution
    eff_supp_gstin = supplier_gstin or getattr(raw_bill, "supplier_gstin", None)
    supp_val = validate_gstin(eff_supp_gstin)
    if supp_val["is_valid"]:
        eff_supp_state = supp_val["state_code"]
    else:
        eff_supp_state = str(supplier_state_code or "03").zfill(2)

    # If place_of_supply was default "03" but supplier is from another state, default POS to supplier state
    if (place_of_supply_state_code == "03" or not place_of_supply_state_code) and eff_supp_state != "03" and not supplier_gstin:
        eff_pos = eff_supp_state
    else:
        eff_pos = str(place_of_supply_state_code or eff_supp_state).zfill(2)

    # Statutory IGST Rule: Inter-State when Supplier State != Place of Supply State
    inter_state_flag = (eff_supp_state != eff_pos)

    buyer_val = validate_gstin(buyer_gstin)
    supply_mode = "B2B" if buyer_val["is_valid"] else "B2CS"

    active_items: List[AuditedLineItem] = []
    struck_out_items: List[StruckOutItem] = []

    written_taxable_sum = 0.0
    audited_taxable_total = 0.0
    total_cgst = 0.0
    total_sgst = 0.0
    total_igst = 0.0

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

        # 5. HSN Matching with dynamic slab calculation & Statutory CBIC RAG
        hsn_info = match_hsn_item(
            product_name_normalized=item.product_name_normalized,
            raw_text=item.raw_text_on_paper,
            item_sector=raw_bill.detected_sector,
            unit_price=unit_price
        )

        gst_rate = float(hsn_info["gst_rate"])

        # 6. Intra-State (CGST + SGST) vs Inter-State (IGST) Split
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
                igst_rate=igst_rate,
                cgst_amount=cgst_amount,
                sgst_amount=sgst_amount,
                igst_amount=igst_amount,
                total_with_tax=total_with_tax,
                final_line_total_with_gst=total_with_tax,
                confidence=float(item.confidence_score or hsn_info.get("confidence", 0.90)),
                confidence_score=float(item.confidence_score or hsn_info.get("confidence", 0.90)),
                tax_rule_note=hsn_info.get("tax_rule_note"),
                cbic_schedule=hsn_info.get("cbic_schedule"),
                statutory_chapter_note=hsn_info.get("statutory_chapter_note"),
                rag_citation=hsn_info.get("rag_citation"),
                top_3_alternatives=hsn_info.get("top_3_alternatives", []),
                hsn_alternatives=hsn_info.get("top_3_alternatives", [])
            )
        )

    # 7. Grand total summaries
    written_grand_total = (
        float(raw_bill.written_grand_total)
        if raw_bill.written_grand_total is not None and raw_bill.written_grand_total > 0
        else round(written_taxable_sum, 2)
    )

    extra_charges = float(raw_bill.extra_charges or 0.0)
    discount_amount = float(raw_bill.discount_amount or 0.0)

    total_math_saved = round(max(0.0, written_grand_total - audited_taxable_total), 2)
    final_payable_pakka = round(
        audited_taxable_total + total_cgst + total_sgst + total_igst + extra_charges - discount_amount, 2
    )

    summary = InvoiceSummary(
        written_grand_total=round(written_grand_total, 2),
        audited_taxable_total=round(audited_taxable_total, 2),
        total_math_saved=total_math_saved,
        extra_charges=extra_charges,
        discount_amount=discount_amount,
        total_cgst=round(total_cgst, 2),
        total_sgst=round(total_sgst, 2),
        total_igst=round(total_igst, 2),
        final_payable_pakka_total=final_payable_pakka
    )

    # 8. Statutory Compliance Audit
    compliance_audit = validate_invoice_compliance(
        invoice_data={
            "merchant_name": raw_bill.merchant_name,
            "store_name_guess": raw_bill.merchant_name,
            "raw_date_written": raw_bill.raw_date_written,
            "normalized_date_iso": "2026-10-31",
            "active_items": [i.model_dump() for i in active_items],
            "supplier_state_code": eff_supp_state,
            "place_of_supply_state_code": eff_pos,
        },
        supplier_gstin=eff_supp_gstin,
        buyer_gstin=buyer_gstin,
        pos_state_code=eff_pos
    )

    inv_num = getattr(raw_bill, "invoice_id", None) or bill_id
    store_addr = getattr(raw_bill, "store_address", None)

    return AuditedInvoiceResponse(
        bill_id=bill_id,
        invoice_id=inv_num,
        detected_sector=raw_bill.detected_sector,
        store_name_guess=raw_bill.merchant_name or "Bharat Kacha Dukaan",
        merchant_name=raw_bill.merchant_name or "Bharat Kacha Dukaan",
        store_address=store_addr,
        supplier_gstin=eff_supp_gstin,
        supplier_state_code=eff_supp_state,
        supplier_state_name=INDIAN_STATES.get(eff_supp_state, "Punjab"),
        buyer_gstin=buyer_gstin,
        buyer_state_code=buyer_val.get("state_code"),
        buyer_state_name=buyer_val.get("state_name"),
        place_of_supply_state_code=eff_pos,
        place_of_supply_state_name=INDIAN_STATES.get(eff_pos, "Punjab"),
        is_inter_state=inter_state_flag,
        supply_type_b2b=supply_mode,
        customer_name=raw_bill.customer_name,
        customer_phone=raw_bill.customer_phone,
        customer_address=raw_bill.customer_address,
        extra_charges=extra_charges,
        discount_amount=discount_amount,
        raw_date_written=raw_bill.raw_date_written or "Today",
        normalized_date_iso="2026-10-31",
        compliance_audit=compliance_audit,
        model_used=model_used,
        cache_hit=cache_hit,
        raw_image_b64=raw_image_b64,
        enhanced_image_b64=enhanced_image_b64,
        enhanced_image_base64=enhanced_image_b64,
        active_items=active_items,
        struck_out_items=struck_out_items,
        summary=summary
    )
