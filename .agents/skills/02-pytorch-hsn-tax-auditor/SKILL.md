---
name: pytorch-hsn-tax-auditor
description: Use for Teammate 2 tasks: backend/data/hsn_master.csv, backend/hsn_matcher.py, backend/math_auditor.py, and backend/gstr1_exporter.py.
---

<LANE_2_CONSTRAINTS>
1. STRICT FILE OWNERSHIP: Only edit `backend/data/hsn_master.csv`, `backend/hsn_matcher.py`, `backend/math_auditor.py`, and `backend/gstr1_exporter.py`.
2. PYTORCH + CHAPTER FALLBACK (ZERO BLANKS):
   - Encode `hsn_master.csv` (~120 rows across 6 sectors) once at startup using `sentence-transformers/all-MiniLM-L6-v2`.
   - If top cosine similarity `< 0.55`, automatically fallback to the `detected_sector` default 4-digit HSN chapter head (`TEXTILE`->`6203`, `GROCERY`->`1101`, `ELECTRONICS`->`8539`, `HARDWARE`->`2523`, `MEDICAL`->`3004`, `FOOTWEAR_AUTO`->`6402`).
3. CONDITIONAL INDIAN GST SLAB RULES (EXACT MATH):
   - Apparel/Textiles (HSN 61, 62, 63): If `unit_price <= 1000` -> `5.0%` GST (2.5% CGST + 2.5% SGST). If `unit_price > 1000` -> `12.0%` GST (6% CGST + 6% SGST) + set `tax_rule_note="Garment > ₹1,000: Auto-upgraded from 5% to 12% GST"`.
   - Footwear (HSN 64): If `unit_price <= 1000` -> `12.0%` GST. If `unit_price > 1000` -> `18.0%` GST + set `tax_rule_note`.
   - Grain/Atta (HSN 1006, 1101): If unit/raw text contains `loose`/`khulla`/`bori` -> `0.0%` GST; if `packed`/`peti`/`packet`/branded -> `5.0%` GST.
4. DETERMINISTIC SHOPKEEPER MATH AUDITOR:
   - Normalize regional units (`thaan`->`MTR`, `gaz`->`YD`, `patta`->`STRP`, `bori`/`katta`->`BAG`, `peti`->`BOX`, `nag`->`PCS`, `jodi`->`PAR`, `kilo`->`KGS`).
   - If `unit_price` is missing/0, infer `round(written_line_total / quantity, 2)`.
   - Flag `has_math_error = abs((quantity * unit_price) - written_line_total) > 0.50`.
   - Move `is_struck_out == True` rows to `struck_out_items` so they add ₹0.00 to taxable value.
</LANE_2_CONSTRAINTS>
