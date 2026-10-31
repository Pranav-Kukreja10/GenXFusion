import json
from math_auditor import audit_and_calculate_invoice
from schemas import RawVisionBill, RawVisionLineItem

cement_raw = RawVisionBill(
    merchant_name="राधेकृष्ण एजेन्सी",
    supplier_gstin="23BXDPP0256Q1Z6",
    raw_date_written="04/03/21",
    customer_name="सरपंच ग्राम पंचायत जरगाँव",
    customer_phone=None,
    detected_sector="HARDWARE",
    items=[
        RawVisionLineItem(
            raw_text_on_paper="सीमेंट (जज) 2523 95 बैग 265.70 25241.50",
            product_name_normalized="JK Portland Cement",
            raw_quantity="95 बैग",
            quantity=95.0,
            hsn_code_written="2523",
            unit_price=265.70,
            written_line_total=25241.50,
            is_struck_through=False,
            confidence_score=0.98
        )
    ],
    written_subtotal=25241.50,
    written_grand_total=32309.12
)

resp = audit_and_calculate_invoice(
    raw_bill=cement_raw,
    bill_id="test_cement_123",
    enhanced_image_b64="",
    raw_image_b64="",
    model_used="test"
)

with open("test_resp.json", "w", encoding="utf-8") as f:
    json.dump(resp.model_dump(), f, indent=2, ensure_ascii=False)

print("Saved test_resp.json successfully")
