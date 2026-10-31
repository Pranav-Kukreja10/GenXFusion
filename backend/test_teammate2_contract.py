"""
backend/test_teammate2_contract.py - Verification & Benchmark Suite for Teammate 2 Module
Part of ParchiSetu AI / Bharat GST Vision Engine.

Functions:
1. generate_golden_mocks():
   Runs all 3 physical demo bills (Kirana, Textile, Hardware_Electronics) through
   audit_invoice_items(...) and generate_gstr1_json(...), saving the complete contract payload
   to backend/data/golden_demo_mocks.json for Frontend Lanes 3 & 4 and FastAPI Lane 1.
2. test_live_recalculation():
   Simulates live judge edits on the UI (Cotton Kurti price edited ₹850 -> ₹1250 upgrading 5% -> 12% GST),
   manual HSN overrides, and out-of-vocabulary fallback resilience across all 6 sectors.
3. benchmark_matcher_latency():
   Measures warm PyTorch neural & vector inference over 50 consecutive queries,
   asserting sub-15ms latency per item.
"""

from __future__ import annotations

import os
import sys
import json
import time
import logging
from typing import Dict, Any, List

# Ensure backend directory is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import hsn_matcher
import math_auditor
import gstr1_exporter

GOLDEN_MOCKS_PATH = os.path.join(CURRENT_DIR, "data", "golden_demo_mocks.json")

# ============================================================================
# 1. Generate Golden Demo Mocks for Lanes 1, 3, & 4
# ============================================================================

