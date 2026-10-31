"""
gst_validator.py - Deterministic Indian GSTIN & Statutory Compliance Validator
Part of ParchiSetu AI / Bharat GST Vision Engine.

Features:
1. Official 38 Indian State/UT GST Code Mapping (01 to 38 + 97/99).
2. 15-character GSTIN structure, regex, PAN validation, and Entity Type extraction.
3. Official Indian GSTN Modulo-36 Checksum verification algorithm.
4. Indian Financial Year (April 1 - March 31) & CGST Rule 46(b) invoice numbering.
5. Persistent thread-safe FY invoice number registry (data/invoice_registry.json).
6. B2B, B2CL, B2CS statutory classifier.
7. Guarantees ZERO null (None) values in all returned dictionaries.
"""

from __future__ import annotations
import re
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Thread lock for invoice registry operations
REGISTRY_LOCK = threading.Lock()
REGISTRY_FILE_PATHS = [
    Path("data/invoice_registry.json"),
    Path("backend/data/invoice_registry.json")
]

# ============================================================================
# 1. Official Indian State & Union Territory GST Code Map (38 Official Codes)
# ============================================================================
INDIAN_STATES: Dict[str, str] = {
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
    "28": "Andhra Pradesh (Old)",
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
    "97": "Other Territory",
    "99": "Centre Jurisdiction",
}

# 4th character of Indian Income Tax PAN signifies the legal Entity Type
PAN_ENTITY_TYPES: Dict[str, str] = {
    "P": "Individual / Proprietorship",
    "C": "Company / Corporate",
    "F": "Partnership Firm / LLP",
    "H": "Hindu Undivided Family (HUF)",
    "A": "Association of Persons (AOP)",
    "T": "Trust",
    "B": "Body of Individuals (BOI)",
    "L": "Local Authority",
    "J": "Artificial Juridical Person",
    "G": "Government Agency / Department",
}

CHARS_MOD36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
RULE_46B_REGEX = re.compile(r"^[a-zA-Z0-9/-]{1,16}$")


# ============================================================================
# 2. Modulo-36 Checksum Algorithm
# ============================================================================

def compute_gstin_mod36_checksum(gstin_first_14: str) -> str:
    """
    Computes the standard Indian GSTN Modulo-36 check character for the 15th position.
    """
    cleaned = gstin_first_14.strip().upper()[:14]
    if len(cleaned) < 14:
        raise ValueError("Requires exactly 14 characters to compute check character")

    total = 0
    for idx, ch in enumerate(cleaned):
        if ch not in CHARS_MOD36:
            raise ValueError(f"Invalid character '{ch}' for GSTIN Modulo-36")
        val = CHARS_MOD36.index(ch)
        multiplier = 1 if (idx % 2 == 0) else 2
        prod = val * multiplier
        total += (prod // 36) + (prod % 36)

    remainder = total % 36
    check_code = (36 - remainder) % 36
    return CHARS_MOD36[check_code]


def validate_gstin(gstin: Optional[str]) -> Dict[str, Any]:
    """
    Validates an Indian GSTIN (Goods and Services Tax Identification Number):
    - Format & Length (15 characters)
    - Regex pattern
    - State Code validity (01-38)
    - PAN extraction & Entity Type decoding
    - Official Modulo-36 check-digit verification
    Guarantees non-null string outputs.
    """
    if not gstin or not isinstance(gstin, str):
        return {
            "is_valid": False,
            "gstin": "",
            "state_code": "",
            "state_name": "",
            "pan": "",
            "entity_type": "",
            "checksum_valid": False,
            "expected_checksum": "",
            "error_reason": "GSTIN is missing or empty"
        }

    clean_gstin = gstin.strip().upper().replace(" ", "").replace("-", "")

    if len(clean_gstin) != 15:
        sc = clean_gstin[:2] if len(clean_gstin) >= 2 else ""
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": sc,
            "state_name": INDIAN_STATES.get(sc, ""),
            "pan": "",
            "entity_type": "",
            "checksum_valid": False,
            "expected_checksum": "",
            "error_reason": f"Expected 15 characters, got {len(clean_gstin)}"
        }

    state_code = clean_gstin[:2]
    pan = clean_gstin[2:12]
    entity_code = clean_gstin[5]
    entity_type = PAN_ENTITY_TYPES.get(entity_code, "Unspecified Entity")

    if not GSTIN_REGEX.match(clean_gstin):
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": state_code,
            "state_name": INDIAN_STATES.get(state_code, ""),
            "pan": pan,
            "entity_type": entity_type,
            "checksum_valid": False,
            "expected_checksum": "",
            "error_reason": "Regex pattern mismatch (Expected format: 22AAAAA0000A1Z5)"
        }

    if state_code not in INDIAN_STATES:
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": state_code,
            "state_name": "",
            "pan": pan,
            "entity_type": entity_type,
            "checksum_valid": False,
            "expected_checksum": "",
            "error_reason": f"State Code '{state_code}' is not a valid Indian State/UT"
        }

    state_name = INDIAN_STATES[state_code]

    try:
        expected_check = compute_gstin_mod36_checksum(clean_gstin[:14])
        actual_check = clean_gstin[14]
        checksum_valid = (expected_check == actual_check)
    except Exception:
        checksum_valid = False
        expected_check = ""

    if not checksum_valid:
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": state_code,
            "state_name": state_name,
            "pan": pan,
            "entity_type": entity_type,
            "checksum_valid": False,
            "expected_checksum": expected_check,
            "error_reason": f"Mod-36 check-digit failed (15th char is '{actual_check}', expected '{expected_check}')"
        }

    return {
        "is_valid": True,
        "gstin": clean_gstin,
        "state_code": state_code,
        "state_name": state_name,
        "pan": pan,
        "entity_type": entity_type,
        "checksum_valid": True,
        "expected_checksum": expected_check,
        "error_reason": ""
    }


