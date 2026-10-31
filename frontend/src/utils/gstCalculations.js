/**
 * frontend/src/utils/gstCalculations.js
 * Deterministic live GST arithmetic and rounding logic for TrueTax AI (#25).
 *
 * Rules:
 * - Row Taxable = round(qty * unit_price)
 * - Row GST = round(taxable * (gst_rate / 100))
 * - Split: CGST and SGST each take half of GST (in paise); the odd paisa goes to CGST.
 *   cgstPaise = Math.ceil(gstPaise / 2)
 *   sgstPaise = gstPaise - cgstPaise
 * - Row Total = rowTaxable + rowGst
 * - All totals are summed from row-level rounded values so summary cards always match the rows.
 */

/**
 * Rounds a rupee value to 2 decimal places (exact paise).
 * @param {number|string} val
 * @returns {number}
 */
export function roundToPaise(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Calculates GST breakdown for a single line item with odd-paisa handling.
 * @param {number} taxable
 * @param {number} gstRate
 * @param {boolean} isInterState
 * @returns {{ cgst: number, sgst: number, igst: number, totalGst: number, totalWithTax: number }}
 */
export function computeRowGST(taxable, gstRate, isInterState = false) {
  const taxableRupees = roundToPaise(taxable);
  const rate = parseFloat(gstRate) || 0;
  const totalTaxPaise = Math.round(taxableRupees * (rate / 100) * 100);
  const totalGst = totalTaxPaise / 100;

  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalGst,
      totalGst,
      totalWithTax: roundToPaise(taxableRupees + totalGst),
    };
  }

  // CGST and SGST each take half, odd paisa goes to CGST
  const cgstPaise = Math.ceil(totalTaxPaise / 2);
  const sgstPaise = totalTaxPaise - cgstPaise;
  const cgst = cgstPaise / 100;
  const sgst = sgstPaise / 100;

  return {
    cgst,
    sgst,
    igst: 0,
    totalGst,
    totalWithTax: roundToPaise(taxableRupees + totalGst),
  };
}

/**
 * Computes live totals for active items and struck-out items.
 * Round at row level, then sum the rounded values so the cards always match the rows.
 *
 * @param {Array} activeItems
 * @param {Array} struckOutItems
 * @param {string} buyerStateCode - e.g. '07'
 * @param {string} sellerStateCode - e.g. '07'
 */
export function computeLiveTotals(
  activeItems = [],
  struckOutItems = [],
  buyerStateCode = '07',
  sellerStateCode = '07'
) {
  const isInterState = Boolean(
    buyerStateCode &&
    sellerStateCode &&
    String(buyerStateCode).padStart(2, '0') !== String(sellerStateCode).padStart(2, '0')
  );

  let handwrittenTotal = 0;
  let taxableValue = 0;
  let gstCollected = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let finalInvoiceTotal = 0;
  let mathSavings = 0;
  const issues = [];

  const auditedRows = activeItems.map((item, index) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.unit_price) || 0;
    const rowAuditedTaxable = roundToPaise(qty * rate);

    const rawWritten =
      item.written_line_total !== undefined &&
      item.written_line_total !== null &&
      !isNaN(parseFloat(item.written_line_total))
        ? parseFloat(item.written_line_total)
        : rowAuditedTaxable;

    const rowWrittenTaxable = roundToPaise(rawWritten);
    const diff = roundToPaise(rowWrittenTaxable - rowAuditedTaxable);
    const hasMathError = Boolean(item.has_math_error || Math.abs(diff) > 0.05);

    const gstRate = parseFloat(item.gst_rate) || 0;
    const taxBreakdown = computeRowGST(rowAuditedTaxable, gstRate, isInterState);

    handwrittenTotal += rowWrittenTaxable;
    taxableValue += rowAuditedTaxable;
    gstCollected += taxBreakdown.totalGst;
    cgstTotal += taxBreakdown.cgst;
    sgstTotal += taxBreakdown.sgst;
    igstTotal += taxBreakdown.igst;
    finalInvoiceTotal += taxBreakdown.totalWithTax;

    if (hasMathError) {
      mathSavings += diff;
      const itemName =
        item.product_name_normalized || item.raw_text_on_paper || `Item #${index + 1}`;
      issues.push({
        index,
        itemName,
        written: rowWrittenTaxable,
        audited: rowAuditedTaxable,
        diff,
        suggestedFix: rowAuditedTaxable,
        message: `${itemName} rate mismatch: written ₹${rowWrittenTaxable.toFixed(
          2
        )} vs audited ₹${rowAuditedTaxable.toFixed(2)} (${diff > 0 ? '+' : ''}${diff.toFixed(2)})`,
      });
    }

    return {
      ...item,
      row_id: item.row_id || index + 1,
      audited_line_total: rowAuditedTaxable,
      written_line_total: rowWrittenTaxable,
      has_math_error: hasMathError,
      math_discrepancy: diff,
      cgst_amount: taxBreakdown.cgst,
      sgst_amount: taxBreakdown.sgst,
      igst_amount: taxBreakdown.igst,
      total_tax: taxBreakdown.totalGst,
      final_line_total_with_gst: taxBreakdown.totalWithTax,
      total_with_tax: taxBreakdown.totalWithTax,
    };
  });

  // Struck-out items total
  const struckOutTotal = roundToPaise(
    struckOutItems.reduce((acc, it) => acc + (parseFloat(it.written_line_total) || 0), 0)
  );

  handwrittenTotal = roundToPaise(handwrittenTotal);
  taxableValue = roundToPaise(taxableValue);
  gstCollected = roundToPaise(gstCollected);
  cgstTotal = roundToPaise(cgstTotal);
  sgstTotal = roundToPaise(sgstTotal);
  igstTotal = roundToPaise(igstTotal);
  finalInvoiceTotal = roundToPaise(finalInvoiceTotal);
  mathSavings = roundToPaise(mathSavings);

  // Under-billed difference = Final Invoice Total - Handwritten Total
  const underBilledDiff = roundToPaise(finalInvoiceTotal - handwrittenTotal);

  return {
    handwrittenTotal,
    taxableValue,
    gstCollected,
    cgstTotal,
    sgstTotal,
    igstTotal,
    finalInvoiceTotal,
    mathSavings,
    struckOutTotal,
    issues,
    issueCount: issues.length,
    underBilledDiff,
    auditedRows,
  };
}
