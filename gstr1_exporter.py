"""
gstr1_exporter.py - Official Indian Government GSTR-1 JSON Exporter
Part of ParchiSetu AI / Bharat GST Vision Engine.

Converts an AuditedInvoiceResponse (or dictionary payload) into the official
Indian GST Portal GSTR-1 offline tool JSON format (supporting B2B, B2CS, and HSN Summary tables).
"""

from __future__ import annotations
from typing import Dict, Any, List, Union, Optional
from collections import defaultdict
from schemas import AuditedInvoiceResponse
from gst_validator import validate_gstin


def export_to_gstr1_json(
    invoice_data: Union[AuditedInvoiceResponse, Dict[str, Any]],
    supplier_gstin: Optional[str] = None,
    tax_period: str = "102026",
    pos_code: Optional[str] = None,
    buyer_gstin: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transforms audited invoice active items into official Indian GST Portal GSTR-1 format.

    Sections generated:
    1. b2b: If buyer has a valid GSTIN (Registered Recipient).
    2. b2cs: If unregistered retail consumer (B2C Small Supply details).
    3. hsn: HSN-wise summary of outward supplies including UQC, quantities, and tax breakups.
    """
    if isinstance(invoice_data, AuditedInvoiceResponse):
        raw = invoice_data.model_dump()
    else:
        raw = dict(invoice_data)

    active_items: List[Dict[str, Any]] = raw.get("active_items", [])
    summary = raw.get("summary", {})

    # Determine supplier GSTIN
    eff_supp_gstin = supplier_gstin or raw.get("supplier_gstin") or "03AAECP1807C1Z4"
    supp_val = validate_gstin(eff_supp_gstin)
    supp_state = supp_val.get("state_code") or raw.get("supplier_state_code") or "03"

    # Determine buyer GSTIN
    eff_buyer_gstin = buyer_gstin or raw.get("buyer_gstin")
    buyer_val = validate_gstin(eff_buyer_gstin)
    is_b2b = buyer_val["is_valid"]

    # Determine Place of Supply (POS)
    eff_pos = str(pos_code or raw.get("place_of_supply_state_code") or supp_state).zfill(2)
    is_inter_state = bool(raw.get("is_inter_state", supp_state != eff_pos))

    # Aggregators by GST rate
    rate_groups: Dict[float, Dict[str, float]] = defaultdict(
        lambda: {"txval": 0.0, "camt": 0.0, "samt": 0.0, "iamt": 0.0}
    )

    # Aggregators for HSN table (keyed by (hsn_code, uqc, gst_rate))
    hsn_groups: Dict[tuple, Dict[str, Any]] = {}

    for item in active_items:
        gst_rate = float(item.get("gst_rate", 18.0))
        audited_line_total = float(item.get("audited_line_total", 0.0))
        cgst_amt = float(item.get("cgst_amount", 0.0))
        sgst_amt = float(item.get("sgst_amount", 0.0))
        igst_amt = float(item.get("igst_amount", 0.0))

        # Recalculate tax if missing or mismatched
        if is_inter_state:
            if igst_amt == 0.0 and gst_rate > 0.0:
                igst_amt = round(audited_line_total * (gst_rate / 100.0), 2)
            cgst_amt = 0.0
            sgst_amt = 0.0
        else:
            if cgst_amt == 0.0 and sgst_amt == 0.0 and gst_rate > 0.0:
                half = round(gst_rate / 2.0, 2)
                cgst_amt = round(audited_line_total * (half / 100.0), 2)
                sgst_amt = round(audited_line_total * (half / 100.0), 2)
            igst_amt = 0.0

        hsn_code = str(item.get("hsn_code", "9999")).strip()
        category_desc = item.get("category_description") or item.get("hsn_description") or "Goods"
        uqc = item.get("standard_uqc") or item.get("unit_uqc") or "PCS"
        qty = float(item.get("quantity", 1.0))

        # 1. Aggregate Rate Groups
        rate_groups[gst_rate]["txval"] += audited_line_total
        rate_groups[gst_rate]["camt"] += cgst_amt
        rate_groups[gst_rate]["samt"] += sgst_amt
        rate_groups[gst_rate]["iamt"] += igst_amt

        # 2. Aggregate HSN Summary
        hsn_key = (hsn_code, uqc, gst_rate)
        if hsn_key not in hsn_groups:
            hsn_groups[hsn_key] = {
                "hsn_sc": hsn_code,
                "desc": category_desc,
                "uqc": uqc,
                "qty": 0.0,
                "txval": 0.0,
                "camt": 0.0,
                "samt": 0.0,
                "iamt": 0.0,
                "rt": gst_rate,
            }
        hsn_groups[hsn_key]["qty"] += qty
        hsn_groups[hsn_key]["txval"] += audited_line_total
        hsn_groups[hsn_key]["camt"] += cgst_amt
        hsn_groups[hsn_key]["samt"] += sgst_amt
        hsn_groups[hsn_key]["iamt"] += igst_amt

    # Build HSN summary data list
    hsn_data: List[Dict[str, Any]] = []
    for idx, (key, val) in enumerate(hsn_groups.items(), start=1):
        hsn_data.append({
            "num": idx,
            "hsn_sc": val["hsn_sc"],
            "desc": val["desc"][:30],
            "uqc": val["uqc"],
            "qty": round(val["qty"], 3),
            "txval": round(val["txval"], 2),
            "rt": round(val["rt"], 2),
            "iamt": round(val["iamt"], 2),
            "camt": round(val["camt"], 2),
            "samt": round(val["samt"], 2),
            "csamt": 0.0
        })

    # Invoice metadata (guaranteed <= 16 chars per CGST Rule 46(b))
    raw_inv = str(raw.get("invoice_id") or raw.get("bill_number") or raw.get("bill_id") or "INV-001").strip()
    if len(raw_inv) > 16:
        if len(raw_inv) >= 32 and all(c in "0123456789abcdefABCDEF" for c in raw_inv):
            invoice_num = f"INV-{raw_inv[:8].upper()}"
        else:
            invoice_num = raw_inv[:16]
    else:
        invoice_num = raw_inv
    # Format date as DD-MM-YYYY
    raw_date = raw.get("normalized_date_iso") or "2026-10-31"
    if "-" in raw_date and len(raw_date.split("-")) == 3:
        parts = raw_date.split("-")
        if len(parts[0]) == 4:
            inv_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        else:
            inv_date = raw_date
    else:
        inv_date = "31-10-2026"

    final_val = float(summary.get("final_payable_pakka_total", 0.0))
    if final_val <= 0:
        tot_tx = sum(v["txval"] for v in rate_groups.values())
        tot_c = sum(v["camt"] for v in rate_groups.values())
        tot_s = sum(v["samt"] for v in rate_groups.values())
        tot_i = sum(v["iamt"] for v in rate_groups.values())
        final_val = round(tot_tx + tot_c + tot_s + tot_i, 2)

    gstr1_payload: Dict[str, Any] = {
        "gstin": eff_supp_gstin,
        "fp": tax_period,
        "version": "GST2.0.1",
        "hash": "hash",
    }

    if is_b2b:
        # B2B Supply Section
        itms_list: List[Dict[str, Any]] = []
        for idx, (rate, totals) in enumerate(sorted(rate_groups.items(), key=lambda x: x[0]), start=1):
            itms_list.append({
                "num": idx,
                "itm_det": {
                    "rt": round(rate, 2),
                    "txval": round(totals["txval"], 2),
                    "iamt": round(totals["iamt"], 2),
                    "camt": round(totals["camt"], 2),
                    "samt": round(totals["samt"], 2),
                    "csamt": 0.0
                }
            })

        gstr1_payload["b2b"] = [
            {
                "ctin": buyer_val["gstin"],
                "inv": [
                    {
                        "inum": invoice_num,
                        "idt": inv_date,
                        "val": round(final_val, 2),
                        "pos": eff_pos,
                        "rchrg": "N",
                        "inv_typ": "R",
                        "itms": itms_list
                    }
                ]
            }
        ]
        gstr1_payload["b2cs"] = []
    else:
        # B2C Small Supplies Section
        b2cs_list: List[Dict[str, Any]] = []
        for rate, totals in sorted(rate_groups.items(), key=lambda x: x[0]):
            b2cs_list.append({
                "sply_ty": "INTER" if is_inter_state else "INTRA",
                "pos": eff_pos,
                "typ": "OE",
                "rt": round(rate, 2),
                "txval": round(totals["txval"], 2),
                "iamt": round(totals["iamt"], 2),
                "camt": round(totals["camt"], 2),
                "samt": round(totals["samt"], 2),
                "csamt": 0.0
            })
        gstr1_payload["b2cs"] = b2cs_list
        gstr1_payload["b2b"] = []

    gstr1_payload["hsn"] = {
        "data": hsn_data
    }

    return gstr1_payload