def generate_golden_mocks() -> Dict[str, Any]:
    """
    Executes all 3 physical demo bills through the Lane 2 audit engine and GSTR-1 generator,
    saving the complete contract payload to backend/data/golden_demo_mocks.json.
    """
    print("\n" + "=" * 80)
    print("STEP 1: GENERATING GOLDEN FRONTEND MOCK PAYLOADS")
    print("=" * 80)

    # Demo Bill 1: Kirana (Grocery Provisions)
    kirana_bill = {
        "bill_id": "golden_kirana_001",
        "detected_sector": "Kirana",
        "store_name_guess": "Gupta Kirana & General Store",
        "merchant_name": "Gupta Kirana & General Store",
        "raw_date_written": "31/10/2026",
        "items": [
            {
                "row_id": 1,
                "raw_text": "Dedh peti Aashirvaad Atta",
                "raw_text_on_paper": "Dedh peti Aashirvaad Atta",
                "product_name_normalized": "Aashirvaad Atta",
                "quantity": 1.5,
                "raw_quantity": "Dedh peti",
                "unit_uqc": "BOX",
                "unit_price": 360.0,
                "written_line_total": 540.0,
                "is_struck_out": False
            },
            {
                "row_id": 2,
                "raw_text": "2 kg Khulla Chawal",
                "raw_text_on_paper": "2 kg Khulla Chawal",
                "product_name_normalized": "Khulla Chawal",
                "quantity": 2.0,
                "raw_quantity": "2 kg",
                "unit_uqc": "KGS",
                "unit_price": 40.0,
                "written_line_total": 80.0,
                "is_struck_out": False
            },
            {
                "row_id": 3,
                "raw_text": "3 Nag Lux Soap @ 45 = 145",
                "raw_text_on_paper": "3 Nag Lux Soap @ 45 = 145",
                "product_name_normalized": "Lux Soap",
                "quantity": 3.0,
                "raw_quantity": "3 Nag",
                "unit_uqc": "PCS",
                "unit_price": 45.0,
                "written_line_total": 145.0,  # Shopkeeper error: 3 * 45 = 135
                "is_struck_out": False
            },
            {
                "row_id": 4,
                "raw_text": "1 kg Maida cut",
                "raw_text_on_paper": "1 kg Maida cut",
                "product_name_normalized": "Maida",
                "quantity": 1.0,
                "raw_quantity": "1 kg",
                "unit_uqc": "KGS",
                "unit_price": 35.0,
                "written_line_total": 35.0,
                "is_struck_out": True
            }
        ]
    }

    # Demo Bill 2: Textile (Cloth & Apparel)
    textile_bill = {
        "bill_id": "golden_textile_002",
        "detected_sector": "Textile",
        "store_name_guess": "Punjab Cloth & Readymade House",
        "merchant_name": "Punjab Cloth & Readymade House",
        "raw_date_written": "31/10/2026",
        "items": [
            {
                "row_id": 1,
                "raw_text": "10 Gaz Cotton Kapda @ 120",
                "raw_text_on_paper": "10 Gaz Cotton Kapda @ 120",
                "product_name_normalized": "Cotton Kapda",
                "quantity": 10.0,
                "raw_quantity": "10 Gaz",
                "unit_uqc": "YD",
                "unit_price": 120.0,
                "written_line_total": 1200.0,
                "is_struck_out": False
            },
            {
                "row_id": 2,
                "raw_text": "1 Cotton Kurti @ 850",
                "raw_text_on_paper": "1 Cotton Kurti @ 850",
                "product_name_normalized": "Cotton Kurti",
                "quantity": 1.0,
                "raw_quantity": "1 nag",
                "unit_uqc": "PCS",
                "unit_price": 850.0,
                "written_line_total": 850.0,
                "is_struck_out": False
            },
            {
                "row_id": 3,
                "raw_text": "1 Heavy Wedding Suit @ 2400",
                "raw_text_on_paper": "1 Heavy Wedding Suit @ 2400",
                "product_name_normalized": "Heavy Wedding Suit",
                "quantity": 1.0,
                "raw_quantity": "1 nag",
                "unit_uqc": "PCS",
                "unit_price": 2400.0,
                "written_line_total": 2400.0,
                "is_struck_out": False
            },
            {
                "row_id": 4,
                "raw_text": "2 mtr Astar Kapda - 160 (cut)",
                "raw_text_on_paper": "2 mtr Astar Kapda - 160 (cut)",
                "product_name_normalized": "Astar Kapda",
                "quantity": 2.0,
                "raw_quantity": "2 mtr",
                "unit_uqc": "MTR",
                "unit_price": 80.0,
                "written_line_total": 160.0,
                "is_struck_out": True
            }
        ]
    }

    # Demo Bill 3: Hardware & Electronics
    hardware_bill = {
        "bill_id": "golden_hardware_003",
        "detected_sector": "Hardware",
        "store_name_guess": "Shree Balaji Electricals & Hardware",
        "merchant_name": "Shree Balaji Electricals & Hardware",
        "raw_date_written": "31/10/2026",
        "supplier_state_code": "03",
        "buyer_state_code": "03",
        "items": [
            {
                "row_id": 1,
                "raw_text": "4 Nag 9W LED Bulb @ 90",
                "raw_text_on_paper": "4 Nag 9W LED Bulb @ 90",
                "product_name_normalized": "9W LED Bulb",
                "quantity": 4.0,
                "raw_quantity": "4 Nag",
                "unit_uqc": "PCS",
                "unit_price": 90.0,
                "written_line_total": 360.0,
                "is_struck_out": False
            },
            {
                "row_id": 2,
                "raw_text": "2 Bori UltraTech Cement @ 380",
                "raw_text_on_paper": "2 Bori UltraTech Cement @ 380",
                "product_name_normalized": "UltraTech Cement",
                "quantity": 2.0,
                "raw_quantity": "2 Bori",
                "unit_uqc": "BAG",
                "unit_price": 380.0,
                "written_line_total": 760.0,
                "is_struck_out": False
            },
            {
                "row_id": 3,
                "raw_text": "100 Nos Iron Screws @ 1.5 = 150",
                "raw_text_on_paper": "100 Nos Iron Screws @ 1.5 = 150",
                "product_name_normalized": "Iron Screws",
                "quantity": 100.0,
                "raw_quantity": "100 Nos",
                "unit_uqc": "PCS",
                "unit_price": 1.5,
                "written_line_total": 150.0,
                "is_struck_out": False
            },
            {
                "row_id": 4,
                "raw_text": "1 Pkt Cut Fasteners - 40 (cut)",
                "raw_text_on_paper": "1 Pkt Cut Fasteners - 40 (cut)",
                "product_name_normalized": "Fasteners",
                "quantity": 1.0,
                "raw_quantity": "1 Pkt",
                "unit_uqc": "PAC",
                "unit_price": 40.0,
                "written_line_total": 40.0,
                "is_struck_out": True
            }
        ]
    }

    # Demo Bill 4: Inter-State Supply (Punjab 03 -> Delhi 07)
    interstate_textile_bill = {
        "bill_id": "golden_interstate_004",
        "detected_sector": "Textile",
        "store_name_guess": "Punjab Heritage Handlooms (Ludhiana)",
        "merchant_name": "Punjab Heritage Handlooms",
        "raw_date_written": "31/10/2026",
        "supplier_state_code": "03",  # Punjab
        "buyer_state_code": "07",     # Delhi (Inter-State)
        "items": [
            {
                "row_id": 1,
                "raw_text": "2 Cotton Kurti @ 850",
                "raw_text_on_paper": "2 Cotton Kurti @ 850",
                "product_name_normalized": "Cotton Kurti",
                "quantity": 2.0,
                "raw_quantity": "2 nag",
                "unit_uqc": "PCS",
                "unit_price": 850.0,
                "written_line_total": 1700.0,
                "is_struck_out": False
            },
            {
                "row_id": 2,
                "raw_text": "1 Heavy Wedding Lehnga @ 3500",
                "raw_text_on_paper": "1 Heavy Wedding Lehnga @ 3500",
                "product_name_normalized": "Heavy Wedding Lehnga",
                "quantity": 1.0,
                "raw_quantity": "1 nag",
                "unit_uqc": "PCS",
                "unit_price": 3500.0,
                "written_line_total": 3500.0,
                "is_struck_out": False
            }
        ]
    }

    bills_to_process = [
        ("kirana_demo", kirana_bill),
        ("textile_demo", textile_bill),
        ("hardware_electronics_demo", hardware_bill),
        ("interstate_textile_demo", interstate_textile_bill)
    ]

    golden_mocks: Dict[str, Any] = {}

    for key, bill in bills_to_process:
        supp_st = bill.get("supplier_state_code", "03")
        buy_st = bill.get("buyer_state_code", "03")

        audited = math_auditor.audit_invoice_items(
            items=bill["items"],
            detected_sector=bill["detected_sector"],
            apply_math_fix=False,
            supplier_state_code=supp_st,
            buyer_state_code=buy_st
        )

        gstr1_payload = gstr1_exporter.generate_gstr1_json(
            audited_invoice=audited,
            supplier_gstin=f"{supp_st}AABCU9603R1ZM",
            fp="102026",
            pos_code=buy_st
        )

        # Assemble full Shared Contract compliant mock payload
        tot = audited["totals"]
        summary = {
            "written_grand_total": tot["written_grand_total"],
            "audited_taxable_total": tot["audited_taxable_total"],
            "total_math_saved": tot["total_math_saved"],
            "total_cgst": tot["total_cgst"],
            "total_sgst": tot["total_sgst"],
            "final_payable_pakka_total": tot["final_payable_pakka_total"]
        }

        full_payload = {
            "bill_id": bill["bill_id"],
            "detected_sector": bill["detected_sector"],
            "store_name_guess": bill["store_name_guess"],
            "merchant_name": bill["merchant_name"],
            "raw_date_written": bill["raw_date_written"],
            "raw_image_b64": None,
            "enhanced_image_b64": None,
            "active_items": audited["active_items"],
            "struck_out_items": audited["struck_out_items"],
            "audit_alerts": audited["audit_alerts"],
            "hsn_summary_table": audited["hsn_summary_table"],
            "totals": audited["totals"],
            "summary": summary,
            "gstr1_payload": gstr1_payload
        }

        golden_mocks[key] = full_payload
        print(f"  Generated '{key}': {len(audited['active_items'])} active items, "
              f"{len(audited['struck_out_items'])} struck-out, Final Pakka Total: ₹{tot['final_payable_pakka_total']:.2f}")

    # Write to backend/data/golden_demo_mocks.json
    os.makedirs(os.path.dirname(GOLDEN_MOCKS_PATH), exist_ok=True)
    with open(GOLDEN_MOCKS_PATH, "w", encoding="utf-8") as f:
        json.dump(golden_mocks, f, indent=2, ensure_ascii=False)

    file_size_kb = os.path.getsize(GOLDEN_MOCKS_PATH) / 1024.0
    print(f"\n[PASS] Saved Golden Mock Payloads to: {GOLDEN_MOCKS_PATH} ({file_size_kb:.1f} KB)")
    assert os.path.exists(GOLDEN_MOCKS_PATH), "Golden mocks file was not created"
    assert file_size_kb > 1.0, "Golden mocks file is unexpectedly small"
    return golden_mocks


