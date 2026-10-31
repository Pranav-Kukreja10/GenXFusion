"""
update_main_doubt_engine.py - Updates main.py and backend/main.py with zero-autofill and Doubt engine.
"""
from pathlib import Path
import re

with open("main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "from math_auditor import audit_and_calculate_invoice",
    "from math_auditor import audit_and_calculate_invoice, detect_doubts"
)
content = content.replace(
    "from backend.math_auditor import audit_and_calculate_invoice",
    "from backend.math_auditor import audit_and_calculate_invoice, detect_doubts"
)
content = content.replace(
    "AuditedInvoiceResponse,\n)",
    "AuditedInvoiceResponse,\n    DoubtItem,\n)"
)

# 2. Update fallback_audit_and_calculate_invoice return block
old_return_block = """    inv_num = getattr(raw_bill, "invoice_id", None) or bill_id
    store_addr = getattr(raw_bill, "store_address", None)
    supp_gstin = getattr(raw_bill, "supplier_gstin", None)
    supp_val = validate_gstin(supp_gstin) if supp_gstin else {"is_valid": False}
    supp_state = supp_val["state_code"] if supp_val.get("is_valid") else "03"
    supp_state_name = supp_val["state_name"] if supp_val.get("is_valid") else "Punjab"

    return AuditedInvoiceResponse(
        bill_id=bill_id,
        invoice_id=inv_num,
        detected_sector=raw_bill.detected_sector,
        store_name_guess=raw_bill.merchant_name or "Bharat Kacha Dukaan",
        merchant_name=raw_bill.merchant_name or "Bharat Kacha Dukaan",
        store_address=store_addr,
        supplier_gstin=supp_gstin or "03AAEPG1807C1ZM",
        supplier_state_code=supp_state,
        supplier_state_name=supp_state_name,
        place_of_supply_state_code=supp_state,
        place_of_supply_state_name=supp_state_name,
        is_inter_state=False,
        supply_type_b2b="B2CS",
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
    )"""

new_return_block = """    inv_num = getattr(raw_bill, "invoice_id", None) or bill_id
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
    )"""

if old_return_block in content:
    content = content.replace(old_return_block, new_return_block)
    print("Replaced fallback_audit_and_calculate_invoice return block!")
else:
    print("WARNING: old_return_block not found in main.py!")

# 3. Update recalculate_invoice in main.py
old_recalc_header = """        # Resolve Supplier GSTIN and State
        supplier_gstin = payload.get("supplier_gstin") or "03AAEPG1807C1ZM"
        supp_val = validate_gstin(supplier_gstin)
        supplier_state = supp_val["state_code"] if supp_val["is_valid"] else str(payload.get("supplier_state_code") or "03").zfill(2)
        supplier_state_name = INDIAN_STATES.get(supplier_state, "Punjab")

        # Resolve Buyer GSTIN and Supply Mode
        buyer_gstin = payload.get("buyer_gstin")
        buyer_val = validate_gstin(buyer_gstin)
        supply_mode = "B2B" if buyer_val["is_valid"] else "B2CS"
        buyer_state = buyer_val["state_code"] if buyer_val["is_valid"] else payload.get("buyer_state_code")
        buyer_state_name = INDIAN_STATES.get(buyer_state) if buyer_state else None

        # Resolve Place of Supply (POS) and Inter-State Tax Mode
        pos_code = str(payload.get("place_of_supply_state_code") or supplier_state).zfill(2)
        pos_name = INDIAN_STATES.get(pos_code, "Punjab")

        # Statutory IGST Rule: Inter-State when Supplier State != Place of Supply State
        is_inter_state = (supplier_state != pos_code)"""

new_recalc_header = """        # Resolve Merchant Name (Zero Silent Autofill)
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

        # Statutory IGST Rule: Inter-State when Supplier State != Place of Supply State
        if payload.get("is_inter_state") is not None:
            is_inter_state = bool(payload.get("is_inter_state"))
        else:
            is_inter_state = bool(supplier_state and pos_code and (supplier_state != pos_code))"""

if old_recalc_header in content:
    content = content.replace(old_recalc_header, new_recalc_header)
    print("Replaced recalculate_invoice header resolution!")
else:
    print("WARNING: old_recalc_header not found in main.py!")

# 4. Update recalculate_invoice return block
old_recalc_return = """        # Run compliance audit
        compliance_audit = validate_invoice_compliance(
            invoice_data={
                "merchant_name": store_name,
                "store_name_guess": store_name,
                "raw_date_written": raw_date,
                "normalized_date_iso": payload.get("normalized_date_iso") or "2026-10-31",
                "active_items": [i.model_dump() for i in audited_active],
                "supplier_state_code": supplier_state,
                "place_of_supply_state_code": pos_code,
            },
            supplier_gstin=supplier_gstin,
            buyer_gstin=buyer_gstin,
            pos_state_code=pos_code
        )

        return AuditedInvoiceResponse(
            bill_id=bill_id,
            invoice_id=bill_id,
            detected_sector=sector,
            store_name_guess=store_name,
            merchant_name=store_name,
            supplier_gstin=supplier_gstin,
            supplier_state_code=supplier_state,
            supplier_state_name=supplier_state_name,
            buyer_gstin=buyer_gstin,
            buyer_state_code=buyer_state,
            buyer_state_name=buyer_state_name,
            place_of_supply_state_code=pos_code,
            place_of_supply_state_name=pos_name,
            is_inter_state=is_inter_state,
            supply_type_b2b=supply_mode,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_address=customer_address,
            extra_charges=extra_charges,
            discount_amount=discount_amount,
            raw_date_written=raw_date,
            normalized_date_iso=payload.get("normalized_date_iso") or "2026-10-31",
            compliance_audit=compliance_audit,
            model_used="deterministic-recalc",
            cache_hit=True,
            raw_image_b64=raw_image_b64,
            enhanced_image_b64=enhanced_image_b64,
            enhanced_image_base64=enhanced_image_b64,
            active_items=audited_active,
            struck_out_items=struck_items,
            summary=summary
        )"""

new_recalc_return = """        # Date resolution (Zero Silent Autofill)
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

        return AuditedInvoiceResponse(
            bill_id=bill_id,
            invoice_id=bill_id,
            bill_number=bill_id,
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
            cache_hit=True,
            raw_image_b64=raw_image_b64,
            enhanced_image_b64=enhanced_image_b64,
            enhanced_image_base64=enhanced_image_b64,
            active_items=audited_active,
            items=audited_active,
            struck_out_items=struck_items,
            summary=summary
        )"""

if old_recalc_return in content:
    content = content.replace(old_recalc_return, new_recalc_return)
    print("Replaced recalculate_invoice return block!")
else:
    print("WARNING: old_recalc_return not found in main.py!")

# 5. Eliminate fallback Punjab GSTIN in export_gstr1
content = content.replace(
    'or "03AAEPG1807C1ZM"',
    'or "URP"'
)

with open("main.py", "w", encoding="utf-8") as f:
    f.write(content)
with open("backend/main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Successfully synced main.py and backend/main.py!")

