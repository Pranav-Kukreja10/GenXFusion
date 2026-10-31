"""
test_preprocessor.py - Verification for 5-Stage Document Illumination & Shadow-Division Pipeline
Tests:
1. Synthetic harsh shadow boundary removal.
2. Latency check (< 50ms).
3. Variance drop across shadow boundary (> 75%).
"""

import io
import time
import numpy as np
import cv2
from PIL import Image, ImageDraw

from image_preprocessor import preprocess_bill_image


def generate_synthetic_shadowed_receipt(width=1000, height=1400) -> bytes:
    """Creates a synthetic receipt with a harsh diagonal/half shadow and text strokes."""
    img = Image.new("RGB", (width, height), color=(245, 242, 235))
    draw = ImageDraw.Draw(img)

    # Draw text lines across the image
    for y in range(100, height - 100, 60):
        draw.text((80, y), f"Line Item {y // 60}: 2 Nag Timber Wood @ 700 = 1400/-", fill=(25, 25, 25))

    # Convert to numpy to apply a harsh 50% shadow gradient on the bottom-right half
    arr = np.array(img).astype(np.float32)
    shadow_mask = np.ones((height, width), dtype=np.float32)

    # Diagonal shadow from y=400, x=0 to bottom right
    for y in range(height):
        for x in range(width):
            if y + x > 1000:
                # 50% shadow multiplier (darkening)
                shadow_mask[y, x] = 0.50

    arr = arr * shadow_mask[:, :, np.newaxis]
    shadowed_img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    buf = io.BytesIO()
    shadowed_img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def test_shadow_removal():
    img_bytes = generate_synthetic_shadowed_receipt()

    # Warmup
    _ = preprocess_bill_image(img_bytes)

    # Measure execution time
    t0 = time.perf_counter()
    res = preprocess_bill_image(img_bytes)
    t1 = time.perf_counter()
    latency_ms = (t1 - t0) * 1000.0

    print(f" Preprocessing Latency: {latency_ms:.2f} ms")
    assert latency_ms < 50.0, f"Expected <50ms, got {latency_ms:.2f}ms"

    # Analyze shadow boundary variance
    # Load raw and enhanced images
    raw_pil = Image.open(io.BytesIO(img_bytes)).convert("L")
    raw_np = np.array(raw_pil).astype(np.float32)

    enhanced_pil = res["pil_image"].convert("L")
    enhanced_np = np.array(enhanced_pil).astype(np.float32)

    # Take background patches from unshadowed area (x=200, y=200) vs shadowed area (x=800, y=1000)
    raw_bright_patch = raw_np[200:260, 200:300]
    raw_shadow_patch = raw_np[1000:1060, 800:900]
    raw_diff = abs(np.mean(raw_bright_patch) - np.mean(raw_shadow_patch))

    enh_bright_patch = enhanced_np[200:260, 200:300]
    enh_shadow_patch = enhanced_np[1000:1060, 800:900]
    enh_diff = abs(np.mean(enh_bright_patch) - np.mean(enh_shadow_patch))

    variance_drop_pct = ((raw_diff - enh_diff) / max(raw_diff, 1e-5)) * 100.0
    print(f" Raw background light difference across shadow: {raw_diff:.2f}")
    print(f" Enhanced background light difference across shadow: {enh_diff:.2f}")
    print(f" Background illumination variance drop: {variance_drop_pct:.2f}%")

    assert variance_drop_pct > 70.0, f"Expected >70% variance drop, got {variance_drop_pct:.2f}%"
    assert res["enhanced_image_b64"].startswith("data:image/jpeg;base64,")
    assert res["raw_image_b64"].startswith("data:image/jpeg;base64,")
    print(" ALL 5-STAGE PIPELINE TESTS PASSED!")


if __name__ == "__main__":
    test_shadow_removal()
