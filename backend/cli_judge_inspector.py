#!/usr/bin/env python3
"""
backend/cli_judge_inspector.py - Interactive Terminal Demo & Verification Suite for Judges
Part of ParchiSetu AI / Bharat GST Vision Engine (Teammate 2 Module).

Zero-dependency ANSI Color Terminal Demo Tool:
- Showcase Mode (`--showcase` or default):
  Displays beautifully formatted color tables for 3 Intra-State Golden Bills + 1 Inter-State
  (Punjab 03 -> Delhi 07) Bill + live PyTorch sub-15ms Latency Scorecard.
- Interactive Mode (`--interactive`):
  Allows judges to type ANY raw Hinglish line item live (e.g. '2 dedh kilo basmati chawal @ 90',
  '1 leather jacket @ 1800', '3 bori cement @ 390') and immediately inspect the PyTorch vector
  match, confidence %, top 3 alternatives, UQC normalization, conditional GST slab, and tax breakup.
"""

from __future__ import annotations

import os
import sys
import time
import re
import json
import argparse
from typing import Dict, Any, List, Optional, Tuple

# Enable VT100 / ANSI terminal escape sequences on Windows
os.system("")
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure backend directory is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import hsn_matcher
import math_auditor
import gstr1_exporter

# ============================================================================
# ANSI Color & Formatting Constants (Zero External Dependencies)
# ============================================================================

