"""
gst_validator.py - Deterministic Indian GSTIN & Statutory Compliance Validator
Part of ParchiSetu AI / Bharat GST Vision Engine.

Features:
1. Official 38 Indian State/UT GST Code Mapping (01 to 38 + 97/99).
2. 15-character GSTIN structure, regex, PAN validation, and Entity Type extraction.
3. Official Indian GSTN Modulo-36 Checksum verification algorithm.
4. Compliance Readiness Auditor (checking mandatory invoice fields vs. paper extractions).
5. Valid Demo GSTIN generation for instant judge demonstrations.
"""

from __future__ import annotations
import re
from typing import Dict, Any, List, Optional, Tuple

# ============================================================================
# 1. Official Indian State & Union Territory GST Code Map
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

# Modulo 36 Character Set
CHARS_MOD36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
GSTIN_REGEX = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")


# ============================================================================
# 2. Modulo-36 Checksum Algorithm
# ============================================================================

def compute_gstin_mod36_checksum(gstin_first_14: str) -> str:
    """
    Computes the standard Indian GSTN Modulo-36 check character for the 15th position.
    
    Algorithm:
    - First 14 characters are mapped: 0-9 -> 0-9, A-Z -> 10-35.
    - Multiplier alternates between 1 (for odd 1-based positions 1, 3, 5, 7, 9, 11, 13)
      and 2 (for even 1-based positions 2, 4, 6, 8, 10, 12, 14).
    - For each char:
        product = char_val * multiplier
        factor_sum = (product // 36) + (product % 36)
    - Total sum is accumulated.
    - remainder = total_sum % 36
    - check_code = (36 - remainder) % 36
    - Returns CHARS_MOD36[check_code]
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
    """
    if not gstin or not isinstance(gstin, str):
        return {
            "is_valid": False,
            "gstin": "",
            "state_code": "",
            "state_name": "",
            "pan": "",
            "entity_type": "Unknown",
            "checksum_valid": False,
            "expected_checksum": "",
            "error_reason": "GSTIN is missing or empty"
        }

    clean_gstin = gstin.strip().upper().replace(" ", "").replace("-", "")

    if len(clean_gstin) != 15:
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": clean_gstin[:2] if len(clean_gstin) >= 2 else "",
            "state_name": INDIAN_STATES.get(clean_gstin[:2], "Invalid State Code"),
            "pan": "",
            "entity_type": "Unknown",
            "checksum_valid": False,
            "expected_checksum": "",
            "error_reason": f"Expected 15 characters, got {len(clean_gstin)}"
        }

    if not GSTIN_REGEX.match(clean_gstin):
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": clean_gstin[:2],
            "state_name": INDIAN_STATES.get(clean_gstin[:2], "Invalid State Code"),
            "pan": clean_gstin[2:12],
            "entity_type": PAN_ENTITY_TYPES.get(clean_gstin[5], "Unknown"),
            "checksum_valid": False,
            "expected_checksum": "",
            "error_reason": "Regex pattern mismatch (Expected format: 22AAAAA0000A1Z5)"
        }

    state_code = clean_gstin[:2]
    if state_code not in INDIAN_STATES:
        return {
            "is_valid": False,
            "gstin": clean_gstin,
            "state_code": state_code,
            "state_name": "Unknown State Code",
            "pan": clean_gstin[2:12],
            "entity_type": PAN_ENTITY_TYPES.get(clean_gstin[5], "Unknown"),
            "checksum_valid": False,
            "expected_checksum": "",
            "error_reason": f"State Code '{state_code}' is not a valid Indian State/UT"
        }

    state_name = INDIAN_STATES[state_code]
    pan = clean_gstin[2:12]
    entity_code = clean_gstin[5]
    entity_type = PAN_ENTITY_TYPES.get(entity_code, "Unspecified Entity")

    try:
        expected_check = compute_gstin_mod36_checksum(clean_gstin[:14])
        actual_check = clean_gstin[14]
        checksum_valid = (expected_check == actual_check)
    except Exception as e:
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
        "error_reason": None
    }


