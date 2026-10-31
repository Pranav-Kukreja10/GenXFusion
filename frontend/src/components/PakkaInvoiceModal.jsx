import React from 'react';
import {
  X,
  Printer,
  FileCheck,
  QrCode,
  Download,
} from 'lucide-react';
import { numberToIndianRupees } from '../utils/numberToWords';

export default function PakkaInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onExportGstr1,
}) {
  if (!isOpen || !invoice) return null;

  const summary = invoice.summary || {};
  const activeItems = invoice.active_items || [];

  // Group items by HSN for the legal HSN Summary Box
  const hsnSummaryMap = {};
  activeItems.forEach((item) => {
    const code = item.hsn_code || '9999';
    if (!hsnSummaryMap[code]) {
      hsnSummaryMap[code] = {
        hsn: code,
        txval: 0,
        cgst_rate: item.cgst_rate || (item.gst_rate / 2) || 0,
        cgst_amt: 0,
        sgst_rate: item.sgst_rate || (item.gst_rate / 2) || 0,
        sgst_amt: 0,
        total_tax: 0,
      };
    }
    hsnSummaryMap[code].txval += item.audited_line_total || 0;
    hsnSummaryMap[code].cgst_amt += item.cgst_amount || 0;
    hsnSummaryMap[code].sgst_amt += item.sgst_amount || 0;
    hsnSummaryMap[code].total_tax += (item.cgst_amount || 0) + (item.sgst_amount || 0);
  });

  const hsnSummaryList = Object.values(hsnSummaryMap);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-zinc-200 overflow-hidden">
        
        {/* Modal Action Header (Hidden in Print) */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between no-print border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center">
              <FileCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                GST Tax Invoice
              </h3>
              <p className="text-[11px] text-zinc-400">
                Print-ready standard tax invoice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onExportGstr1 && (
              <button
                type="button"
                onClick={onExportGstr1}
                className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-zinc-400" />
                <span>Export GSTR-1</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-white text-zinc-900 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto bg-white text-zinc-900" id="printable-pakka-invoice">
          {/* Main Border Box */}
          <div className="border border-zinc-900 p-4 sm:p-6 space-y-4 text-xs font-sans">
            
            {/* Top Title Banner */}
            <div className="text-center border-b border-zinc-900 pb-3">
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-zinc-900">
                TAX INVOICE
              </h1>
              <p className="text-[10px] uppercase font-medium text-zinc-500">
                (ISSUED UNDER SECTION 31 OF THE CENTRAL GOODS AND SERVICES TAX ACT, 2017)
              </p>
            </div>

            {/* Merchant / Supplier Header */}
            <div className="grid grid-cols-2 gap-4 border-b border-zinc-900 pb-3">
              <div>
                <h2 className="text-base font-bold uppercase text-zinc-900">
                  {invoice.merchant_name || 'SHARMA KIRANA & GENERAL STORE'}
                </h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Main Market, Clock Tower Road, Ludhiana, Punjab
                </p>
                <p className="text-[11px] font-mono mt-1">
                  <strong>GSTIN / UIN:</strong> 03AABCU9603R1ZM (Punjab - 03)
                </p>
                <p className="text-[11px]">
                  <strong>State:</strong> Punjab &nbsp;|&nbsp; <strong>State Code:</strong> 03
                </p>
              </div>

              <div className="text-right space-y-1 font-mono text-[11px]">
                <p>
                  <strong>Invoice No:</strong>{' '}
                  <span className="font-semibold text-xs">{invoice.invoice_id || 'INV-2026-8841'}</span>
                </p>
                <p>
                  <strong>Invoice Date:</strong>{' '}
                  <span>{invoice.normalized_date_iso || invoice.raw_date_written || '2026-10-31'}</span>
                </p>
                <p>
                  <strong>Place of Supply:</strong> 03-Punjab (Intra-State)
                </p>
                <p>
                  <strong>Reverse Charge:</strong> No
                </p>
              </div>
            </div>

            {/* Bill To / Bahi-Khata Buyer Section */}
            <div className="border-b border-zinc-900 pb-3 grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <p className="font-semibold uppercase text-zinc-500 text-[10px]">Details of Receiver (Billed To):</p>
                <p className="font-medium text-zinc-900">Walk-in Retail Consumer (Cash/UPI)</p>
                <p className="text-zinc-600">Market Counter Supply</p>
                <p className="font-mono"><strong>State:</strong> Punjab (03)</p>
              </div>

              <div className="text-right">
                <p className="font-semibold uppercase text-zinc-500 text-[10px]">Original Slip Reference:</p>
                <p className="font-mono text-zinc-600">Vernacular Receipt Date: {invoice.raw_date_written || '31/10/26'}</p>
                <p className="font-mono text-zinc-800 font-medium">Audited via TrueTax Vision Engine</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-zinc-900 text-[11px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-900 font-semibold uppercase text-[10px]">
                    <th className="border-r border-zinc-900 p-1.5 text-center w-8">#</th>
                    <th className="border-r border-zinc-900 p-1.5">Description of Goods</th>
                    <th className="border-r border-zinc-900 p-1.5 text-center w-16">HSN/SAC</th>
                    <th className="border-r border-zinc-900 p-1.5 text-right w-14">Qty</th>
                    <th className="border-r border-zinc-900 p-1.5 text-center w-12">UQC</th>
                    <th className="border-r border-zinc-900 p-1.5 text-right w-16">Rate (₹)</th>
                    <th className="border-r border-zinc-900 p-1.5 text-right w-18">Taxable (₹)</th>
                    <th className="border-r border-zinc-900 p-1.5 text-right w-16">CGST</th>
                    <th className="border-r border-zinc-900 p-1.5 text-right w-16">SGST</th>
                    <th className="p-1.5 text-right w-20">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-zinc-200">
                      <td className="border-r border-zinc-900 p-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border-r border-zinc-900 p-1.5 font-medium">
                        <div>{item.product_name_normalized}</div>
                        {item.tax_rule_note && (
                          <span className="text-[9px] text-zinc-500 font-sans block">
                            * {item.tax_rule_note}
                          </span>
                        )}
                      </td>
                      <td className="border-r border-zinc-900 p-1.5 text-center font-mono font-medium">
                        {item.hsn_code || '9999'}
                      </td>
                      <td className="border-r border-zinc-900 p-1.5 text-right font-mono">
                        {item.quantity}
                      </td>
                      <td className="border-r border-zinc-900 p-1.5 text-center font-mono">
                        {item.unit_uqc || 'PCS'}
                      </td>
                      <td className="border-r border-zinc-900 p-1.5 text-right font-mono">
                        {item.unit_price?.toFixed(2)}
                      </td>
                      <td className="border-r border-zinc-900 p-1.5 text-right font-mono font-medium">
                        {item.audited_line_total?.toFixed(2)}
                      </td>
                      <td className="border-r border-zinc-900 p-1.5 text-right font-mono">
                        <div>₹{item.cgst_amount?.toFixed(2)}</div>
                        <span className="text-[9px] text-zinc-400">({item.cgst_rate || (item.gst_rate / 2)}%)</span>
                      </td>
                      <td className="border-r border-zinc-900 p-1.5 text-right font-mono">
                        <div>₹{item.sgst_amount?.toFixed(2)}</div>
                        <span className="text-[9px] text-zinc-400">({item.sgst_rate || (item.gst_rate / 2)}%)</span>
                      </td>
                      <td className="p-1.5 text-right font-mono font-medium">
                        {item.final_line_total_with_gst?.toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="border-t-2 border-zinc-900 font-semibold bg-zinc-50">
                    <td colSpan={6} className="border-r border-zinc-900 p-1.5 text-right uppercase">
                      Grand Totals:
                    </td>
                    <td className="border-r border-zinc-900 p-1.5 text-right font-mono">
                      ₹{summary.audited_taxable_subtotal?.toFixed(2)}
                    </td>
                    <td className="border-r border-zinc-900 p-1.5 text-right font-mono">
                      ₹{summary.total_cgst?.toFixed(2)}
                    </td>
                    <td className="border-r border-zinc-900 p-1.5 text-right font-mono">
                      ₹{summary.total_sgst?.toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right font-mono text-xs font-bold">
                      ₹{summary.final_gst_payable_total?.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Amount in Words */}
            <div className="border border-zinc-900 p-2.5 bg-zinc-50 text-[11px]">
              <strong>Total Invoice Amount in Words:</strong>{' '}
              <span className="italic font-medium">
                {numberToIndianRupees(summary.final_gst_payable_total)}
              </span>
            </div>

            {/* HSN Tax Summary Table Box */}
            <div className="border border-zinc-900 p-2 text-[10px]">
              <p className="font-semibold uppercase mb-1">HSN/SAC Tax Liability Summary:</p>
              <table className="w-full text-left border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 font-semibold uppercase">
                    <th className="p-1 border-r border-zinc-300">HSN/SAC</th>
                    <th className="p-1 border-r border-zinc-300 text-right">Taxable Value</th>
                    <th className="p-1 border-r border-zinc-300 text-right">CGST Rate</th>
                    <th className="p-1 border-r border-zinc-300 text-right">CGST Amount</th>
                    <th className="p-1 border-r border-zinc-300 text-right">SGST Rate</th>
                    <th className="p-1 border-r border-zinc-300 text-right">SGST Amount</th>
                    <th className="p-1 text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {hsnSummaryList.map((row, idx) => (
                    <tr key={idx} className="border-b border-zinc-200 font-mono">
                      <td className="p-1 border-r border-zinc-300 font-medium">{row.hsn}</td>
                      <td className="p-1 border-r border-zinc-300 text-right">₹{row.txval.toFixed(2)}</td>
                      <td className="p-1 border-r border-zinc-300 text-right">{row.cgst_rate}%</td>
                      <td className="p-1 border-r border-zinc-300 text-right">₹{row.cgst_amt.toFixed(2)}</td>
                      <td className="p-1 border-r border-zinc-300 text-right">{row.sgst_rate}%</td>
                      <td className="p-1 border-r border-zinc-300 text-right">₹{row.sgst_amt.toFixed(2)}</td>
                      <td className="p-1 text-right font-medium">₹{row.total_tax.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer: UPI QR Code, Terms & Signatory */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-900 text-[10px]">
              {/* UPI QR Payment Box */}
              <div className="border border-zinc-200 p-2 rounded-lg flex items-center gap-2">
                <div className="h-14 w-14 bg-zinc-100 border border-zinc-300 flex items-center justify-center shrink-0 rounded">
                  <QrCode className="h-10 w-10 text-zinc-800" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 uppercase">Scan to Pay UPI</p>
                  <p className="text-zinc-500 font-mono text-[9px]">sharma.store@upi</p>
                  <p className="text-zinc-900 font-semibold font-mono">
                    ₹{summary.final_gst_payable_total?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Declarations */}
              <div className="text-[9px] text-zinc-500 leading-tight">
                <p className="font-semibold text-zinc-800 mb-0.5">Declaration:</p>
                <p>
                  We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </p>
                <p className="mt-1 text-zinc-600 font-mono">
                  Audited &amp; Validated by TrueTax AI Vision Engine.
                </p>
              </div>

              {/* Authorized Signatory */}
              <div className="text-right flex flex-col justify-between">
                <p className="font-semibold uppercase text-zinc-800">For {invoice.merchant_name || 'SHARMA KIRANA'}</p>
                <div className="pt-8">
                  <div className="border-t border-zinc-900 inline-block pt-1 px-4 text-center font-medium">
                    Authorised Signatory
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
