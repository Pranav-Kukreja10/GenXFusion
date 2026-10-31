"""
test_comprehensive_suite.py - Full Pan-India Verification & QA Suite
Validates all 5 autonomous steps with ZERO external Gemini API calls.
"""
import sys
import unittest
from schemas import RawVisionBill, RawVisionLineItem
from hsn_matcher import match_hsn_item, search_hsn_catalog, hsn_catalog
from math_auditor import audit_and_calculate_invoice
from gst_validator import validate_gstin, INDIAN_STATES

class TestComprehensiveParchiSetuSuite(unittest.TestCase):

    def test_01_catalog_loaded_properly(self):
        """Verify 240+ HSN records loaded into memory with lookups."""
        self.assertGreaterEqual(len(hsn_catalog.records), 240)
        self.assertIn("2523", hsn_catalog.hsn_lookup)
        self.assertIn("6204", hsn_catalog.hsn_lookup)
        self.assertIn("5208", hsn_catalog.hsn_lookup)
        self.assertIn("6907", hsn_catalog.hsn_lookup)
        self.assertIn("4412", hsn_catalog.hsn_lookup)
        self.assertIn("3004", hsn_catalog.hsn_lookup)

    def test_02_written_hsn_priority(self):
        """Rule 1: Written HSN code on invoice gets top priority with 0.99 confidence."""
        res = match_hsn_item(
            product_name_normalized="Random Item Without Clear Name",
            raw_text="Item 1 @ 500",
            item_sector="GENERAL",
            unit_price=500.0,
            written_hsn_code="2523"
        )
        self.assertEqual(res["hsn_code"], "2523")
        self.assertEqual(res["gst_rate"], 28.0)
        self.assertEqual(res["confidence"], 0.99)
        self.assertIn("Statutory Written HSN 2523", res["tax_rule_note"])

    def test_03_radhekrishna_cement_bill_case(self):
        """Verify the working Radhekrishna Agency cement bill extraction and audit."""
        raw_bill = RawVisionBill(
            detected_sector="HARDWARE",
            merchant_name="राधेकृष्ण एजेंसी",
            supplier_gstin="23BXDPP0256Q1Z6",
            invoice_id="406",
            store_address="सोनी कॉलोनी, अमानखेड़ी रोड, भीकनगांव",
            raw_date_written="04/03/21",
            customer_name="सरपंच ग्राम पंचायत जरगॉंव",
            customer_address="ग्राम पंचायत जरगॉंव, जनपद पंचायत भीकनगाँव",
            items=[
                RawVisionLineItem(
                    raw_text_on_paper="सीमेंट (JK) 95 बैग @ 265.70",
                    product_name_normalized="JK Portland Cement",
                    raw_quantity="95 बैग",
                    quantity=95.0,
                    unit_uqc="BAG",
                    unit_price=265.70,
                    written_line_total=25241.50,
                    written_hsn_code="2523",
                    confidence_score=0.98
                )
            ]
        )
        audited = audit_and_calculate_invoice(
            raw_bill=raw_bill,
            bill_id="radhekrishna_test_001",
            supplier_gstin="23BXDPP0256Q1Z6",
            supplier_state_code="23",
            place_of_supply_state_code="23"
        )
        self.assertEqual(len(audited.active_items), 1)
        item = audited.active_items[0]
        self.assertEqual(item.hsn_code, "2523")
        self.assertEqual(item.gst_rate, 28.0)
        self.assertEqual(item.cgst_rate, 14.0)
        self.assertEqual(item.sgst_rate, 14.0)
        self.assertEqual(item.quantity, 95.0)
        self.assertEqual(item.unit_price, 265.70)
        self.assertFalse(item.has_math_error)
        self.assertFalse(audited.is_inter_state)
        self.assertEqual(audited.supplier_state_code, "23")

    def test_04_item_differentiation_no_blind_cement(self):
        """Verify that Tiles, Timber, Furniture, and Fertilizers NEVER map to Cement (2523)."""
        # Spenza Ceramic Tiles -> 6907 (18% GST)
        res_tile = match_hsn_item("Spenza Vitrified Tiles 600x600", "5 box tiles @ 750", "HARDWARE", 750.0)
        self.assertEqual(res_tile["hsn_code"], "6907")
        self.assertEqual(res_tile["gst_rate"], 18.0)

        # Timber -> 4407/4412 (18% GST)
        res_timber = match_hsn_item("NEW KHAN Timber Sagwan Wood Plank", "Sagwan Lakdi 10 ft", "HARDWARE", 1200.0)
        self.assertIn(res_timber["hsn_code"], ["4407", "4412"])
        self.assertEqual(res_timber["gst_rate"], 18.0)

        # Furniture -> 9403 (18% GST)
        res_furn = match_hsn_item("Wooden Dining Table & Chairs", "Sheesham dining table", "HARDWARE", 15000.0)
        self.assertEqual(res_furn["hsn_code"], "9403")
        self.assertEqual(res_furn["gst_rate"], 18.0)

        # Fertilizer -> 3102 (5% GST)
        res_urea = match_hsn_item("IFFCO Neem Coated Urea Khad", "2 bori urea", "GROCERY", 266.50)
        self.assertEqual(res_urea["hsn_code"], "3102")
        self.assertEqual(res_urea["gst_rate"], 5.0)

    def test_05_dynamic_gst_thresholds(self):
        """Rule 4: Apparel > ₹1,000 upgrades 5% -> 12%; Footwear > ₹1,000 upgrades 12% -> 18%."""
        # Expensive Lehnga (> ₹1,000) -> 12%
        res_exp_lehnga = match_hsn_item("Bridal Wedding Lehnga Suit", "1 Lehnga @ 2400", "TEXTILES", 2400.0)
        self.assertEqual(res_exp_lehnga["hsn_code"], "6204")
        self.assertEqual(res_exp_lehnga["gst_rate"], 12.0)
        self.assertIn("Auto-upgraded from 5% to 12%", res_exp_lehnga["tax_rule_note"])

        # Affordable Kurti (<= ₹1,000) -> 5%
        res_aff_kurti = match_hsn_item("Cotton Dailywear Kurti", "1 Kurti @ 450", "TEXTILES", 450.0)
        self.assertEqual(res_aff_kurti["hsn_code"], "6204")
        self.assertEqual(res_aff_kurti["gst_rate"], 5.0)

        # Unstitched fabric (flat 5% regardless of amount)
        res_fabric = match_hsn_item("Pure Cotton Fabric Thaan", "10 mtr kapda @ 2500", "TEXTILES", 2500.0)
        self.assertEqual(res_fabric["hsn_code"], "5208")
        self.assertEqual(res_fabric["gst_rate"], 5.0)

        # Leather Shoes (> ₹1,000) -> 18%
        res_shoes = match_hsn_item("Bata Formal Leather Shoes", "1 pair shoes @ 1899", "FOOTWEAR_UTENSILS", 1899.0)
        self.assertIn(res_shoes["hsn_code"], ["6402", "6403"])
        self.assertEqual(res_shoes["gst_rate"], 18.0)

        # Hawai Chappal (<= ₹1,000) -> 12%
        res_chappal = match_hsn_item("Paragon Hawai Chappal", "1 pair chappal @ 199", "FOOTWEAR_UTENSILS", 199.0)
        self.assertEqual(res_chappal["hsn_code"], "6402")
        self.assertEqual(res_chappal["gst_rate"], 12.0)

    def test_06_dynamic_llm_fallback_for_random_items(self):
        """Rule 3: Unseen items use suggested_hsn_4digit and suggested_gst_slab."""
        res_laptop = match_hsn_item(
            product_name_normalized="Dell Inspiron 15 Core i5 Laptop",
            raw_text="Dell Laptop 1 pc @ 45000",
            item_sector="ELECTRONICS",
            unit_price=45000.0,
            suggested_hsn_4digit="8471",
            suggested_gst_slab=18.0
        )
        self.assertEqual(res_laptop["hsn_code"], "8471")
        self.assertEqual(res_laptop["gst_rate"], 18.0)

    def test_07_algebraic_self_healing_ocr(self):
        """Step 4: Algebraic self-healing for Rupee slash misread and Hindi unit digit merge."""
        # 1. Rupee Slash notation heal: "@ - 1400/-" misread as Qty=2, Rate=1400, Total=1400
        bill_slash = RawVisionBill(
            detected_sector="TEXTILES",
            items=[
                RawVisionLineItem(
                    raw_text_on_paper="1 Lehnga @ - 1400/-",
                    product_name_normalized="Embroidered Lehnga",
                    raw_quantity="2",
                    quantity=2.0,
                    unit_uqc="PCS",
                    unit_price=1400.0,
                    written_line_total=1400.0,
                    confidence_score=0.85
                )
            ]
        )
        res_slash = audit_and_calculate_invoice(bill_slash, "test_slash_heal")
        item_slash = res_slash.active_items[0]
        self.assertEqual(item_slash.quantity, 1.0)
        self.assertEqual(item_slash.unit_price, 1400.0)
        self.assertEqual(item_slash.written_line_total, 1400.0)
        self.assertFalse(item_slash.has_math_error)
        self.assertIn("Rupee slash '/-' misread as quantity 2", item_slash.ocr_self_healed_note)

        # 2. Hindi unit digit merge heal: "2 बोरा" misread as Qty=21, Rate=265.70, Total=531.40
        bill_merge = RawVisionBill(
            detected_sector="HARDWARE",
            items=[
                RawVisionLineItem(
                    raw_text_on_paper="सीमेंट 2 बोरा @ 265.70 = 531.40",
                    product_name_normalized="Portland Cement",
                    raw_quantity="21 बोरा",
                    quantity=21.0,
                    unit_uqc="BAG",
                    unit_price=265.70,
                    written_line_total=531.40,
                    confidence_score=0.88
                )
            ]
        )
        res_merge = audit_and_calculate_invoice(bill_merge, "test_merge_heal")
        item_merge = res_merge.active_items[0]
        self.assertEqual(item_merge.quantity, 2.0)
        self.assertEqual(item_merge.unit_price, 265.70)
        self.assertEqual(item_merge.written_line_total, 531.40)
        self.assertFalse(item_merge.has_math_error)
        self.assertIn("Unit merge misread", item_merge.ocr_self_healed_note)

        # 3. Missing unit price inference
        bill_missing_rate = RawVisionBill(
            detected_sector="GROCERY",
            items=[
                RawVisionLineItem(
                    raw_text_on_paper="5 kg Sugar 250",
                    product_name_normalized="Refined Sugar",
                    raw_quantity="5 kg",
                    quantity=5.0,
                    unit_uqc="KGS",
                    unit_price=None,
                    written_line_total=250.0,
                    confidence_score=0.90
                )
            ]
        )
        res_rate = audit_and_calculate_invoice(bill_missing_rate, "test_rate_infer")
        item_rate = res_rate.active_items[0]
        self.assertEqual(item_rate.unit_price, 50.0)
        self.assertFalse(item_rate.has_math_error)
        self.assertTrue("unit price" in item_rate.ocr_self_healed_note.lower())

    def test_08_gstin_mod36_validation(self):
        """Validate 15-character GSTIN with official Mod-36 checksum."""
        # Valid GSTINs
        v1 = validate_gstin("03AAEPG1807C1ZM")
        self.assertTrue(v1["is_valid"])
        self.assertEqual(v1["state_code"], "03")
        self.assertEqual(v1["state_name"], "Punjab")
        self.assertEqual(v1["entity_type"], "Individual / Proprietorship")

        v2 = validate_gstin("23BXDPP0256Q1Z6")
        self.assertTrue(v2["is_valid"])
        self.assertEqual(v2["state_code"], "23")
        self.assertEqual(v2["state_name"], "Madhya Pradesh")
        self.assertEqual(v2["entity_type"], "Individual / Proprietorship")

        # Invalid checksum
        v_bad = validate_gstin("03AAEPG1807C1Z9")
        self.assertFalse(v_bad["is_valid"])
        self.assertIn("Mod-36", v_bad["error_reason"])

    def test_09_interstate_vs_intrastate_tax_calc(self):
        """Verify Intra-State (CGST+SGST) vs Inter-State (100% IGST) rules."""
        raw_bill = RawVisionBill(
            detected_sector="GROCERY",
            items=[
                RawVisionLineItem(
                    raw_text_on_paper="Basmati Rice 10 kg @ 100",
                    product_name_normalized="Basmati Rice Packaged",
                    raw_quantity="10 kg",
                    quantity=10.0,
                    unit_uqc="KGS",
                    unit_price=100.0,
                    written_line_total=1000.0,
                    confidence_score=0.95
                )
            ]
        )
        # 1. Intra-State: Punjab (03) -> Punjab (03)
        res_intra = audit_and_calculate_invoice(
            raw_bill=raw_bill,
            bill_id="intra_001",
            supplier_state_code="03",
            place_of_supply_state_code="03"
        )
        self.assertFalse(res_intra.is_inter_state)
        self.assertEqual(res_intra.summary.total_cgst, 25.0)
        self.assertEqual(res_intra.summary.total_sgst, 25.0)
        self.assertEqual(res_intra.summary.total_igst, 0.0)

        # 2. Inter-State: Madhya Pradesh (23) -> Punjab (03)
        res_inter = audit_and_calculate_invoice(
            raw_bill=raw_bill,
            bill_id="inter_001",
            supplier_state_code="23",
            place_of_supply_state_code="03"
        )
        self.assertTrue(res_inter.is_inter_state)
        self.assertEqual(res_inter.summary.total_cgst, 0.0)
        self.assertEqual(res_inter.summary.total_sgst, 0.0)
        self.assertEqual(res_inter.summary.total_igst, 50.0)

    def test_10_zero_silent_autofill_missing_headers(self):
        """Verify that missing merchant, GSTIN, and date return None with explicit pending_doubts."""
        bill_empty_headers = RawVisionBill(
            detected_sector="GENERAL",
            merchant_name=None,
            supplier_gstin=None,
            raw_date_written=None,
            items=[
                RawVisionLineItem(
                    raw_text_on_paper="General Goods 100",
                    product_name_normalized="General Merchandise",
                    raw_quantity="1",
                    quantity=1.0,
                    unit_uqc="PCS",
                    unit_price=100.0,
                    written_line_total=100.0,
                    confidence_score=0.90
                )
            ]
        )
        res = audit_and_calculate_invoice(bill_empty_headers, "bill_no_headers")
        self.assertTrue(res.merchant_name in (None, ""))
        self.assertTrue(res.store_name_guess in (None, ""))
        self.assertTrue(res.supplier_gstin in (None, ""))
        self.assertTrue(res.normalized_date_iso in (None, ""))
        self.assertEqual(res.date_source, "MISSING_ON_PAPER_REQUIRES_INPUT")
        self.assertFalse(res.is_100_percent_compliant)

        doubt_types = [d.field_type for d in res.pending_doubts]
        self.assertIn("MISSING_MERCHANT_NAME", doubt_types)
        self.assertIn("MISSING_SUPPLIER_GSTIN", doubt_types)
        self.assertIn("MISSING_INVOICE_DATE", doubt_types)

    def test_11_lumpsum_receipt_doubt_and_recalc(self):
        """Verify that a receipt with written lumpsum total but unpriced lines raises BLOCKING doubt."""
        lumpsum_bill = RawVisionBill(
            detected_sector="TEXTILES",
            merchant_name="Gupta Saree Emporium",
            supplier_gstin="03AAEPG1807C1ZM",
            raw_date_written="25/10/2026",
            written_grand_total=3500.0,
            items=[
                RawVisionLineItem(
                    raw_text_on_paper="1 Saree",
                    product_name_normalized="Silk Saree",
                    raw_quantity="1",
                    quantity=1.0,
                    unit_uqc="PCS",
                    unit_price=None,
                    written_line_total=0.0,
                    confidence_score=0.92
                ),
                RawVisionLineItem(
                    raw_text_on_paper="1 Fall Border",
                    product_name_normalized="Saree Fall Border",
                    raw_quantity="1",
                    quantity=1.0,
                    unit_uqc="PCS",
                    unit_price=None,
                    written_line_total=0.0,
                    confidence_score=0.92
                )
            ]
        )
        res = audit_and_calculate_invoice(lumpsum_bill, "bill_lumpsum_combo")
        # Must have BLOCKING doubt MISSING_LINE_PRICES_WITH_LUMPSUM
        blocking_doubts = [d for d in res.pending_doubts if d.severity == "BLOCKING"]
        self.assertGreaterEqual(len(blocking_doubts), 1)
        self.assertEqual(blocking_doubts[0].field_type, "MISSING_LINE_PRICES_WITH_LUMPSUM")
        self.assertEqual(blocking_doubts[0].detected_value, 3500.0)
        self.assertFalse(res.is_100_percent_compliant)

        # Now simulate user applying the consolidated total
        resolved_items = [
            RawVisionLineItem(
                raw_text_on_paper="1 Saree & Fall Combo",
                product_name_normalized="Silk Saree with Fall",
                raw_quantity="1",
                quantity=1.0,
                unit_uqc="PCS",
                unit_price=3500.0,
                written_line_total=3500.0,
                confidence_score=0.95
            )
        ]
        resolved_bill = RawVisionBill(
            detected_sector="TEXTILES",
            merchant_name="Gupta Saree Emporium",
            supplier_gstin="03AAEPG1807C1ZM",
            raw_date_written="25/10/2026",
            written_grand_total=3500.0,
            items=resolved_items
        )
        res_resolved = audit_and_calculate_invoice(resolved_bill, "bill_lumpsum_resolved")
        self.assertTrue(res_resolved.is_100_percent_compliant)
        blocking_after = [d for d in res_resolved.pending_doubts if d.severity == "BLOCKING"]
        self.assertEqual(len(blocking_after), 0)

    def test_12_fully_valid_bill_compliance(self):
        """Verify that a bill with valid GSTIN, date, and math achieves is_100_percent_compliant = True."""
        bill_valid = RawVisionBill(
            detected_sector="HARDWARE",
            merchant_name="Radhekrishna Agency",
            supplier_gstin="23BXDPP0256Q1Z6",
            raw_date_written="04/03/2021",
            invoice_id="406",
            items=[
                RawVisionLineItem(
                    raw_text_on_paper="Cement 95 bags @ 265.70",
                    product_name_normalized="Portland Cement",
                    raw_quantity="95 bags",
                    quantity=95.0,
                    unit_uqc="BAG",
                    unit_price=265.70,
                    written_line_total=25241.50,
                    confidence_score=0.98
                )
            ]
        )
        res = audit_and_calculate_invoice(
            bill_valid,
            "valid_bill_001",
            supplier_gstin="23BXDPP0256Q1Z6",
            supplier_state_code="23",
            place_of_supply_state_code="23"
        )
        self.assertTrue(res.is_100_percent_compliant)
        blocking = [d for d in res.pending_doubts if d.severity == "BLOCKING"]
        self.assertEqual(len(blocking), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
