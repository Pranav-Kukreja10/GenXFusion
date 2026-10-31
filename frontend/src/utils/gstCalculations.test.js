import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  roundToPaise,
  computeRowGST,
  computeLiveTotals,
} from './gstCalculations.js';

describe('GST Calculation & Live Rounding Rules', () => {
  test('roundToPaise rounds correctly to 2 decimal places', () => {
    assert.equal(roundToPaise(10.555), 10.56);
    assert.equal(roundToPaise(10.554), 10.55);
    assert.equal(roundToPaise('1200'), 1200);
    assert.equal(roundToPaise(null), 0);
  });

  test('computeRowGST splits 50/50 and gives odd paisa to CGST', () => {
    // 135 taxable at 5% GST = 6.75 (675 paise).
    // Half of 675 is 337.5. Odd paisa goes to CGST -> 338 paise (3.38), SGST gets 337 paise (3.37).
    const row = computeRowGST(135, 5, false);
    assert.equal(row.totalGst, 6.75);
    assert.equal(row.cgst, 3.38);
    assert.equal(row.sgst, 3.37);
    assert.equal(row.cgst + row.sgst, 6.75);
    assert.equal(row.totalWithTax, 141.75);
  });

  test('computeRowGST handles even GST amounts with equal 50/50 split', () => {
    // 1800 taxable at 5% GST = 90.00 (9000 paise).
    // CGST = 45.00, SGST = 45.00.
    const row = computeRowGST(1800, 5, false);
    assert.equal(row.totalGst, 90.00);
    assert.equal(row.cgst, 45.00);
    assert.equal(row.sgst, 45.00);
    assert.equal(row.totalWithTax, 1890.00);
  });

  test('computeRowGST handles 0% exempt GST', () => {
    const row = computeRowGST(15, 0, false);
    assert.equal(row.totalGst, 0);
    assert.equal(row.cgst, 0);
    assert.equal(row.sgst, 0);
    assert.equal(row.totalWithTax, 15.00);
  });

  test('computeRowGST handles interstate IGST', () => {
    const row = computeRowGST(100, 18, true);
    assert.equal(row.totalGst, 18.00);
    assert.equal(row.cgst, 0);
    assert.equal(row.sgst, 0);
    assert.equal(row.igst, 18.00);
    assert.equal(row.totalWithTax, 118.00);
  });

  test('computeLiveTotals accurately computes TrueTax AI Sample Invoice data', () => {
    // Sample Data from Prompt:
    // Store: Sharma Kirana & General Store · Invoice INV-2026-2260 · 31 Oct 2026
    // 1. "Dedh peti Ashirvaad Atta @ 1200" -> 1.5 BOX, rate 1200, HSN 1101, 5% GST, total 1,890.00
    // 2. "Adha kilo Tata Namak @ 30" -> 0.5 KGS, rate 30, HSN 2501, 0% GST, total 15.00
    // 3. "3 Pao Fortune Mustard Oil @ 180" -> 0.75 LTR, rate 180, HSN 1514, 5% GST. MISMATCH: paper says 150, math says 135
    // 4. "2 nag Dettol Soap Family Pack @ 160" -> 2 PCS, rate 160, HSN 3401, 18% GST, total 377.60
    // Plus 1 struck-out item: "2 kg Maida - 90"
    const sampleItems = [
      {
        product_name_normalized: 'Wheat Flour (Branded)',
        quantity: 1.5,
        unit_price: 1200.0,
        written_line_total: 1800.0,
        gst_rate: 5.0,
      },
      {
        product_name_normalized: 'Tata Salt (Iodized)',
        quantity: 0.5,
        unit_price: 30.0,
        written_line_total: 15.0,
        gst_rate: 0.0,
      },
      {
        product_name_normalized: 'Mustard Cooking Oil (Bottle)',
        quantity: 0.75,
        unit_price: 180.0,
        written_line_total: 150.0, // Paper says 150, but 0.75 * 180 = 135!
        gst_rate: 5.0,
      },
      {
        product_name_normalized: 'Antiseptic Bathing Soap',
        quantity: 2.0,
        unit_price: 160.0,
        written_line_total: 320.0,
        gst_rate: 18.0,
      },
    ];

    const struckOut = [{ raw_text: '2 kg Maida - 90', written_line_total: 90.0 }];

    const totals = computeLiveTotals(sampleItems, struckOut, '07', '07');

    // 1. Taxable Value = 1800 + 15 + 135 + 320 = 2270.00
    assert.equal(totals.taxableValue, 2270.00);

    // 2. GST Collected = 90.00 (Atta) + 0.00 (Salt) + 6.75 (Oil) + 57.60 (Soap) = 154.35
    assert.equal(totals.gstCollected, 154.35);

    // 3. CGST Total: 45.00 + 0 + 3.38 + 28.80 = 77.18
    assert.equal(totals.cgstTotal, 77.18);

    // 4. SGST Total: 45.00 + 0 + 3.37 + 28.80 = 77.17
    assert.equal(totals.sgstTotal, 77.17);
    assert.equal(roundToPaise(totals.cgstTotal + totals.sgstTotal), totals.gstCollected);

    // 5. Final Invoice Total = 1890.00 + 15.00 + 141.75 + 377.60 = 2424.35
    assert.equal(totals.finalInvoiceTotal, 2424.35);

    // 6. Handwritten Total = 1800 + 15 + 150 + 320 = 2285.00
    assert.equal(totals.handwrittenTotal, 2285.00);

    // 7. Math savings caught = 150 - 135 = 15.00
    assert.equal(totals.mathSavings, 15.00);

    // 8. Exactly 1 issue needs review (Mustard Oil)
    assert.equal(totals.issueCount, 1);
    assert.equal(totals.issues[0].written, 150.00);
    assert.equal(totals.issues[0].audited, 135.00);
    assert.equal(totals.issues[0].suggestedFix, 135.00);

    // 9. Struck-out excluded total = 90.00
    assert.equal(totals.struckOutTotal, 90.00);

    // 10. Under-billed difference = 2424.35 - 2285.00 = 139.35
    assert.equal(totals.underBilledDiff, 139.35);
  });

  test('Fixing math error drops issue count to 0 and re-syncs totals', () => {
    const fixedItems = [
      { product_name_normalized: 'Item 1', quantity: 1, unit_price: 100, written_line_total: 100, gst_rate: 5 },
      { product_name_normalized: 'Item 2', quantity: 2, unit_price: 50, written_line_total: 100, gst_rate: 12 },
    ];
    const totals = computeLiveTotals(fixedItems, []);
    assert.equal(totals.issueCount, 0);
    assert.equal(totals.taxableValue, 200.00);
    assert.equal(totals.gstCollected, 17.00);
    assert.equal(totals.finalInvoiceTotal, 217.00);
  });
});