# ============================================================================
# 2. Edge-Case & Live Edit Recalculation Test
# ============================================================================

def test_live_recalculation():
    """
    Simulates:
    1. Judge editing Cotton Kurti price on frontend: ₹850 (5% GST) -> ₹1250 (12% GST auto-upgrade).
    2. Judge overriding HSN code via dropdown.
    3. Out-of-vocabulary item fallback resilience across all 6 sectors.
    """
    print("\n" + "=" * 80)
    print("STEP 2: EDGE-CASE & LIVE EDIT RECALCULATION TESTS")
    print("=" * 80)

    # 1. Price Edit Simulation: ₹850 -> ₹1250 on Cotton Kurti
    print("\n[Sim 1] Live Judge Price Edit: Cotton Kurti ₹850 -> ₹1250")
    base_item = {
        "row_id": 1,
        "raw_text": "1 Cotton Kurti @ 850",
        "product_name_normalized": "Cotton Kurti",
        "quantity": 1.0,
        "unit_price": 850.0,
        "written_line_total": 850.0,
        "is_struck_out": False
    }

    res_850 = math_auditor.audit_invoice_items([base_item], detected_sector="Textile")
    item_850 = res_850["active_items"][0]
    assert item_850["gst_rate"] == 5.0, f"Expected 5% GST at ₹850, got {item_850['gst_rate']}%"
    assert item_850["cgst_rate"] == 2.5
    assert item_850["sgst_rate"] == 2.5
    assert item_850["tax_rule_triggered"] is True
    print(f"  At ₹850: Rate = {item_850['gst_rate']}% (CGST {item_850['cgst_rate']}% + SGST {item_850['sgst_rate']}%)")
    print(f"  Rule Note: {item_850['tax_rule_note']}")

    # User modifies price in UI to ₹1250
    edited_item = dict(base_item)
    edited_item["unit_price"] = 1250.0
    edited_item["written_line_total"] = 1250.0

    res_1250 = math_auditor.audit_invoice_items([edited_item], detected_sector="Textile")
    item_1250 = res_1250["active_items"][0]
    assert item_1250["gst_rate"] == 12.0, f"Expected auto-upgrade to 12% GST at ₹1250, got {item_1250['gst_rate']}%"
    assert item_1250["cgst_rate"] == 6.0
    assert item_1250["sgst_rate"] == 6.0
    assert item_1250["tax_rule_triggered"] is True
    assert "auto-upgraded" in item_1250["tax_rule_note"].lower()
    print(f"  At ₹1250 (EDITED): Rate = {item_1250['gst_rate']}% (CGST {item_1250['cgst_rate']}% + SGST {item_1250['sgst_rate']}%)")
    print(f"  Rule Note: {item_1250['tax_rule_note']}")
    print("  [PASS] Live price edit triggered automatic 5% -> 12% GST slab transition!")

    # 2. Manual HSN Override Simulation
    print("\n[Sim 2] Manual HSN Override: Change HSN from alternatives dropdown")
    override_item = {
        "row_id": 1,
        "raw_text": "1 Cotton Fabric Piece @ 500",
        "product_name_normalized": "Cotton Fabric",
        "quantity": 1.0,
        "unit_price": 500.0,
        "written_line_total": 500.0,
        "manual_hsn_override": "5208",  # User manually picks 5208 from alternatives
        "is_struck_out": False
    }

    res_override = math_auditor.audit_invoice_items([override_item], detected_sector="Textile")
    item_ov = res_override["active_items"][0]
    assert item_ov["hsn_code"] == "5208", f"Expected HSN 5208, got {item_ov['hsn_code']}"
    assert item_ov["gst_rate"] == 5.0
    print(f"  Manual HSN '5208' Applied -> HSN: {item_ov['hsn_code']} @ {item_ov['gst_rate']}% GST")
    print(f"  Audited Line Total: ₹{item_ov['audited_line_total']}, Total with Tax: ₹{item_ov['total_with_tax']}")
    print("  [PASS] Manual HSN override recalculation verified cleanly!")

    # 3. Out-Of-Vocabulary Item Sector Fallback Resilience Test
    print("\n[Sim 3] Out-Of-Vocabulary Item Fallback Resilience across all 6 Sectors")
    sector_fallbacks = [
        ("Kirana", "2106"),
        ("Textile", "6204"),
        ("Electronics", "8536"),
        ("Hardware", "7318"),
        ("Medical", "3004"),
        ("Footwear_Utensils_Auto", "7323")
    ]

    for sector, expected_fallback_hsn in sector_fallbacks:
        oov_result = hsn_matcher.match_hsn(
            product_name_normalized="XYZ Unknown Local Desi Part 999",
            raw_text="XYZ Unknown Local Desi Part 999 @ 50",
            detected_sector=sector,
            unit_price=50.0
        )
        assert oov_result is not None, f"Matcher returned None for sector {sector}"
        assert oov_result["is_sector_fallback"] is True, f"Expected is_sector_fallback=True for sector {sector}"
        assert oov_result["hsn_code"] == expected_fallback_hsn, (
            f"Expected fallback HSN {expected_fallback_hsn} for {sector}, got {oov_result['hsn_code']}"
        )
        print(f"  Sector '{sector:22}' -> Graceful Fallback HSN {oov_result['hsn_code']} "
              f"({oov_result['category_description'][:28]}) | is_sector_fallback = True")

    print("  [PASS] Out-of-vocabulary fallback verified: Zero crashes, zero hallucinated blanks!")

    # 4. Inter-State Supply (Punjab 03 -> Delhi 07) IGST Auto-Switch Test
    print("\n[Sim 4] Inter-State Supply Detection: Punjab (03) -> Delhi (07) IGST Auto-Switch")
    inter_items = [
        {
            "row_id": 1,
            "raw_text": "2 Cotton Kurti @ 850",
            "product_name_normalized": "Cotton Kurti",
            "quantity": 2.0,
            "unit_price": 850.0,
            "written_line_total": 1700.0,
            "is_struck_out": False
        },
        {
            "row_id": 2,
            "raw_text": "1 Heavy Wedding Lehnga @ 3500",
            "product_name_normalized": "Heavy Wedding Lehnga",
            "quantity": 1.0,
            "unit_price": 3500.0,
            "written_line_total": 3500.0,
            "is_struck_out": False
        }
    ]

    res_inter = math_auditor.audit_invoice_items(
        items=inter_items,
        detected_sector="Textile",
        supplier_state_code="03",  # Punjab
        buyer_state_code="07"     # Delhi
    )

    tot_inter = res_inter["totals"]
    assert tot_inter["supply_type"] == "INTER", f"Expected supply_type='INTER', got {tot_inter['supply_type']}"
    assert tot_inter["total_cgst"] == 0.0, f"Expected total_cgst=0.0 in inter-state, got {tot_inter['total_cgst']}"
    assert tot_inter["total_sgst"] == 0.0, f"Expected total_sgst=0.0 in inter-state, got {tot_inter['total_sgst']}"
    assert tot_inter["total_igst"] > 0.0, f"Expected total_igst > 0, got {tot_inter['total_igst']}"

    # Item 1: 1700 taxable @ 5% = 85 IGST
    it1 = res_inter["active_items"][0]
    assert it1["supply_type"] == "INTER"
    assert it1["igst_rate"] == 5.0
    assert it1["cgst_rate"] == 0.0 and it1["sgst_rate"] == 0.0
    assert it1["igst_amount"] == 85.0
    assert it1["cgst_amount"] == 0.0 and it1["sgst_amount"] == 0.0

    # Item 2: 3500 taxable @ 12% = 420 IGST
    it2 = res_inter["active_items"][1]
    assert it2["supply_type"] == "INTER"
    assert it2["igst_rate"] == 12.0
    assert it2["cgst_rate"] == 0.0 and it2["sgst_rate"] == 0.0
    assert it2["igst_amount"] == 420.0
    assert it2["cgst_amount"] == 0.0 and it2["sgst_amount"] == 0.0

    # Check alert message
    inter_alerts = [m for m in res_inter["audit_alerts"]["alert_messages"] if "Inter-State Supply Detected" in m]
    assert len(inter_alerts) > 0, "Missing Inter-State Supply Detected alert message!"
    print(f"  Alert Verified: {inter_alerts[0]}")

    # Check GSTR-1 generation for inter-state
    gstr1_inter = gstr1_exporter.generate_gstr1_json(
        audited_invoice=res_inter,
        supplier_gstin="03AABCU9603R1ZM",
        fp="102026",
        pos_code="07"
    )
    b2cs_inter = gstr1_inter["b2cs"]
    assert len(b2cs_inter) == 2, f"Expected 2 B2CS rates (5% and 12%), got {len(b2cs_inter)}"
    for row in b2cs_inter:
        assert row["sply_ty"] == "INTER", f"Expected sply_ty='INTER', got {row['sply_ty']}"
        assert row["pos"] == "07", f"Expected pos='07', got {row['pos']}"
        assert row["iamt"] > 0.0, f"Expected iamt > 0, got {row['iamt']}"
        assert row["camt"] == 0.0 and row["samt"] == 0.0, f"Expected camt/samt 0, got {row['camt']}, {row['samt']}"

    hsn_inter = gstr1_inter["hsn"]["data"]
    for hsn_row in hsn_inter:
        assert hsn_row["iamt"] > 0.0, f"Expected HSN iamt > 0, got {hsn_row['iamt']}"
        assert hsn_row["camt"] == 0.0 and hsn_row["samt"] == 0.0

    print(f"  Totals: Taxable ₹{tot_inter['audited_taxable_total']} | CGST: ₹{tot_inter['total_cgst']} | SGST: ₹{tot_inter['total_sgst']} | IGST: ₹{tot_inter['total_igst']} | Final: ₹{tot_inter['final_payable_pakka_total']}")
    print("  [PASS] Inter-State supply detection and IGST 100% allocation verified across auditor and GSTR-1!")