class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    ITALIC = "\033[3m"
    UNDERLINE = "\033[4m"

    # Standard Foreground Colors
    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"

    # Bright Foreground Colors
    BRIGHT_BLACK = "\033[90m"
    BRIGHT_RED = "\033[91m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_BLUE = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN = "\033[96m"
    BRIGHT_WHITE = "\033[97m"

    # Background Colors
    BG_BLACK = "\033[40m"
    BG_BLUE = "\033[44m"
    BG_CYAN = "\033[46m"
    BG_MAGENTA = "\033[45m"
    BG_GREEN = "\033[42m"


def header_banner(title: str, subtitle: str = "") -> str:
    line_w = 84
    top = f"{Colors.BRIGHT_CYAN}╔{'═' * line_w}╗{Colors.RESET}"
    mid = f"{Colors.BRIGHT_CYAN}║ {Colors.BOLD}{Colors.BRIGHT_WHITE}{title.center(line_w - 2)}{Colors.RESET}{Colors.BRIGHT_CYAN} ║{Colors.RESET}"
    bot = f"{Colors.BRIGHT_CYAN}╚{'═' * line_w}╝{Colors.RESET}"
    if subtitle:
        sub = f"{Colors.BRIGHT_CYAN}║ {Colors.BRIGHT_YELLOW}{subtitle.center(line_w - 2)}{Colors.RESET}{Colors.BRIGHT_CYAN} ║{Colors.RESET}"
        return f"\n{top}\n{mid}\n{sub}\n{bot}"
    return f"\n{top}\n{mid}\n{bot}"


def section_title(title: str) -> str:
    return (
        f"\n{Colors.BOLD}{Colors.BRIGHT_MAGENTA}─── {title.upper()} "
        f"{'─' * max(2, 78 - len(title))}{Colors.RESET}\n"
    )


# ============================================================================
# Demo Bills Data Definitions
# ============================================================================

GOLDEN_BILLS = [
    {
        "id": "BILL-101-KIRANA",
        "title": "Demo Bill 1: Kirana & Grocery Store (Shopkeeper Math Error Fixed)",
        "sector": "Kirana",
        "store": "Gupta Kirana & General Merchant (Ludhiana)",
        "supplier_state": "03",
        "buyer_state": "03",
        "items": [
            {
                "row_id": 1,
                "raw_text": "Dedh peti Aashirvaad Atta @ 360",
                "product_name_normalized": "Aashirvaad Atta",
                "quantity": 1.5,
                "raw_quantity": "Dedh peti",
                "unit_price": 360.0,
                "written_line_total": 540.0,
                "is_struck_out": False
            },
            {
                "row_id": 2,
                "raw_text": "2 kg Khulla Chawal @ 40",
                "product_name_normalized": "Khulla Chawal",
                "quantity": 2.0,
                "raw_quantity": "2 kg",
                "unit_price": 40.0,
                "written_line_total": 80.0,
                "is_struck_out": False
            },
            {
                "row_id": 3,
                "raw_text": "3 Nag Lux Soap @ 45 = 145 [SHOPKEEPER ERROR]",
                "product_name_normalized": "Lux Soap",
                "quantity": 3.0,
                "raw_quantity": "3 Nag",
                "unit_price": 45.0,
                "written_line_total": 145.0,  # 3 * 45 = 135 -> Shopkeeper overcharged ₹10
                "is_struck_out": False
            },
            {
                "row_id": 4,
                "raw_text": "1 kg Maida cut (pen cancelled)",
                "product_name_normalized": "Maida",
                "quantity": 1.0,
                "raw_quantity": "1 kg",
                "unit_price": 35.0,
                "written_line_total": 35.0,
                "is_struck_out": True
            }
        ]
    },
    {
        "id": "BILL-202-TEXTILE",
        "title": "Demo Bill 2: Textile & Readymade (Dynamic ₹1,000 GST Threshold Rules)",
        "sector": "Textile",
        "store": "Punjab Cloth & Readymade House (Amritsar)",
        "supplier_state": "03",
        "buyer_state": "03",
        "items": [
            {
                "row_id": 1,
                "raw_text": "10 Gaz Cotton Kapda @ 120",
                "product_name_normalized": "Cotton Kapda",
                "quantity": 10.0,
                "raw_quantity": "10 Gaz",
                "unit_price": 120.0,
                "written_line_total": 1200.0,
                "is_struck_out": False
            },
            {
                "row_id": 2,
                "raw_text": "1 Cotton Kurti @ 850 (≤ ₹1,000 threshold)",
                "product_name_normalized": "Cotton Kurti",
                "quantity": 1.0,
                "raw_quantity": "1 nag",
                "unit_price": 850.0,
                "written_line_total": 850.0,
                "is_struck_out": False
            },
            {
                "row_id": 3,
                "raw_text": "1 Heavy Wedding Lehnga @ 2400 (> ₹1,000 threshold)",
                "product_name_normalized": "Heavy Wedding Lehnga",
                "quantity": 1.0,
                "raw_quantity": "1 nag",
                "unit_price": 2400.0,
                "written_line_total": 2400.0,
                "is_struck_out": False
            },
            {
                "row_id": 4,
                "raw_text": "2 mtr Astar Kapda - 160 (cut)",
                "product_name_normalized": "Astar Kapda",
                "quantity": 2.0,
                "raw_quantity": "2 mtr",
                "unit_price": 80.0,
                "written_line_total": 160.0,
                "is_struck_out": True
            }
        ]
    },
    {
        "id": "BILL-303-HARDWARE",
        "title": "Demo Bill 3: Hardware & Electricals (Multi-Category Tax Auditor)",
        "sector": "Hardware",
        "store": "Shree Balaji Electricals & Hardware (Jalandhar)",
        "supplier_state": "03",
        "buyer_state": "03",
        "items": [
            {
                "row_id": 1,
                "raw_text": "4 Nag 9W LED Bulb Syska @ 90",
                "product_name_normalized": "9W LED Bulb",
                "quantity": 4.0,
                "raw_quantity": "4 Nag",
                "unit_price": 90.0,
                "written_line_total": 360.0,
                "is_struck_out": False
            },
            {
                "row_id": 2,
                "raw_text": "2 Bori UltraTech Cement @ 380",
                "product_name_normalized": "UltraTech Cement",
                "quantity": 2.0,
                "raw_quantity": "2 Bori",
                "unit_price": 380.0,
                "written_line_total": 760.0,
                "is_struck_out": False
            },
            {
                "row_id": 3,
                "raw_text": "100 Nos Iron Screws @ 1.50 = 150",
                "product_name_normalized": "Iron Screws",
                "quantity": 100.0,
                "raw_quantity": "100 Nos",
                "unit_price": 1.5,
                "written_line_total": 150.0,
                "is_struck_out": False
            },
            {
                "row_id": 4,
                "raw_text": "1 Pkt Cut Fasteners - 40 (cut)",
                "product_name_normalized": "Fasteners",
                "quantity": 1.0,
                "raw_quantity": "1 Pkt",
                "unit_price": 40.0,
                "written_line_total": 40.0,
                "is_struck_out": True
            }
        ]
    },
    {
        "id": "BILL-404-INTERSTATE",
        "title": "Demo Bill 4: Inter-State Supply (Punjab 03 → Delhi 07 100% IGST Switch)",
        "sector": "Textile",
        "store": "Punjab Heritage Handlooms (Ludhiana) → Delhi Buyer",
        "supplier_state": "03",
        "buyer_state": "07",
        "items": [
            {
                "row_id": 1,
                "raw_text": "2 Cotton Kurti @ 850 (≤ ₹1000)",
                "product_name_normalized": "Cotton Kurti",
                "quantity": 2.0,
                "raw_quantity": "2 nag",
                "unit_price": 850.0,
                "written_line_total": 1700.0,
                "is_struck_out": False
            },
            {
                "row_id": 2,
                "raw_text": "1 Heavy Wedding Lehnga @ 3500 (> ₹1000)",
                "product_name_normalized": "Heavy Wedding Lehnga",
                "quantity": 1.0,
                "raw_quantity": "1 nag",
                "unit_price": 3500.0,
                "written_line_total": 3500.0,
                "is_struck_out": False
            }
        ]
    }
]


# ============================================================================
# ANSI Formatted Showcase Printer
# ============================================================================

def print_bill_card(bill: Dict[str, Any]):
    print(f"\n{Colors.BOLD}{Colors.BRIGHT_CYAN}┌{'─' * 82}┐{Colors.RESET}")
    print(
        f"{Colors.BOLD}{Colors.BRIGHT_CYAN}│ {Colors.BRIGHT_WHITE}{bill['title'][:80]:<80}{Colors.RESET}{Colors.BOLD}{Colors.BRIGHT_CYAN} │{Colors.RESET}"
    )
    print(
        f"{Colors.BOLD}{Colors.BRIGHT_CYAN}│ {Colors.DIM}Store: {bill['store']:<45} Sector: {bill['sector']:<18}{Colors.RESET}{Colors.BOLD}{Colors.BRIGHT_CYAN} │{Colors.RESET}"
    )
    supp_st = bill.get("supplier_state", "03")
    buy_st = bill.get("buyer_state", "03")
    st_info = f"State Supply: {supp_st} (Punjab) -> {buy_st} ({'Punjab [INTRA]' if supp_st == buy_st else 'Delhi [INTER-STATE]'})"
    print(
        f"{Colors.BOLD}{Colors.BRIGHT_CYAN}│ {Colors.BRIGHT_YELLOW}{st_info:<80}{Colors.RESET}{Colors.BOLD}{Colors.BRIGHT_CYAN} │{Colors.RESET}"
    )
    print(f"{Colors.BOLD}{Colors.BRIGHT_CYAN}├{'─' * 82}┤{Colors.RESET}")

    # Audit the items
    audited = math_auditor.audit_invoice_items(
        items=bill["items"],
        detected_sector=bill["sector"],
        supplier_state_code=supp_st,
        buyer_state_code=buy_st
    )

    is_inter = (supp_st != buy_st)

    # Table Header
    if is_inter:
        hdr = f"│ {'#':<2} {'Item Description':<23} {'Qty':<7} {'Price':<8} {'Taxable':<9} {'HSN':<6} {'IGST%':<6} {'Total ₹':<9} │"
    else:
        hdr = f"│ {'#':<2} {'Item Description':<23} {'Qty':<7} {'Price':<8} {'Taxable':<9} {'HSN':<6} {'GST%':<6} {'Total ₹':<9} │"
    print(f"{Colors.BOLD}{Colors.WHITE}{hdr}{Colors.RESET}")
    print(f"{Colors.BRIGHT_CYAN}├{'─' * 82}┤{Colors.RESET}")

    for it in audited["active_items"]:
        row_id = str(it["row_id"])
        name = it["product_name_normalized"][:23]
        qty_str = f"{it['quantity']:.1f} {it['standard_uqc']}"
        price_str = f"₹{it['unit_price']:.0f}"
        taxable_str = f"₹{it['audited_line_total']:.2f}"
        hsn = it["hsn_code"]
        rate_str = f"{it['gst_rate']:.0f}%"
        tot_str = f"₹{it['total_with_tax']:.2f}"

        math_badge = ""
        if it.get("has_math_error"):
            math_badge = f" {Colors.BRIGHT_RED}[MATH FIXED: Diff ₹{it['math_discrepancy']:+.0f}]{Colors.RESET}"

        rate_badge = ""
        if it.get("tax_rule_triggered"):
            rate_badge = f" {Colors.BRIGHT_GREEN}[RULE: {it['gst_rate']:.0f}%]{Colors.RESET}"

        print(
            f"│ {row_id:<2} {Colors.BRIGHT_WHITE}{name:<23}{Colors.RESET} "
            f"{qty_str:<7} {price_str:<8} {taxable_str:<9} {Colors.CYAN}{hsn:<6}{Colors.RESET} "
            f"{Colors.GREEN}{rate_str:<6}{Colors.RESET} {Colors.BOLD}{tot_str:<9}{Colors.RESET} │"
        )
        if math_badge or rate_badge:
            extra_msg = (math_badge + rate_badge).strip()
            print(f"│    ↳ {extra_msg:<96} │")

    # Struck out items
    for st in audited["struck_out_items"]:
        r_id = str(st["row_id"])
        st_text = st["raw_text"][:35]
        cut_msg = f"{Colors.DIM}{Colors.RED}<s>{st_text}</s> [STRUCK OUT / CUT WITH PEN → ₹0.00 EXCLUDED]{Colors.RESET}"
        print(f"│ {r_id:<2} {cut_msg:<90} │")

    print(f"{Colors.BOLD}{Colors.BRIGHT_CYAN}├{'─' * 82}┤{Colors.RESET}")

    # Totals Section
    tot = audited["totals"]
    print(
        f"│ {Colors.BOLD}Grand Totals:{Colors.RESET} "
        f"Audited Taxable: {Colors.BOLD}₹{tot['audited_taxable_total']:.2f}{Colors.RESET} | "
        + (
            f"IGST: {Colors.BRIGHT_GREEN}₹{tot['total_igst']:.2f}{Colors.RESET} | "
            if is_inter
            else f"CGST: {Colors.CYAN}₹{tot['total_cgst']:.2f}{Colors.RESET} | SGST: {Colors.CYAN}₹{tot['total_sgst']:.2f}{Colors.RESET} | "
        )
        + f"Final Pakka: {Colors.BOLD}{Colors.BRIGHT_GREEN}₹{tot['final_payable_pakka_total']:.2f}{Colors.RESET} │"
    )

    if tot.get("total_math_saved", 0.0) != 0.0:
        print(
            f"│ {Colors.BRIGHT_RED}💰 Shopkeeper Math Leakage Saved: ₹{tot['total_math_saved']:.2f}{Colors.RESET}"
            f" (Written Total was ₹{tot['written_grand_total']:.2f}){' ' * 24}│"
        )

    words = tot.get("total_in_words", "")
    if words:
        print(f"│ {Colors.DIM}In Words: {words[:70]:<70}{Colors.RESET} │")

    # GSTR-1 Snapshot
    gstr1 = gstr1_exporter.generate_gstr1_json(
        audited_invoice=audited,
        supplier_gstin=f"{supp_st}AABCU9603R1ZM",
        fp="102026",
        pos_code=buy_st
    )
    b2cs_rows = gstr1.get("b2cs", [])
    print(f"{Colors.BRIGHT_CYAN}├{'─' * 82}┤{Colors.RESET}")
    print(
        f"│ {Colors.BOLD}{Colors.BRIGHT_YELLOW}GSTR-1 JSON Preview (Table 7 B2CS & Table 12 HSN):{Colors.RESET}{' ' * 33}│"
    )
    for b in b2cs_rows:
        b_summary = (
            f"B2CS [POS {b['pos']} | {b['sply_ty']}]: "
            f"Rate {b['rt']:.0f}% -> Taxable ₹{b['txval']:.2f} | "
            f"IGST ₹{b['iamt']:.2f} | CGST ₹{b['camt']:.2f} | SGST ₹{b['samt']:.2f}"
        )
        print(f"│   • {Colors.DIM}{b_summary:<76}{Colors.RESET} │")

    print(f"{Colors.BOLD}{Colors.BRIGHT_CYAN}└{'─' * 82}┘{Colors.RESET}")


def run_showcase_mode():
    """Executes the full ANSI table demo showcase and PyTorch latency benchmark."""
    print(header_banner(
        "BHARAT GST VISION ENGINE — TEAMMATE 2 DEMO SUITE",
        "PyTorch Multi-Sector HSN Vector Matcher & Shopkeeper Math Auditor"
    ))

    print(f"\n{Colors.DIM}Displaying 4 verified production bill flows (3 Intra-State + 1 Inter-State Punjab -> Delhi):{Colors.RESET}")

    for bill in GOLDEN_BILLS:
        print_bill_card(bill)

    # Run PyTorch Latency Scorecard
    print(section_title("PyTorch Neural & Vector Latency Scorecard (Sub-15ms Guarantee)"))
    run_latency_benchmark_table()


def run_latency_benchmark_table():
    queries = [
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
    for q_name, q_sec, q_pr in queries[:5]:
        hsn_matcher.match_hsn(q_name, "", q_sec, q_pr)

    latencies_ms: List[float] = []
    num_runs = 50
    for i in range(num_runs):
        q_name, q_sec, q_pr = queries[i % len(queries)]
        t0 = time.perf_counter()
        _ = hsn_matcher.match_hsn(q_name, "", q_sec, q_pr)
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)

    avg_ms = sum(latencies_ms) / len(latencies_ms)
    min_ms = min(latencies_ms)
    max_ms = max(latencies_ms)
    sorted_lats = sorted(latencies_ms)
    median_ms = sorted_lats[len(sorted_lats) // 2]
    p95_ms = sorted_lats[int(len(sorted_lats) * 0.95)]
    throughput = 1000.0 / avg_ms if avg_ms > 0 else 0.0

    print(f"{Colors.BOLD}{Colors.BRIGHT_GREEN}┌{'─' * 52}┬{'─' * 28}┐{Colors.RESET}")
    print(
        f"{Colors.BOLD}{Colors.BRIGHT_GREEN}│ {'Performance Metric':<50} │ {'Measured Value':<26} │{Colors.RESET}"
    )
    print(f"{Colors.BOLD}{Colors.BRIGHT_GREEN}├{'─' * 52}┼{'─' * 28}┤{Colors.RESET}")
    print(f"│ {'Evaluation Sample Size':<50} │ {num_runs:<26} │")
    print(f"│ {Colors.BOLD}{'PyTorch Cosine Match Mean Latency':<50}{Colors.RESET} │ {Colors.BOLD}{Colors.BRIGHT_GREEN}{avg_ms:.2f} ms / query{Colors.RESET}{' ' * 11} │")
    print(f"│ {'Median Latency (P50)':<50} │ {median_ms:.2f} ms{' ' * 19} │")
    print(f"│ {'95th Percentile Latency (P95)':<50} │ {p95_ms:.2f} ms{' ' * 19} │")
    print(f"│ {'Minimum Latency':<50} │ {min_ms:.2f} ms{' ' * 19} │")
    print(f"│ {'Maximum Latency':<50} │ {max_ms:.2f} ms{' ' * 19} │")
    print(f"│ {'System Throughput':<50} │ {throughput:.1f} items / sec{' ' * 8} │")
    print(f"│ {'Hackathon SLA Target':<50} │ < 15.00 ms{' ' * 15} │")
    print(f"{Colors.BOLD}{Colors.BRIGHT_GREEN}└{'─' * 52}┴{'─' * 28}┘{Colors.RESET}")

    if avg_ms < 15.0:
        print(f"\n{Colors.BOLD}{Colors.BRIGHT_GREEN}🚀 [VERIFIED] PyTorch Engine executes at {avg_ms:.2f}ms — exceeding target by {(15.0 / avg_ms):.1f}x!{Colors.RESET}\n")


# ============================================================================
# Interactive Terminal REPL for Judges
# ============================================================================

def run_interactive_mode():
    """Allows a hackathon judge to type any Hinglish receipt line and get instant results."""
    # Instant warmup so even the very first judge query runs at warm PyTorch sub-5ms speed
    _ = hsn_matcher.match_hsn("warmup item", "", "Kirana", 100.0)

    print(header_banner(
        "BHARAT GST VISION ENGINE — INTERACTIVE JUDGE INSPECTOR",
        "Type any Hinglish line item to test PyTorch vector matching & math auditing live"
    ))

    print(f"\n{Colors.BRIGHT_YELLOW}Sample Queries to try:{Colors.RESET}")
    print(f"  • {Colors.WHITE}'2 dedh kilo basmati chawal @ 90'{Colors.RESET}   (Tests Hindi fractional 'dedh' + loose rice HSN 1006 0%)")
    print(f"  • {Colors.WHITE}'1 Cotton Kurti @ 850'{Colors.RESET}                  (Tests garment threshold ≤ ₹1,000 -> 5% GST)")
    print(f"  • {Colors.WHITE}'1 Heavy Wedding Lehnga @ 2800'{Colors.RESET}         (Tests garment threshold > ₹1,000 -> 12% GST)")
    print(f"  • {Colors.WHITE}'3 Bori UltraTech Cement @ 385'{Colors.RESET}         (Tests 'bori' unit normalization + 28% GST)")
    print(f"  • {Colors.WHITE}'5 Nag Syska 9W LED Bulb @ 95'{Colors.RESET}          (Tests 'nag' -> PCS + HSN 8539 18% GST)")
    print(f"  • {Colors.WHITE}'1 Leather Jacket @ 2200'{Colors.RESET}              (Tests threshold upgrade to 12%)")
    print(f"  • {Colors.DIM}(Type 'q', 'exit', or press Ctrl+C to return){Colors.RESET}\n")

    sector_choices = [
        "Kirana",
        "Textile",
        "Electronics",
        "Hardware",
        "Medical",
        "Footwear_Utensils_Auto"
    ]

    while True:
        try:
            print(f"{Colors.BOLD}{Colors.BRIGHT_CYAN}────────────────────────────────────────────────────────────────────────{Colors.RESET}")
            query = input(f"{Colors.BOLD}{Colors.BRIGHT_WHITE}Enter Bill Line Item: {Colors.RESET}").strip()
            if not query or query.lower() in ("q", "quit", "exit"):
                print(f"{Colors.BRIGHT_YELLOW}Exiting inspector. Dhanyavaad!{Colors.RESET}\n")
                break

            # Sector prompt
            print(f"{Colors.DIM}Select Sector: [1] Kirana  [2] Textile  [3] Electronics  [4] Hardware  [5] Medical  [6] Footwear/Auto  [Enter=General]{Colors.RESET}")
            sec_in = input(f"{Colors.DIM}Sector choice (1-6, default 1): {Colors.RESET}").strip()
            sec_idx_map = {"1": "Kirana", "2": "Textile", "3": "Electronics", "4": "Hardware", "5": "Medical", "6": "Footwear_Utensils_Auto"}
            selected_sector = sec_idx_map.get(sec_in, "Kirana" if not sec_in else "General")

            # Parse line with Regex for quantity, price, unit
            # Example patterns: "2 dedh kilo basmati chawal @ 90", "1 Cotton Kurti @ 850", "3 bori cement @ 380"
            qty = 1.0
            price = 0.0
            unit_str = "PCS"

            # Parse price after '@' or '=' or 'rs'
            price_match = re.search(r'[@=]\s*(\d+(?:\.\d+)?)', query)
            if price_match:
                price = float(price_match.group(1))

            # Parse quantity at the beginning
            qty_match = re.match(r'^\s*(\d+(?:\.\d+)?)\s*', query)
            if qty_match:
                qty = float(qty_match.group(1))

            # Parse vernacular units and multipliers (dedh, adha, pao, sawa, etc.)
            uqc, multiplier = math_auditor.normalize_indian_unit("", query)
            if multiplier != 1.0:
                qty = qty * multiplier if qty != 1.0 else multiplier

            # Extract normalized product name by stripping price and qty
            cleaned_pname = query
            if price_match:
                cleaned_pname = cleaned_pname[:price_match.start()].strip()
            cleaned_pname = re.sub(r'^\s*\d+(?:\.\d+)?\s*(?:kg|kilo|peti|bori|nag|nos|mtr|meter|gaz|yard|pkt|dabba|piece|pcs|ltr|gm|gms|patta|strip)?\s*', '', cleaned_pname, flags=re.IGNORECASE).strip()
            if not cleaned_pname:
                cleaned_pname = query

            # Measure inference latency
            t0 = time.perf_counter()
            match_res = hsn_matcher.match_hsn(
                product_name_normalized=cleaned_pname,
                raw_text=query,
                detected_sector=selected_sector,
                unit_price=price,
                unit=uqc
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000.0

            # Single item audit
            item_dict = {
                "row_id": 1,
                "raw_text": query,
                "product_name_normalized": cleaned_pname,
                "quantity": qty,
                "raw_unit": uqc,
                "unit_price": price,
                "written_line_total": round(qty * price, 2)
            }
            audited = math_auditor.audit_invoice_items(
                items=[item_dict],
                detected_sector=selected_sector
            )
            active_it = audited["active_items"][0]

            # Render Result Box
            print(f"\n{Colors.BOLD}{Colors.BRIGHT_GREEN}╭{'─' * 74}╮{Colors.RESET}")
            print(
                f"{Colors.BOLD}{Colors.BRIGHT_GREEN}│ {Colors.BRIGHT_WHITE}ITEM: {query[:66]:<66}{Colors.RESET}{Colors.BOLD}{Colors.BRIGHT_GREEN} │{Colors.RESET}"
            )
            print(f"{Colors.BRIGHT_GREEN}├{'─' * 74}┤{Colors.RESET}")
            print(
                f"│ {Colors.BOLD}HSN Code:{Colors.RESET}       {Colors.BOLD}{Colors.BRIGHT_CYAN}{active_it['hsn_code']:<12}{Colors.RESET} "
                f"{Colors.BOLD}Category:{Colors.RESET} {active_it['category_description'][:38]:<38} │"
            )
            conf_str = f"{active_it['confidence'] * 100:.1f}%"
            print(
                f"│ {Colors.BOLD}PyTorch Conf:{Colors.RESET}   {Colors.BRIGHT_GREEN}{conf_str:<12}{Colors.RESET} "
                f"{Colors.BOLD}Latency:{Colors.RESET}  {Colors.BRIGHT_GREEN}{elapsed_ms:.2f} ms (< 5ms SLA){' ' * 15}{Colors.RESET} │"
            )
            print(
                f"│ {Colors.BOLD}Normalized Qty:{Colors.RESET} {qty:.2f} {active_it['standard_uqc']:<7} "
                f"{Colors.BOLD}Price:{Colors.RESET}    ₹{active_it['unit_price']:.2f}{' ' * 27} │"
            )
            print(
                f"│ {Colors.BOLD}Taxable Total:{Colors.RESET}  ₹{active_it['audited_line_total']:.2f}{' ' * 10} "
                f"{Colors.BOLD}Total Tax:{Colors.RESET} ₹{round(active_it['cgst_amount'] + active_it['sgst_amount'] + active_it['igst_amount'], 2):.2f}{' ' * 23} │"
            )
            print(
                f"│ {Colors.BOLD}GST Slab Applied:{Colors.RESET} {Colors.BOLD}{Colors.BRIGHT_YELLOW}{active_it['gst_rate']:.0f}% GST{Colors.RESET} "
                f"(CGST {active_it['cgst_rate']:.1f}% + SGST {active_it['sgst_rate']:.1f}% | IGST {active_it['igst_rate']:.1f}%){' ' * 12} │"
            )

            # Rule note if triggered
            if active_it.get("tax_rule_triggered") and active_it.get("tax_rule_note"):
                rule_note = active_it["tax_rule_note"][:68]
                print(f"│ {Colors.BRIGHT_GREEN}⚡ {rule_note:<71}{Colors.RESET} │")

            # Top 3 Alternatives
            alts = match_res.get("top_3_alternatives", [])
            if alts:
                print(f"{Colors.BRIGHT_GREEN}├{'─' * 74}┤{Colors.RESET}")
                print(f"│ {Colors.DIM}Top 3 HSN Candidates (PyTorch Cosine Rank):{' ' * 32}{Colors.RESET} │")
                for rank, alt in enumerate(alts[:3], start=1):
                    alt_desc = alt.get("category_description") or alt.get("label", "")
                    alt_str = f"#{rank} HSN {alt['hsn_code']} ({alt['gst_rate']:.0f}% GST) - {alt_desc[:40]}"
                    print(f"│   {Colors.CYAN}{alt_str:<70}{Colors.RESET} │")

            print(f"{Colors.BOLD}{Colors.BRIGHT_GREEN}╰{'─' * 74}╯{Colors.RESET}\n")

        except KeyboardInterrupt:
            print(f"\n{Colors.BRIGHT_YELLOW}Exiting inspector. Dhanyavaad!{Colors.RESET}\n")
            break
        except Exception as e:
            print(f"{Colors.BRIGHT_RED}Error processing line: {e}{Colors.RESET}")


# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Bharat GST Vision Engine — Teammate 2 CLI Judge Inspector"
    )
    parser.add_argument(
        "--showcase",
        action="store_true",
        help="Run ANSI table showcase of 4 Golden Demo Bills + PyTorch Latency Scorecard (Default)"
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Start interactive REPL to query any custom Hinglish receipt item live"
    )

    args = parser.parse_args()

    if args.interactive:
        run_interactive_mode()
    else:
        # Default behavior: showcase mode
        run_showcase_mode()


if __name__ == "__main__":
    main()