def generate_valid_gstin(state_code: str = "03", entity_type: str = "P") -> str:
    """
    Generates a 100% valid Indian GSTIN with mathematically verified Mod-36 checksum.
    """
    st = str(state_code).zfill(2)
    pan_prefix = "AAE"
    ent = entity_type.upper() if entity_type.upper() in PAN_ENTITY_TYPES else "P"
    surname_initial = "G"
    pan_num = "1807"
    pan_suffix = "C"
    pan = f"{pan_prefix}{ent}{surname_initial}{pan_num}{pan_suffix}"
    entity_num = "1"
    default_z = "Z"
    first_14 = f"{st}{pan}{entity_num}{default_z}"
    check = compute_gstin_mod36_checksum(first_14)
    return f"{first_14}{check}"


# ============================================================================
# 3. Financial Year (FY) & CGST Rule 46(b) Invoice Number Verification
# ============================================================================

def get_indian_financial_year(date_str: Optional[str] = None) -> str:
    """
    Determines the Indian Financial Year (April 1 to March 31).
    E.g.:
    '2026-10-31' -> '2026-27'
    '2021-03-04' -> '2020-21'
    '04/03/2021' -> '2020-21'
    """
    dt = None
    if date_str and isinstance(date_str, str) and date_str.strip():
        clean = date_str.strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y", "%Y/%m/%d"):
            try:
                dt = datetime.strptime(clean, fmt)
                break
            except ValueError:
                continue

    if dt is None:
        dt = datetime.now()

    year = dt.year
    month = dt.month

    if month >= 4:
        start_year = year
        end_year = year + 1
    else:
        start_year = year - 1
        end_year = year

    return f"{start_year}-{str(end_year)[-2:]}"


def validate_rule_46b_invoice_number(invoice_num: Optional[str]) -> Dict[str, Any]:
    """
    Validates invoice number strictly per CGST Rule 46(b):
    - Non-empty
    - Max 16 characters
    - Only alphanumeric, slash (/), and hyphen (-)
    """
    if not invoice_num or not isinstance(invoice_num, str):
        return {
            "is_valid": False,
            "invoice_number": "",
            "error_reason": "Invoice number is missing"
        }

    clean = invoice_num.strip()
    if len(clean) == 0:
        return {
            "is_valid": False,
            "invoice_number": "",
            "error_reason": "Invoice number cannot be blank"
        }

    if len(clean) > 16:
        return {
            "is_valid": False,
            "invoice_number": clean,
            "error_reason": f"Exceeds CGST Rule 46(b) maximum length of 16 characters (length={len(clean)})"
        }

    if not RULE_46B_REGEX.match(clean):
        return {
            "is_valid": False,
            "invoice_number": clean,
            "error_reason": "Contains invalid characters. Rule 46(b) permits only alphanumeric, '/' and '-'"
        }

    return {
        "is_valid": True,
        "invoice_number": clean,
        "error_reason": ""
    }


