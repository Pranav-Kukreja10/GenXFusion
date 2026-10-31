/**
 * Deterministic GST & Math Recalculation Engine
 * Adheres strictly to the Bharat GST Vision response contract
 */
export function recalculateInvoice(invoice) {
  if (!invoice) return invoice;

  let writtenGrandTotal = 0;
  let auditedTaxableSubtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let mathErrorsCount = 0;

  const activeItems = (invoice.active_items || []).map((item, index) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    let writtenTotal = Number(item.written_line_total);
    if (isNaN(writtenTotal) || writtenTotal === null || writtenTotal === undefined) {
      writtenTotal = Number((qty * price).toFixed(2));
    }

    const auditedTotal = Number((qty * price).toFixed(2));
    const mathDiscrepancy = Number((writtenTotal - auditedTotal).toFixed(2));
    const hasMathError = Math.abs(mathDiscrepancy) > 0.01;

    if (hasMathError) {
      mathErrorsCount++;
    }

    let gstRate = Number(item.gst_rate) || 0;
    let taxRuleNote = item.tax_rule_note || null;

    // Check apparel / footwear > ₹1000 rule
    const isApparelOrTextile =
      (item.item_sector || invoice.detected_sector) === 'TEXTILES' ||
      (item.hsn_code && (item.hsn_code.startsWith('61') || item.hsn_code.startsWith('62') || item.hsn_code.startsWith('64')));

    if (isApparelOrTextile && price > 1000) {
      if (gstRate === 5) {
        gstRate = 12;
      }
      taxRuleNote = 'Garment > ₹1,000: Auto-upgraded from 5% to 12% GST';
    } else if (isApparelOrTextile && price <= 1000 && gstRate === 12) {
      // keep note if user manually kept 12 or clear
      if (taxRuleNote?.includes('Auto-upgraded')) {
        taxRuleNote = null;
      }
    }

    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const cgstAmount = Number((auditedTotal * (cgstRate / 100)).toFixed(2));
    const sgstAmount = Number((auditedTotal * (sgstRate / 100)).toFixed(2));
    const finalTotalWithGst = Number((auditedTotal + cgstAmount + sgstAmount).toFixed(2));

    writtenGrandTotal += writtenTotal;
    auditedTaxableSubtotal += auditedTotal;
    totalCgst += cgstAmount;
    totalSgst += sgstAmount;

    return {
      ...item,
      line_number: item.line_number || index + 1,
      quantity: qty,
      unit_price: price,
      written_line_total: writtenTotal,
      audited_line_total: auditedTotal,
      has_math_error: hasMathError,
      math_discrepancy: mathDiscrepancy,
      gst_rate: gstRate,
      cgst_rate: cgstRate,
      sgst_rate: sgstRate,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      final_line_total_with_gst: finalTotalWithGst,
      tax_rule_note: taxRuleNote,
    };
  });

  const struckCount = (invoice.struck_out_items || []).length;
  const finalPayableTotal = Number((auditedTaxableSubtotal + totalCgst + totalSgst).toFixed(2));

  return {
    ...invoice,
    active_items: activeItems,
    summary: {
      written_grand_total: Number(writtenGrandTotal.toFixed(2)),
      audited_taxable_subtotal: Number(auditedTaxableSubtotal.toFixed(2)),
      total_cgst: Number(totalCgst.toFixed(2)),
      total_sgst: Number(totalSgst.toFixed(2)),
      final_gst_payable_total: finalPayableTotal,
      total_math_errors_caught: mathErrorsCount,
      total_struck_out_excluded: struckCount,
    },
  };
}

/**
 * Generates official GSTR-1 Portal JSON structure (b2cs & hsn tables)
 */
export function generateGstr1Payload(invoice) {
  if (!invoice) return {};

  // Group by HSN code and GST rate for HSN summary table
  const hsnMap = {};
  (invoice.active_items || []).forEach((item) => {
    const key = `${item.hsn_code || '9999'}_${item.gst_rate}`;
    if (!hsnMap[key]) {
      hsnMap[key] = {
        hsn_sc: item.hsn_code || '9999',
        desc: item.product_name_normalized || item.hsn_description || 'General Goods',
        uqc: item.unit_uqc || 'OTH',
        qty: 0,
        val: 0,
        txval: 0,
        rt: item.gst_rate,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      };
    }
    hsnMap[key].qty += Number(item.quantity) || 0;
    hsnMap[key].txval += Number(item.audited_line_total) || 0;
    hsnMap[key].camt += Number(item.cgst_amount) || 0;
    hsnMap[key].samt += Number(item.sgst_amount) || 0;
    hsnMap[key].val += Number(item.final_line_total_with_gst) || 0;
  });

  const hsnData = Object.values(hsnMap).map((row, idx) => ({
    num: idx + 1,
    hsn_sc: row.hsn_sc,
    desc: row.desc,
    uqc: row.uqc,
    qty: Number(row.qty.toFixed(2)),
    val: Number(row.val.toFixed(2)),
    txval: Number(row.txval.toFixed(2)),
    rt: row.rt,
    iamt: 0,
    camt: Number(row.camt.toFixed(2)),
    samt: Number(row.samt.toFixed(2)),
    csamt: 0,
  }));

  // B2CS (Business to Consumer Small) entries
  const b2csMap = {};
  (invoice.active_items || []).forEach((item) => {
    const rate = item.gst_rate;
    if (!b2csMap[rate]) {
      b2csMap[rate] = {
        sply_ty: 'INTRA',
        pos: '03-Punjab',
        typ: 'OE',
        rt: rate,
        txval: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      };
    }
    b2csMap[rate].txval += Number(item.audited_line_total) || 0;
    b2csMap[rate].camt += Number(item.cgst_amount) || 0;
    b2csMap[rate].samt += Number(item.sgst_amount) || 0;
  });

  const b2csData = Object.values(b2csMap).map((row) => ({
    ...row,
    txval: Number(row.txval.toFixed(2)),
    camt: Number(row.camt.toFixed(2)),
    samt: Number(row.samt.toFixed(2)),
  }));

  return {
    gstin: '03AABCU9603R1ZM',
    fp: invoice.normalized_date_iso ? invoice.normalized_date_iso.substring(5, 7) + invoice.normalized_date_iso.substring(0, 4) : '102026',
    gt: invoice.summary?.final_gst_payable_total || 0,
    cur_gt: invoice.summary?.final_gst_payable_total || 0,
    version: 'GST_OFFLINE_TOOL_V3.1',
    hash: 'SHA256_' + (invoice.invoice_id || 'INV').replace(/[^a-zA-Z0-9]/g, ''),
    b2cs: b2csData,
    hsn: {
      data: hsnData,
    },
    doc_issue: {
      doc_det: [
        {
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          from: invoice.invoice_id || 'INV-001',
          to: invoice.invoice_id || 'INV-001',
          totnum: 1,
          canc: 0,
          net_issue: 1,
        },
      ],
    },
  };
}

