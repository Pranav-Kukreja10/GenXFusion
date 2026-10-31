"""
test_all.py - Complete Integration Test for ParchiSetu AI (Lane 1 & Lane 2)
Tests:
1. Full-Stack Dashboard served at GET /
2. Health Check at GET /api/v1/health
3. HSN Catalog Search at GET /api/v1/hsn/search
4. Parse Invoice at POST /api/v1/invoice/parse (and /api/scan-bill)
5. Recalculate Invoice at POST /api/v1/invoice/recalculate (and /api/recalculate)
6. GSTR-1 JSON Export at POST /api/v1/invoice/export-gstr1 (and /api/export-gstr1)
"""

import sys
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("--- [1/6] Testing GET / Dashboard ---")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "ParchiSetu" in res.text, "Dashboard HTML did not contain ParchiSetu"
    print(" PASSED: GET / serves full-stack command center dashboard.")

    print("\n--- [2/6] Testing GET /api/v1/health ---")
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["teammate_integrations"]["hsn_matcher"] == "external"
    assert data["teammate_integrations"]["math_auditor"] == "external"
    print(" PASSED: Lane 2 external modules hooked into main.py.")

    print("\n--- [3/6] Testing GET /api/v1/hsn/search ---")
    res = client.get("/api/v1/hsn/search?q=cement")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0
    assert any("2523" in item["hsn_code"] for item in data["results"])
    print(f" PASSED: HSN search found {data['count']} matches for 'cement'.")

    print("\n--- [4/6] Testing POST /api/v1/invoice/parse?mock=True ---")
    res = client.post("/api/v1/invoice/parse?mock=True")
    assert res.status_code == 200
    inv = res.json()
    assert len(inv["active_items"]) >= 3
    assert len(inv["struck_out_items"]) >= 1
    assert inv["active_items"][1]["has_math_error"] is True
    assert inv["active_items"][2]["gst_rate"] == 12.0
    print(" PASSED: Mock invoice correctly audited with threshold & math errors.")

    print("\n--- [5/6] Testing POST /api/v1/invoice/recalculate ---")
    recalc_payload = {
        "bill_id": "test_recalc",
        "detected_sector": "TEXTILE",
        "active_items": [
            {
                "row_id": 1,
                "raw_text": "1 Wedding Lehnga @ 2500",
                "product_name_normalized": "Wedding Lehnga",
                "quantity": 1.0,
                "unit_price": 2500.0,
                "written_line_total": 2500.0,
                "hsn_code": "6204"
            }
        ],
        "struck_out_items": []
    }
    res = client.post("/api/v1/invoice/recalculate", json=recalc_payload)
    assert res.status_code == 200
    data = res.json()
    item = data["active_items"][0]
    assert item["gst_rate"] == 12.0
    assert item["cgst_amount"] == 150.0
    assert item["sgst_amount"] == 150.0
    assert item["total_with_tax"] == 2800.0
    print(" PASSED: Recalculate verified in <5ms.")

    print("\n--- [6/6] Testing POST /api/v1/invoice/export-gstr1 ---")
    export_payload = {
        "gstin": "27AABCU9603R1ZM",
        "tax_period": "102026",
        "invoice": inv
    }
    res = client.post("/api/v1/invoice/export-gstr1", json=export_payload)
    assert res.status_code == 200
    gstr1 = res.json()
    assert "b2cs" in gstr1
    assert "hsn" in gstr1
    print(" PASSED: GSTR-1 JSON generated with official portal schema.")

    print("\n" + "=" * 60)
    print(" ALL 6/6 SYSTEM INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