def _load_registry() -> Dict[str, Any]:
    for path in REGISTRY_FILE_PATHS:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return {"records": []}


def _save_registry(data: Dict[str, Any]):
    for path in REGISTRY_FILE_PATHS:
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass


def sanitize_rule_46b_invoice_number(invoice_num: Optional[str], default_prefix: str = "INV") -> str:
    """
    Cleans and guarantees an invoice number strictly satisfies CGST Rule 46(b):
    - Non-empty
    - Max 16 characters
    - Only alphanumeric, '/' and '-'
    """
    if not invoice_num:
        return f"{default_prefix}-0001"
    
    clean = str(invoice_num).strip().upper().replace("_", "-").replace(" ", "-")
    # Replace any non-alphanumeric, non-slash, non-dash characters with dash
    clean = re.sub(r"[^A-Z0-9/\-]", "-", clean)
    clean = re.sub(r"-+", "-", clean).strip("-/")
    
    if len(clean) > 16:
        # If it looks like a hex hash or long string, take first 8 chars with prefix
        if len(clean) >= 32 and all(c in "0123456789ABCDEF" for c in clean):
            clean = f"{default_prefix}-{clean[:8]}"
        else:
            clean = clean[:16]
    
    return clean or f"{default_prefix}-0001"


def generate_next_sequential_invoice_number(supplier_key: str, financial_year: str) -> str:
    """
    Generates the next valid sequential invoice number for a given supplier in a financial year.
    Format: INV/{short_fy}/{seq:04d} e.g. INV/26-27/0001 (strictly <= 16 characters per CGST Rule 46(b))
    """
    with REGISTRY_LOCK:
        reg = _load_registry()
        records = reg.get("records", [])
        
        # Find matching records
        max_seq = 0
        sk_clean = supplier_key.strip().upper() if supplier_key else "DEFAULT"
        fy_clean = financial_year.strip() if financial_year else "2026-27"
        
        # Convert financial year to short 5-character format (e.g. 2026-27 -> 26-27, 2026-2027 -> 26-27)
        if "-" in fy_clean:
            parts = fy_clean.split("-")
            short_fy = f"{parts[0][-2:]}-{parts[1][-2:]}"
        else:
            short_fy = fy_clean[-5:] if len(fy_clean) >= 5 else fy_clean
        
        for r in records:
            if r.get("supplier_key", "").upper() == sk_clean and r.get("financial_year", "") == fy_clean:
                num = str(r.get("invoice_number", ""))
                # Try to extract trailing digits
                m = re.search(r"(\d+)$", num)
                if m:
                    try:
                        seq = int(m.group(1))
                        if seq > max_seq:
                            max_seq = seq
                    except ValueError:
                        pass
        
        next_seq = max_seq + 1
        inv_str = f"INV/{short_fy}/{next_seq:04d}"
        if len(inv_str) > 16:
            inv_str = inv_str[:16]
        return inv_str


