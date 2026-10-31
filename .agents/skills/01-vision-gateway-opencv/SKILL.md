---
name: vision-gateway-opencv
description: Use for Teammate 1 tasks: backend/main.py, backend/schemas.py, backend/vision_router.py, OpenCV CLAHE shadow removal, and multi-model Gemini OCR routing.
---

<LANE_1_CONSTRAINTS>
1. STRICT FILE OWNERSHIP: Only create or edit `backend/main.py`, `backend/schemas.py`, `backend/vision_router.py`, and `backend/image_preprocessor.py`. Never touch `hsn_matcher.py` or `math_auditor.py`.
2. OPENCV CLAHE PREPROCESSING: Before sending bill photos to Gemini Vision, convert to LAB color space, apply CLAHE (`clipLimit=2.0, tileGridSize=(8,8)`) on the L-channel, and return both `raw_image_b64` and `enhanced_image_b64` for Teammate 3's split-screen slider.
3. QUOTA-SAFE FALLBACK ROUTER + SHA-256 CACHE:
   - Compute `hashlib.sha256(image_bytes).hexdigest()`. Check in-memory/disk JSON cache first so judge re-scans take <50ms and 0 API quota.
   - Fallback chain: `gemini-3.5-flash-lite` -> `gemini-3.1-flash-lite` -> `gemini-2.5-flash`.
4. SHORTHAND & SECTOR PROMPTING: Force structured JSON output detecting `detected_sector` (`GROCERY`, `TEXTILE`, `ELECTRONICS`, `HARDWARE`, `MEDICAL`, `FOOTWEAR_AUTO`), extracting `is_struck_out: bool`, and converting fractional Hindi quantities (`Pao`=0.25, `Adha`=0.5, `Sawa`=1.25, `Dedh`=1.5, `Dhai`=2.5).
</LANE_1_CONSTRAINTS>
