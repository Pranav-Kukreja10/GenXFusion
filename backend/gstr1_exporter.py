"""
backend/gstr1_exporter.py - Official Indian Government GSTN GSTR-1 JSON Exporter
Part of ParchiSetu AI / Bharat GST Vision Engine (Teammate 2 Module).

Key Function:
generate_gstr1_json(audited_invoice: dict, supplier_gstin: str = "03AABCU9603R1ZM", fp: str = "102026") -> dict
- Output official GSTN GSTR-1 JSON schema (v3.1.6).
- Table 7: b2cs (grouped by rate with sply_ty='INTRA', pos=supplier_gstin[:2], txval, camt, samt).
- Table 12: hsn (data list with num, hsn_sc, desc, uqc, qty, txval, rt, camt, samt).
- Table 13: doc_issue (document issuance register).
"""

from __future__ import annotations

import re
import json
import logging
from typing import Dict, Any, List, Union, Optional
from collections import defaultdict

# Safe import from schemas
try:
    from schemas import AuditedInvoiceResponse
except Exception:
    AuditedInvoiceResponse = None  # type: ignore

logger = logging.getLogger("gstr1_exporter")

# Official State Code Map for Indian GST
GST_STATE_CODES: Dict[str, str] = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra & Nagar Haveli and Daman & Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
}

DEFAULT_GSTIN = "03AABCU9603R1ZM"
DEFAULT_TAX_PERIOD = "102026"


def validate_gstin(gstin: Optional[str]) -> bool:
    """Validates 15-character Indian GSTIN structure."""
    if not gstin:
        return False
    clean = str(gstin).strip().upper()
    pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
    return bool(re.match(pattern, clean))


def get_state_from_gstin(gstin: str) -> str:
    """Returns state name from first two digits of GSTIN."""
    clean = (gstin or DEFAULT_GSTIN).strip()[:2]
    return GST_STATE_CODES.get(clean, "Punjab")