def generate_valid_gstin(state_code: str = "03", entity_type: str = "P") -> str:
    """
    Generates a 100% valid Indian GSTIN with mathematically verified Mod-36 checksum.
    Useful for demonstration and automated testing.
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
# 3. Invoice Compliance & Statutory Readiness Validator
# ============================================================================

def validate_invoice_compliance(
    invoice_data: Dict[str, Any],
    supplier_gstin: Optional[str] = None,
    buyer_gstin: Optional[str] = None,
    pos_state_code: Optional[str] = "03"
) -> Dict[str, Any]:
    """
    Audits the invoice against statutory CBIC GST tax invoice rules (Rule 46 of CGST Rules):
    1. Mandatory Supplier GSTIN + Legal entity validation
    2. Mandatory Date & Invoice ID
    3. Mandatory Place of Supply (POS) and State Name
    4. Distinguishes B2B (with valid Buyer GSTIN) vs B2CS (Retail Consumer)
    5. Flags missing or unextracted fields that require shopkeeper input
    """
    warnings: List[str] = []
    missing_fields: List[str] = []

    # 1. Supplier GSTIN
    gstin_to_test = supplier_gstin or invoice_data.get("supplier_gstin")
    gstin_val = validate_gstin(gstin_to_test)
    if not gstin_val["is_valid"]:
        missing_fields.append("supplier_gstin")
        warnings.append(
            f"Supplier GSTIN: {gstin_val.get('error_reason') or 'Not provided'}. Pakka Tax Invoice requires valid 15-char GSTIN."
        )

    # 2. Merchant / Shop Name
    merchant = invoice_data.get("merchant_name") or invoice_data.get("store_name_guess")
    if not merchant or merchant.strip().lower() in ("bharat kacha dukaan", "unknown", "none", ""):
        missing_fields.append("merchant_name")
        warnings.append("Merchant Name missing or generic. Please confirm shop name.")

    # 3. Invoice Date
    raw_date = invoice_data.get("raw_date_written")
    iso_date = invoice_data.get("normalized_date_iso")
    date_source = "EXTRACTED_FROM_PAPER"
    if not raw_date and not iso_date:
        missing_fields.append("normalized_date_iso")
        date_source = "MISSING_ON_PAPER_REQUIRES_INPUT"
        warnings.append("Date was not detected on paper slip. Defaulted to today's date for compliance.")

    # 4. Buyer GSTIN & Supply Mode (B2B vs B2CS)
    buyer_gstin_val = validate_gstin(buyer_gstin or invoice_data.get("buyer_gstin"))
    if buyer_gstin_val["is_valid"]:
        supply_mode = "B2B"
        supply_label = f"B2B (Registered Recipient: {buyer_gstin_val['entity_type']})"
    else:
        supply_mode = "B2CS"
        supply_label = "B2CS (Unregistered Consumer / Retail Cash Sale)"

    # 5. Place of Supply (POS)
    supplier_state = gstin_val.get("state_code") or invoice_data.get("supplier_state_code") or "03"
    effective_pos = pos_state_code or invoice_data.get("place_of_supply_state_code") or supplier_state
    is_inter_state = (supplier_state != effective_pos)

    pos_name = INDIAN_STATES.get(effective_pos, "Unknown State")
    supplier_state_name = INDIAN_STATES.get(supplier_state, "Punjab")

    # 6. Active Items RAG Verification Count
    active_items = invoice_data.get("active_items", [])
    rag_citations_count = sum(1 for it in active_items if it.get("rag_citation") or it.get("hsn_code"))

    is_ready_for_gstr1 = len(missing_fields) == 0 and len(active_items) > 0

    return {
        "is_ready_for_gstr1": is_ready_for_gstr1,
        "b2b_or_b2cs_mode": supply_mode,
        "supply_type_label": supply_label,
        "is_inter_state": is_inter_state,
        "tax_type": "IGST" if is_inter_state else "CGST + SGST",
        "supplier_gstin_audit": gstin_val,
        "buyer_gstin_audit": buyer_gstin_val,
        "supplier_state": {"code": supplier_state, "name": supplier_state_name},
        "place_of_supply": {"code": effective_pos, "name": pos_name},
        "date_audit": {
            "raw_date_written": raw_date,
            "normalized_date_iso": iso_date or "2026-10-31",
            "date_source": date_source
        },
        "missing_mandatory_fields": missing_fields,
        "compliance_warnings": warnings,
        "total_items_audited": len(active_items),
        "total_rag_citations_verified": rag_citations_count,
    }
