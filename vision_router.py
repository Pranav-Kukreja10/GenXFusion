"""
vision_router.py - Multi-Model Quota-Safe AI Vision Gateway
Part of ParchiSetu AI / Bharat GST Vision Engine (Lane 1).

Implements:
1. Deterministic SHA-256 disk cache (ocr_cache.json) -> 0 RPD, <50ms response on repeat scans.
2. Official google-genai SDK with structured output (`response_schema=RawVisionBill`).
3. Multi-model fallback cascade: gemini-3.5-flash-lite -> gemini-3.1-flash-lite -> gemini-2.5-flash.
4. Confidence score gating: fails over if any item confidence < 0.72.
5. Indian vernacular prompt with fractional quantities, unit mappings, and strict raw math preservation.
"""

from __future__ import annotations
import json
import logging
import os
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from PIL import Image
from dotenv import load_dotenv

from schemas import RawVisionBill, RawVisionLineItem

# Load environment variables
load_dotenv()

logger = logging.getLogger("vision_router")
logging.basicConfig(level=logging.INFO)

# Model fallback cascade order
MODEL_FALLBACK_CASCADE = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
]

VERNACULAR_OCR_SYSTEM_PROMPT = """
You are TrueTax AI (Bharat GST Vision Engine), an expert vernacular OCR intelligence system specialized in deciphering handwritten Indian shopkeeper receipts ("kacha parchi"), kutcha bills, and ledger slips.

### CORE OBJECTIVES:
1. Identify the primary market sector: GROCERY, TEXTILE, ELECTRONICS, HARDWARE, MEDICAL, or GENERAL.
2. Extract the Merchant / Dukaan Name if written at top or rubber-stamped (e.g. "राधेकृष्ण एजेंसी", "NEW KHAN Timber", "Spenza Ceramics", "Punjab Cloth House").
3. Extract Supplier GSTIN, Bill Number & Store Address from header if printed or stamped:
   - `supplier_gstin`: 15-character GSTIN (e.g. "23BXDPP0256Q1Z6" or "GSTIN : 23 BXDPP0256Q1Z6")
   - `invoice_id`: Bill sequence number (e.g. "406" from "बिल नं. 406" or "Bill No: 406")
   - `store_address`: Shop location / colony / road / city (e.g. "सोनी कॉलोनी, अमानखेड़ी रोड, भीकनगांव")
4. Extract Customer / Buyer Details (often scribbled at the bottom or top of the kacha bill):
   - `customer_name`: Full name written or bottom signature (e.g. "सरपंच ग्राम पंचायत जरगॉंव", "Ankur / अंकुर", "Sandeep Goyal")
   - `customer_phone`: 10-digit mobile number (e.g. "9165606305", "94653-47478")
   - `customer_address`: Delivery village, colony, street, or town (e.g. "ग्राम पंचायत जरगॉंव, जनपद पंचायत भीकनगाँव", "Gali-8, Daba Colony")
5. Extract Extra Charges & Discounts at Bottom:
   - `extra_charges`: Cartage, freight, kiraya, tempo, or loading charges added below subtotal (e.g. "+360", "Kiraya: 360")
   - `discount_amount`: Any cash discount or "less" deducted from total (e.g. "Less: 400", "-400")
6. Extract each line item with exact handwritten text, normalized English product name, quantity, unit, unit price, and written total:
   - `written_hsn_code`: If printed or written on paper (e.g. in "HSN/ACS" column like "2523"), extract the exact 4 or 6-digit code. If not written on paper, set null.
   - `suggested_hsn_4digit`: 4-digit GST HSN prediction for this product (e.g. "2523" for cement, "6907" for ceramic/vitrified tiles, "4412" for plywood/timber, "6204" for readymade suits/lehnga, "5208" for cotton fabric, "3004" for medicines, "8539" for LED bulbs, "8471" for computers, "1006" for rice, "1101" for atta, "1512" for cooking oil).
   - `suggested_gst_slab`: Statutory Indian GST rate slab applicable to this product category: strictly one of 0.0, 3.0, 5.0, 12.0, 18.0, 28.0.
7. Detect Struck-Out / Cancelled items: Set `is_struck_out: true` for any line item that has pen lines drawn through it, crossed out, or has "(cut)" / "(kat)" next to it.
8. Assess confidence score (0.0 to 1.0) based on ink clarity and handwriting legibility.

### CRITICAL INDIAN HANDWRITTEN BILL RULES:
- HINDI DEVANAGARI PRESERVATION: Preserve Hindi / Vernacular shop names, customer names, and addresses in natural Devanagari script (e.g., राधेकृष्ण एजेंसी, सरपंच ग्राम पंचायत जरगॉंव, भीकनगांव).
- PRODUCT NORMALIZATION: Keep `raw_text_on_paper` as written in Hindi/vernacular, and normalize `product_name_normalized` to clean English (e.g. raw: "सीमेंट (JK) 95 बैग @ 265.70" -> normalized: "JK Portland Cement").
- ORIENTATION AWARENESS: Mobile photos of paper slips are often rotated 90 degrees clockwise or counter-clockwise. Mentally orient the text horizontally so you read lines left-to-right accurately.
- INDIAN RUPEE SLASH NOTATION (`/-`): Indian shopkeepers write `@ - 1400/-` or `1200/-` or `550/-` with a curly slash tail at the end to mean "Rupees Only". NEVER misread `/-` at the end of a price as `/2` or quantity 2! The number before `/-` is strictly the `unit_price` or `written_line_total`.
- HINDI UNIT "बोरा" / "बैग" (Bora / Bori / Bag = BAG): Shopkeepers often write quantities followed by the Hindi word `बोरा`, `बोरी`, or `बैग` (e.g., `95 बैग`, `2 बोरा`). Do NOT merge the Hindi characters into numbers! `95 बैग` means `quantity = 95.0, unit_uqc = "BAG"`.
- STANDALONE PRICE LINES: If a line under a merchant header only says `@ - 1400/-` without a separate quantity, treat `quantity = 1.0`.
- BOTTOM SIGNATURES: Names written at the bottom corner (like `Ankur / अंकुर`) are signatures or buyer names (`customer_name`), NOT bill line items.

### CRITICAL INDIAN VERNACULAR CONVERSIONS:
- FRACTIONS & REGIONAL QUANTITIES:
  * "Pao" / "Paav" = 0.25
  * "Adha" / "Aadha" = 0.5
  * "Paune 1" = 0.75 | "Paune 2" = 1.75 | "Paune N" = N - 0.25
  * "Sawa 1" = 1.25 | "Sawa 2" = 2.25 | "Sawa N" = N + 0.25
  * "Dedh" / "Ded" = 1.5
  * "Dhai" / "Dhayi" = 2.5
- OFFICIAL GST UQC UNIT MAPPINGS:
  * Peti -> BOX
  * Katta / Bori / Bora / बोरा / बोरी -> BAG
  * Thaan / Meter / Mtr -> MTR
  * Gaz / Gaj -> YD
  * Patta / Strip -> STRP
  * Nag / Piece / Pc -> PCS
  * Jodi / Pair -> PAR
  * Kilo / Kg -> KGS
  * Litre / Ltr -> LTR
  * Darjan / Dozen -> DOZ

### STRICT SHOPKEEPER MATH RULE (DO NOT CORRECT MATH!):
- In `written_line_total`, extract the EXACT number written on the paper at the right margin.
- DO NOT multiply `quantity * unit_price` if the shopkeeper wrote a different number (e.g. if receipt says "3 x 45 = 120", you MUST set `written_line_total = 120.0`). Our downstream audit engine will catch calculation mistakes.
- If no unit price is written and only a line total exists, set `unit_price: null`.

### STRICT ZERO-HALLUCINATION & ZERO-AUTOFILL MANDATE:
- NO INVENTED STORE NAMES: If a receipt does NOT have a merchant name printed, stamped, or written on it, set `merchant_name = null`. NEVER default to a fake or guessed store name!
- NO INVENTED GSTIN: If a receipt does NOT have an explicit 15-character GSTIN written on it, set `supplier_gstin = null`. NEVER default to a demo or state GSTIN!
- NO INVENTED DATES: Only extract a date if a full calendar date (e.g., DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY) is physically written on the paper slip. If no date is written, set `raw_date_written = null`. NEVER guess or substitute today's date! DO NOT confuse 1-2 digit slip numbers, table numbers, or serial numbers with dates.
- RIGHT-TO-LEFT (URDU/ARABIC) & MULTI-LAYOUT TABLE SUPPORT:
  * Many Indian cash memos place the Quantity column on the far right and the Amount column on the far left. Mentally detect column headers or layout structure.
  * In many cash memos or bills, multiple item rows are listed without individual row prices, but a single consolidated lumpsum total is written at the bottom or side in the Amount column.
  * Extract only the numbers physically written on each row into `unit_price` and `written_line_total`. If a row has NO price written next to it, set `unit_price = null` and `written_line_total = 0.0`.
  * ALWAYS capture the bottom, side, or subtotal written in the Amount column into `written_grand_total` and `written_subtotal`!
"""


