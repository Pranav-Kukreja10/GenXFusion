import json
from vision_router import parse_bill_with_gemini
from math_auditor import audit_and_calculate_invoice
from schemas import RawVisionBill
from PIL import Image

# Read cached cement bill directly from cache
with open("ocr_cache.json", "r", encoding="utf-8") as f:
    cache = json.load(f)

h = "889fd91b0147eee5f869a57506a92ce3e5a23759eb5dd7a4d46d1e8b29ee50f8"
assert h in cache, "Hash missing from cache"

raw_bill = RawVisionBill.model_validate(cache[h]["data"])
resp = audit_and_calculate_invoice(
    raw_bill=raw_bill,
    bill_id=h,
    enhanced_image_b64="",
    raw_image_b64="",
    model_used="cached"
)

d = resp.model_dump()
print("Store name:", d["store_name_guess"].encode("ascii", errors="replace").decode("ascii"))
print("Supplier GSTIN:", d["supplier_gstin"])
print("Supplier State:", d["supplier_state_code"], d["supplier_state_name"])
print("Items count:", len(d["active_items"]))
print("Item 1 HSN:", d["active_items"][0]["hsn_code"])
print("Item 1 GST Rate:", d["active_items"][0]["gst_rate"])
print("Item 1 Total with Tax:", d["active_items"][0]["total_with_tax"])
print("Summary final payable:", d["summary"]["final_payable_pakka_total"])
print("is_100_percent_compliant:", d["is_100_percent_compliant"])
print("pending_doubts count:", len(d["pending_doubts"]))