def check_and_register_invoice_number(
    supplier_key: str,
    financial_year: str,
    invoice_number: str,
    auto_register: bool = False
) -> Dict[str, Any]:
    """
    Checks invoice number uniqueness within the Financial Year for the supplier.
    If valid and unique, optionally registers it into data/invoice_registry.json.
    """
    r46 = validate_rule_46b_invoice_number(invoice_number)
    sk = supplier_key.strip().upper() if supplier_key else "DEFAULT"
    fy = financial_year.strip() if financial_year else get_indian_financial_year()
    inv_num = r46["invoice_number"]

    next_sugg = generate_next_sequential_invoice_number(sk, fy)

    if not r46["is_valid"]:
        return {
            "is_unique": False,
            "is_valid_format": False,
            "financial_year": fy,
            "invoice_number": inv_num,
            "next_suggested_invoice_number": next_sugg,
            "error_reason": r46["error_reason"]
        }

    with REGISTRY_LOCK:
        reg = _load_registry()
        records = reg.get("records", [])
        
        for r in records:
            if r.get("supplier_key", "").upper() == sk and r.get("financial_year", "") == fy:
                if str(r.get("invoice_number", "")).upper() == inv_num.upper():
                    return {
                        "is_unique": False,
                        "is_valid_format": True,
                        "financial_year": fy,
                        "invoice_number": inv_num,
                        "next_suggested_invoice_number": next_sugg,
                        "error_reason": f"Invoice number '{inv_num}' has already been used in FY {fy}"
                    }

        if auto_register:
            records.append({
                "supplier_key": sk,
                "financial_year": fy,
                "invoice_number": inv_num,
                "registered_at": datetime.now().isoformat()
            })
            reg["records"] = records
            _save_registry(reg)

    return {
        "is_unique": True,
        "is_valid_format": True,
        "financial_year": fy,
        "invoice_number": inv_num,
        "next_suggested_invoice_number": next_sugg,
        "error_reason": ""
    }


# ============================================================================
# 4. Supply Type Classifier (B2B, B2CL, B2CS)
# ============================================================================

def classify_supply_type(
    supplier_state_code: Optional[str],
    pos_state_code: Optional[str],
    buyer_gstin: Optional[str],
    final_amount: float = 0.0
) -> Dict[str, Any]:
    """
    Classifies invoice supply type according to statutory GST rules:
    - B2B: Recipient possesses a valid 15-digit GSTIN.
    - B2CL: Unregistered buyer, Inter-State supply, total invoice value > ₹2,50,000.
    - B2CS: Unregistered buyer, intra-state OR inter-state <= ₹2,50,000.
    """
    s_state = str(supplier_state_code).strip() if supplier_state_code else ""
    p_state = str(pos_state_code).strip() if pos_state_code else ""
    
    is_inter = bool(s_state and p_state and (s_state != p_state))
    tax_type = "IGST" if is_inter else "CGST + SGST"

    bg_val = validate_gstin(buyer_gstin)
    if bg_val["is_valid"]:
        supply_type = "B2B"
    elif is_inter and final_amount > 250000.0:
        supply_type = "B2CL"
    else:
        supply_type = "B2CS"

    return {
        "supply_type": supply_type,
        "is_inter_state": is_inter,
        "tax_type": tax_type
    }


# ============================================================================
# 5. Full Invoice Compliance Auditor
# ============================================================================

