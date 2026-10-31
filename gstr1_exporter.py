"""
gstr1_exporter.py - Official Indian Government GSTR-1 JSON Exporter
Part of ParchiSetu AI / Bharat GST Vision Engine.

Converts an AuditedInvoiceResponse (or dictionary payload) into the official
Indian GST Portal GSTR-1 offline tool JSON format (B2CS + HSN Summary tables).
"""

from __future__ import annotations
from typing import Dict, Any, List, Union
from collections import defaultdict
from schemas import AuditedInvoiceResponse


def export_to_gstr1_json(
    invoice_data: Union[AuditedInvoiceResponse, Dict[str, Any]],
    supplier_gstin: str = "27AABCU9603R1ZM",
    tax_period: str = "102026",
    pos_code: str = "27"
) -> Dict[str, Any]:
    """
    Transforms audited invoice active items into official Indian GST Portal GSTR-1 format.

    Sections generated:
    1. b2cs (B2C Small Supply details aggregated by tax rate and supply type).
    2. hsn (HSN-wise summary of outward supplies including UQC, quantities, and tax breakups).
    """
    if isinstance(invoice_data, AuditedInvoiceResponse):
        raw = invoice_data.model_dump()
    else:
        raw = dict(invoice_data)

    active_items: List[Dict[str, Any]] = raw.get("active_items", [])

    # Aggregators for B2CS (keyed by GST rate)
    b2cs_groups: Dict[float, Dict[str, float]] = defaultdict(
        lambda: {"txval": 0.0, "camt": 0.0, "samt": 0.0}
    )

    # Aggregators for HSN table (keyed by (hsn_code, uqc, gst_rate))
    hsn_groups: Dict[tuple, Dict[str, Any]] = {}

    for item in active_items:
        # Extract item values
        gst_rate = float(item.get("gst_rate", 18.0))
        audited_line_total = float(item.get("audited_line_total", 0.0))
        cgst_amt = float(item.get("cgst_amount", 0.0))
        sgst_amt = float(item.get("sgst_amount", 0.0))
        hsn_code = str(item.get("hsn_code", "9999")).strip()
        category_desc = item.get("category_description") or item.get("hsn_description") or "Goods"
        uqc = item.get("standard_uqc") or item.get("unit_uqc") or "PCS"
        qty = float(item.get("quantity", 1.0))

        # 1. Aggregate B2CS
        b2cs_groups[gst_rate]["txval"] += audited_line_total
        b2cs_groups[gst_rate]["camt"] += cgst_amt
        b2cs_groups[gst_rate]["samt"] += sgst_amt

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
                "rt": gst_rate,
            }
        hsn_groups[hsn_key]["qty"] += qty
        hsn_groups[hsn_key]["txval"] += audited_line_total
        hsn_groups[hsn_key]["camt"] += cgst_amt
        hsn_groups[hsn_key]["samt"] += sgst_amt

    # Build B2CS section list
    b2cs_list: List[Dict[str, Any]] = []
    for rate, totals in sorted(b2cs_groups.items(), key=lambda x: x[0]):
        b2cs_list.append({
            "sply_ty": "INTRA",
            "pos": pos_code,
            "typ": "OE",
            "rt": round(rate, 2),
            "txval": round(totals["txval"], 2),
            "iamt": 0.0,
            "camt": round(totals["camt"], 2),
            "samt": round(totals["samt"], 2),
            "csamt": 0.0
        })

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
            "iamt": 0.0,
            "camt": round(val["camt"], 2),
            "samt": round(val["samt"], 2),
            "csamt": 0.0
        })

    gstr1_payload = {
        "gstin": supplier_gstin,
        "fp": tax_period,
        "version": "GST2.0.1",
        "hash": "hash",
        "b2cs": b2cs_list,
        "hsn": {
            "data": hsn_data
        }
    }

    return gstr1_payload