# ============================================================================
# 3. PyTorch Latency Benchmark
# ============================================================================

def benchmark_matcher_latency():
    """
    Measures warm PyTorch vector & tensor inference over 50 consecutive queries.
    Asserts average latency < 15ms per item.
    """
    print("\n" + "=" * 80)
    print("STEP 3: PYTORCH HSN VECTOR ENGINE LATENCY BENCHMARK")
    print("=" * 80)

    # Realistic benchmark query pool
    benchmark_queries = [
        ("Aashirvaad Atta", "Kirana", 360.0),
        ("Khulla Chawal", "Kirana", 40.0),
        ("Cotton Kurti", "Textile", 850.0),
        ("Wedding Lehnga", "Textile", 2400.0),
        ("9W LED Bulb Syska", "Electronics", 90.0),
        ("UltraTech Cement Katta", "Hardware", 380.0),
        ("Dolo 650 Patta", "Medical", 30.0),
        ("Hawai Chappal Relaxo", "Footwear_Utensils_Auto", 250.0),
        ("Stainless Steel Thali", "Footwear_Utensils_Auto", 150.0),
        ("Castrol 4T Engine Oil", "Footwear_Utensils_Auto", 450.0),
    ]

    # Warmup
    print("Warming up vector engine...")
    for q_name, q_sec, q_price in benchmark_queries[:5]:
        hsn_matcher.match_hsn(q_name, "", q_sec, q_price)

    latencies_ms: List[float] = []
    num_iterations = 50

    print(f"Running {num_iterations} consecutive warm queries...")
    for i in range(num_iterations):
        q_name, q_sec, q_price = benchmark_queries[i % len(benchmark_queries)]
        t_start = time.perf_counter()
        res = hsn_matcher.match_hsn(q_name, "", q_sec, q_price)
        t_end = time.perf_counter()
        latencies_ms.append((t_end - t_start) * 1000.0)

    avg_ms = sum(latencies_ms) / len(latencies_ms)
    min_ms = min(latencies_ms)
    max_ms = max(latencies_ms)
    sorted_lats = sorted(latencies_ms)
    median_ms = sorted_lats[len(sorted_lats) // 2]
    p95_ms = sorted_lats[int(len(sorted_lats) * 0.95)]
    throughput_qps = 1000.0 / avg_ms if avg_ms > 0 else 0.0

    print("\n--- BENCHMARK RESULTS (Terminal Presentation for Judges) ---")
    print(f"  • Total Iterations     : {num_iterations} queries")
    print(f"  • Mean Latency         : {avg_ms:.2f} ms / item")
    print(f"  • Median Latency (P50) : {median_ms:.2f} ms")
    print(f"  • 95th Percentile (P95): {p95_ms:.2f} ms")
    print(f"  • Min Latency          : {min_ms:.2f} ms")
    print(f"  • Max Latency          : {max_ms:.2f} ms")
    print(f"  • Throughput           : {throughput_qps:.1f} items/sec")
    print(f"  • Target Threshold     : < 15.00 ms")

    if avg_ms < 15.0:
        print(f"\n🚀 [PASS] PyTorch Latency Benchmark PASSED ({avg_ms:.2f} ms < 15.00 ms target)!")
    else:
        print(f"\n⚠️ [WARN] Average latency {avg_ms:.2f} ms exceeded 15.00 ms target.")

    assert avg_ms < 15.0, f"Average latency {avg_ms:.2f} ms exceeded 15ms target!"


# ============================================================================
# Main Execution Runner
# ============================================================================

if __name__ == "__main__":
    t_suite_start = time.perf_counter()

    # 1. Generate Golden Frontend Mocks
    mocks = generate_golden_mocks()

    # 2. Test Live Recalculations & Edge Cases
    test_live_recalculation()

    # 3. Benchmark PyTorch Vector Latency
    benchmark_matcher_latency()

    total_suite_sec = time.perf_counter() - t_suite_start
    print("\n" + "=" * 80)
    print(f"✅ ALL TEAMMATE 2 CONTRACT TESTS & DELIVERABLES COMPLETED IN {total_suite_sec:.2f}s!")
    print("=" * 80)