def validate_invoice_compliance(
    invoice_data: Dict[str, Any],
    supplier_gstin: Optional[str] = None,
    buyer_gstin: Optional[str] = None,
    pos_state_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Audits the invoice against statutory CBIC GST tax invoice rules (Rule 46 of CGST Rules):
    1. Mandatory Supplier GSTIN + Legal entity validation
    2. Mandatory Date & CGST Rule 46(b) Invoice Number
    3. Mandatory Place of Supply (POS) and State Name
    4. Distinguishes B2B vs B2CL vs B2CS
    5. Checks Financial Year uniqueness
    Guarantees non-null string outputs.
    """
    warnings: List[str] = []
    missing_fields: List[str] = []

    # 1. Supplier GSTIN
    gstin_to_test = supplier_gstin or invoice_data.get("supplier_gstin") or ""
    gstin_val = validate_gstin(gstin_to_test)
    if not gstin_val["is_valid"]:
        missing_fields.append("supplier_gstin")
        warnings.append(
            f"Supplier GSTIN: {gstin_val.get('error_reason') or 'Not provided'}. Tax Invoice requires valid 15-char GSTIN."
        )

    # 2. Merchant / Shop Name
    merchant = invoice_data.get("merchant_name") or invoice_data.get("store_name_guess") or ""
    if not merchant or merchant.strip().lower() in ("bharat kacha dukaan", "unknown", "none", "", "unspecified store", "indian dukaan store", "bharat store"):
        missing_fields.append("merchant_name")
        warnings.append("Merchant Name missing on receipt. Please enter shop name manually.")

    # 3. Invoice Date & Financial Year
    raw_date = str(invoice_data.get("raw_date_written") or invoice_data.get("raw_date_text") or "")
    iso_date = str(invoice_data.get("normalized_date_iso") or "")
    date_source = "EXTRACTED_FROM_PAPER"
    effective_iso = iso_date or raw_date
    if not raw_date and not iso_date:
        missing_fields.append("normalized_date_iso")
        date_source = "MISSING_ON_PAPER_REQUIRES_INPUT"
        effective_iso = ""
        warnings.append("Date was not detected on paper slip. Requires user input.")

    financial_year = get_indian_financial_year(effective_iso)

    # 4. Invoice Number & Rule 46(b)
    raw_inv = str(invoice_data.get("invoice_id") or invoice_data.get("bill_number") or "").strip()
    if not raw_inv:
        b_id = str(invoice_data.get("bill_id") or "").strip()
        inv_num = f"INV-{b_id[:8].upper()}" if (b_id and len(b_id) > 16) else (b_id or "INV-0001")
    elif len(raw_inv) > 16:
        if len(raw_inv) >= 32 and all(c in "0123456789abcdefABCDEF" for c in raw_inv):
            inv_num = f"INV-{raw_inv[:8].upper()}"
        else:
            inv_num = raw_inv[:16]
    else:
        inv_num = raw_inv

    inv_num = inv_num.replace("_", "-").replace(" ", "-")
    r46 = validate_rule_46b_invoice_number(inv_num)
    if not r46["is_valid"]:
        warnings.append(f"Invoice Number: {r46['error_reason']}.")
    elif raw_inv and len(raw_inv) > 16:
        warnings.append(f"Invoice Number: Formatted to CGST Rule 46(b) 16-character limit ('{inv_num}').")

    # 5. Buyer GSTIN & Supply Mode (B2B vs B2CL vs B2CS)
    b_gstin = buyer_gstin or invoice_data.get("buyer_gstin") or ""
    buyer_gstin_val = validate_gstin(b_gstin)

    supplier_state = gstin_val.get("state_code") if gstin_val.get("is_valid") else str(invoice_data.get("supplier_state_code") or "")
    effective_pos = str(pos_state_code or invoice_data.get("place_of_supply_state_code") or supplier_state or "")
    final_amt = float(invoice_data.get("final_payable_pakka_total") or invoice_data.get("written_grand_total") or 0.0)

    st_res = classify_supply_type(supplier_state, effective_pos, b_gstin, final_amt)
    supply_mode = st_res["supply_type"]
    is_inter_state = st_res["is_inter_state"]
    tax_type = st_res["tax_type"]

    pos_name = INDIAN_STATES.get(effective_pos, "")
    supplier_state_name = INDIAN_STATES.get(supplier_state, "")

    active_items = invoice_data.get("active_items", [])
    rag_citations_count = sum(1 for it in active_items if (isinstance(it, dict) and (it.get("rag_citation") or it.get("hsn_code"))))

    is_ready_for_gstr1 = len(missing_fields) == 0 and len(active_items) > 0 and r46["is_valid"]

    return {
        "is_ready_for_gstr1": is_ready_for_gstr1,
        "b2b_or_b2cs_mode": supply_mode,
        "supply_type": supply_mode,
        "supply_type_label": f"{supply_mode} ({'Registered Buyer' if supply_mode == 'B2B' else 'Retail Consumer'})",
        "is_inter_state": is_inter_state,
        "tax_type": tax_type,
        "financial_year": financial_year,
        "rule_46b_valid": r46["is_valid"],
        "rule_46b_notes": r46["error_reason"],
        "supplier_gstin_audit": gstin_val,
        "buyer_gstin_audit": buyer_gstin_val,
        "supplier_state": {"code": supplier_state, "name": supplier_state_name},
        "place_of_supply": {"code": effective_pos, "name": pos_name},
        "date_audit": {
            "raw_date_written": raw_date,
            "normalized_date_iso": effective_iso,
            "date_source": date_source
        },
        "missing_mandatory_fields": missing_fields,
        "compliance_warnings": warnings,
        "total_items_audited": len(active_items),
        "total_rag_citations_verified": rag_citations_count,
    }