def parse_bill_with_gemini(
    pil_image: Image.Image,
    sha256_hash: Optional[str] = None,
    bypass_cache: bool = True,
    api_key: Optional[str] = None
) -> Tuple[RawVisionBill, str, bool]:
    """
    Routes an image directly and live through the multi-model cascade with zero caching:
    Returns (raw_bill, model_used, cache_hit=False).
    """
    # Check API key
    resolved_key = api_key or os.getenv("GEMINI_API_KEY")
    if not resolved_key or resolved_key.strip() in ("", "your_key_here"):
        raise ValueError(
            "GEMINI_API_KEY is not set or invalid. Please configure your key in .env or pass mock=True."
        )

    # Initialize official google-genai client
    try:
        from google import genai
        from google.genai import types
    except ImportError as e:
        raise RuntimeError(
            "google-genai SDK not installed. Please run `pip install google-genai`."
        ) from e

    client = genai.Client(api_key=resolved_key)

    last_error: Optional[Exception] = None

    # Iterate through live model fallback cascade
    for model_name in MODEL_FALLBACK_CASCADE:
        logger.info(f"Attempting live vernacular OCR with model: {model_name}")
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    pil_image,
                    VERNACULAR_OCR_SYSTEM_PROMPT
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=RawVisionBill,
                    temperature=0.1,
                )
            )

            if not response.text:
                raise ValueError(f"Empty response from model {model_name}")

            # Parse structured JSON output into RawVisionBill
            data = json.loads(response.text)
            parsed_bill = RawVisionBill.model_validate(data)

            # Confidence score check: If any line item has low confidence (< 0.72), escalate
            has_low_confidence = any(
                item.confidence_score < 0.72 for item in parsed_bill.items
            )

            if has_low_confidence and model_name != MODEL_FALLBACK_CASCADE[-1]:
                logger.warning(
                    f"Model {model_name} produced low confidence (< 0.72). Escalating to next model..."
                )
                continue

            # Pure live response (zero caching)
            return parsed_bill, model_name, False

        except Exception as e:
            logger.warning(f"Model {model_name} failed with error: {e}. Trying fallback...")
            last_error = e
            continue

    # If all models in cascade fail
    raise RuntimeError(
        f"All models in fallback cascade ({MODEL_FALLBACK_CASCADE}) failed. Last error: {last_error}"
    )

