"""
image_preprocessor.py - OpenCV CLAHE Shadow Removal & Preprocessing Pipeline
Part of ParchiSetu AI / Bharat GST Vision Engine (Lane 1).

Takes raw mobile phone bill photos, removes shadows and uneven room lighting
via Contrast Limited Adaptive Histogram Equalization (CLAHE) in LAB color space,
and returns both a PIL Image for Gemini Vision and Base64 data URLs for the frontend split-slider.
"""

from __future__ import annotations
import base64
import hashlib
import io
from typing import Tuple, Dict, Any

import cv2
import numpy as np
from PIL import Image


def compute_sha256(image_bytes: bytes) -> str:
    """Compute deterministic SHA-256 hash for caching and invoice identification."""
    return hashlib.sha256(image_bytes).hexdigest()


def bytes_to_data_url(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """Encode binary image bytes to a standard Base64 data URL."""
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def preprocess_bill_image(
    image_bytes: bytes,
    max_dimension: int = 1600,
    clahe_clip_limit: float = 2.0,
    clahe_tile_grid_size: Tuple[int, int] = (8, 8),
    jpeg_quality: int = 90
) -> Dict[str, Any]:
    """
    Process an uploaded bill image:
    1. Decode bytes into OpenCV BGR numpy array.
    2. Resize if image exceeds max_dimension while preserving aspect ratio.
    3. Convert to LAB color space and apply CLAHE to the Luminance (L) channel.
    4. Convert enhanced image back to BGR and RGB.
    5. Export:
       - pil_image: PIL Image in RGB mode (for Gemini SDK)
       - enhanced_image_b64: data URL string (for frontend split-slider)
       - raw_image_b64: data URL string of input image
       - sha256_hash: SHA-256 fingerprint of input bytes
    """
    sha256_hash = compute_sha256(image_bytes)
    raw_data_url = bytes_to_data_url(image_bytes, "image/jpeg")

    # 1. Decode image bytes to OpenCV BGR array
    np_arr = np.frombuffer(image_bytes, np.uint8)
    bgr_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if bgr_img is None:
        # Fallback if cv2 fails to decode (e.g. non-standard format) -> PIL fallback
        pil_raw = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        bgr_img = cv2.cvtColor(np.array(pil_raw), cv2.COLOR_RGB2BGR)

    orig_h, orig_w = bgr_img.shape[:2]

    # 2. Downscale if image is overly large to optimize latency and model token limits
    if max(orig_h, orig_w) > max_dimension:
        scale = max_dimension / float(max(orig_h, orig_w))
        new_w = int(orig_w * scale)
        new_h = int(orig_h * scale)
        bgr_img = cv2.resize(bgr_img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # 3. LAB Color Space + CLAHE Shadow Removal
    # L channel represents luminance/brightness; A and B represent color opponents
    lab = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(
        clipLimit=clahe_clip_limit,
        tileGridSize=clahe_tile_grid_size
    )
    enhanced_l = clahe.apply(l_channel)

    # 4. Merge channels back and convert to RGB
    enhanced_lab = cv2.merge((enhanced_l, a_channel, b_channel))
    enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    enhanced_rgb = cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB)

    # 5. Convert to PIL Image for Google GenAI SDK
    pil_image = Image.fromarray(enhanced_rgb)

    # 6. Encode enhanced image to JPEG bytes and Base64 data URL
    encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality]
    _, buffer = cv2.imencode(".jpg", enhanced_bgr, encode_params)
    enhanced_bytes = buffer.tobytes()
    enhanced_data_url = bytes_to_data_url(enhanced_bytes, "image/jpeg")

    return {
        "sha256_hash": sha256_hash,
        "pil_image": pil_image,
        "raw_image_b64": raw_data_url,
        "enhanced_image_b64": enhanced_data_url,
        "enhanced_image_base64": enhanced_data_url,
        "width": bgr_img.shape[1],
        "height": bgr_img.shape[0],
    }