def generate_gstr1_json(
    audited_invoice: Union[Any, Dict[str, Any]],
    supplier_gstin: str = "03AABCU9603R1ZM",
    fp: str = "102026",
    pos_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core function specified in Lane 2 requirement:
    generate_gstr1_json(audited_invoice: dict, supplier_gstin: str = "03AABCU9603R1ZM", fp: str = "102026") -> dict

    Builds official Indian GST Portal GSTR-1 JSON payload (v3.1.6).
    """
    # 1. Normalize input payload (dict or AuditedInvoiceResponse)
    if AuditedInvoiceResponse is not None and isinstance(audited_invoice, AuditedInvoiceResponse):
        raw = audited_invoice.model_dump()
    elif hasattr(audited_invoice, "model_dump"):
        raw = audited_invoice.model_dump()
    elif isinstance(audited_invoice, dict):
        raw = audited_invoice.get("invoice", audited_invoice)
    else:
        raw = dict(audited_invoice)

    # 2. Sanitize GSTIN & POS
    gstin = str(supplier_gstin or DEFAULT_GSTIN).strip().upper()
    if not validate_gstin(gstin):
        logger.warning(f"Invalid GSTIN '{gstin}'. Falling back to default '{DEFAULT_GSTIN}'.")
        gstin = DEFAULT_GSTIN

    supplier_state_code = gstin[:2]
    # Check for buyer state code in payload totals or top-level
    inferred_buyer_state = (
        raw.get("totals", {}).get("buyer_state_code")
        or raw.get("buyer_state_code")
        or raw.get("pos")
    )
    inferred_supply_type = raw.get("totals", {}).get("supply_type")

    pos = str(pos_code or inferred_buyer_state or supplier_state_code).strip()
    if len(pos) == 1:
        pos = "0" + pos
    if pos not in GST_STATE_CODES:
        pos = supplier_state_code

    is_intra_state = (supplier_state_code == pos and inferred_supply_type != "INTER")
    supply_type = "INTRA" if is_intra_state else "INTER"
    tax_period = str(fp or DEFAULT_TAX_PERIOD).strip()

    inv_num = str(raw.get("bill_id") or raw.get("invoice_id") or "INV-001")
    if len(inv_num) > 16:
        inv_num = inv_num[:16]

    active_items: List[Dict[str, Any]] = raw.get("active_items", [])

    # 3. Aggregations for B2CS and HSN Summary
    # B2CS grouped by rate: {rate: {txval, iamt, camt, samt}}
    b2cs_groups: Dict[float, Dict[str, float]] = defaultdict(
        lambda: {"txval": 0.0, "iamt": 0.0, "camt": 0.0, "samt": 0.0}
    )

    # HSN groups: {(hsn_code, uqc, rate): {...}}
    hsn_groups: Dict[tuple, Dict[str, Any]] = {}

    gross_taxable_total = 0.0
    gross_tax_total = 0.0

    for item in active_items:
        gst_rate = round(float(item.get("gst_rate", 18.0)), 2)
        audited_txval = round(float(item.get("audited_line_total", 0.0)), 2)
        qty = round(float(item.get("quantity", 1.0)), 3)
        hsn_code = str(item.get("hsn_code", "9999")).strip()
        category_desc = item.get("category_description") or item.get("hsn_description") or "Goods"
        uqc = item.get("standard_uqc") or item.get("unit_uqc") or "PCS"
        item_supply_type = item.get("supply_type") or supply_type

        if item_supply_type == "INTER" or not is_intra_state:
            camt = 0.0
            samt = 0.0
            iamt = round(float(item.get("igst_amount") or (audited_txval * (gst_rate / 100.0))), 2)
        else:
            half_rate = round(gst_rate / 2.0, 2)
            camt = round(float(item.get("cgst_amount") or (audited_txval * (half_rate / 100.0))), 2)
            samt = round(float(item.get("sgst_amount") or (audited_txval * (half_rate / 100.0))), 2)
            iamt = 0.0

        gross_taxable_total += audited_txval
        gross_tax_total += (iamt + camt + samt)

        # Table 7: B2CS
        b2cs_groups[gst_rate]["txval"] += audited_txval
        b2cs_groups[gst_rate]["iamt"] += iamt
        b2cs_groups[gst_rate]["camt"] += camt
        b2cs_groups[gst_rate]["samt"] += samt

        # Table 12: HSN Summary
        hsn_key = (hsn_code, uqc, gst_rate)
        if hsn_key not in hsn_groups:
            hsn_groups[hsn_key] = {
                "hsn_sc": hsn_code,
                "desc": category_desc[:30],
                "uqc": uqc,
                "qty": 0.0,
                "txval": 0.0,
                "iamt": 0.0,
                "camt": 0.0,
                "samt": 0.0,
                "rt": gst_rate,
            }
        hsn_groups[hsn_key]["qty"] += qty
        hsn_groups[hsn_key]["txval"] += audited_txval
        hsn_groups[hsn_key]["iamt"] += iamt
        hsn_groups[hsn_key]["camt"] += camt
        hsn_groups[hsn_key]["samt"] += samt

    # 4. Table 7: B2CS Records
    b2cs_list: List[Dict[str, Any]] = []
    for rate, totals in sorted(b2cs_groups.items(), key=lambda x: x[0]):
        b2cs_list.append({
            "sply_ty": supply_type,
            "pos": pos,
            "typ": "OE",
            "rt": round(rate, 2),
            "txval": round(totals["txval"], 2),
            "iamt": round(totals["iamt"], 2),
            "camt": round(totals["camt"], 2),
            "samt": round(totals["samt"], 2),
            "csamt": 0.0
        })

    # 5. Table 12: HSN Records
    hsn_data: List[Dict[str, Any]] = []
    for idx, (key, val) in enumerate(sorted(hsn_groups.items(), key=lambda x: (x[0][0], x[0][2])), start=1):
        hsn_data.append({
            "num": idx,
            "hsn_sc": val["hsn_sc"],
            "desc": val["desc"],
            "uqc": val["uqc"],
            "qty": round(val["qty"], 3),
            "txval": round(val["txval"], 2),
            "rt": round(val["rt"], 2),
            "iamt": round(val["iamt"], 2),
            "camt": round(val["camt"], 2),
            "samt": round(val["samt"], 2),
            "csamt": 0.0
        })

    # 6. Table 13: Document Issue Register
    doc_issue_table = {
        "doc_det": [
            {
                "doc_num": 1,
                "doc_typ": "Invoices for outward supply",
                "docs": [
                    {
                        "num": 1,
                        "from": inv_num,
                        "to": inv_num,
                        "totnum": 1,
                        "canc": 0,
                        "net_issue": 1
                    }
                ]
            }
        ]
    }

    # 7. Assembled GSTN GSTR-1 Payload
    cur_gt = round(gross_taxable_total + gross_tax_total, 2)

    gstr1_payload = {
        "gstin": gstin,
        "fp": tax_period,
        "version": "GST3.1.6",
        "hash": "hash",
        "cur_gt": cur_gt,
        "b2cs": b2cs_list,
        "hsn": {
            "data": hsn_data
        },
        "doc_issue": doc_issue_table,
        "metadata": {
            "supplier_state": get_state_from_gstin(gstin),
            "place_of_supply": get_state_from_gstin(pos),
            "is_intra_state": is_intra_state,
            "total_taxable_value": round(gross_taxable_total, 2),
            "total_tax_amount": round(gross_tax_total, 2)
        }
    }

    return gstr1_payload


def export_to_gstr1_json(
    invoice_data: Union[Any, Dict[str, Any]],
    supplier_gstin: str = "27AABCU9603R1ZM",
    tax_period: str = "102026",
    pos_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Backward-compatible alias imported by Lane 1 (main.py).
    """
    return generate_gstr1_json(
        audited_invoice=invoice_data,
        supplier_gstin=supplier_gstin,
        fp=tax_period,
        pos_code=pos_code
    )


def save_gstr1_json_file(payload: Dict[str, Any], file_path: str) -> str:
    """Writes GSTR-1 payload to disk as formatted JSON."""
    with open(file_path, mode="w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return file_path
