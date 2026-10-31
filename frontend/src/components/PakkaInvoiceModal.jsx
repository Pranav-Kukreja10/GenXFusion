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
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-300 overflow-hidden">
        
        {/* Modal Action Header (Hidden in Print) */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Official Indian GST Tax Invoice
              </h3>
              <p className="text-[11px] text-slate-400">
                Rule 46 CGST Rules, 2017 • Print-ready A4 layout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onExportGstr1 && (
              <button
                type="button"
                onClick={onExportGstr1}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Download GSTR-1 JSON</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto bg-white text-black" id="printable-pakka-invoice">
          
          {/* Main Border Box */}
          <div className="border-2 border-black p-4 sm:p-6 space-y-4 text-xs font-sans">
            
            {/* Top Title Banner */}
            <div className="text-center border-b-2 border-black pb-3">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black">
                TAX INVOICE
              </h1>
              <p className="text-[10px] uppercase font-bold text-slate-700">
                (ISSUED UNDER SECTION 31 OF THE CENTRAL GOODS AND SERVICES TAX ACT, 2017)
              </p>
            </div>

            {/* Merchant / Supplier Header */}
            <div className="grid grid-cols-2 gap-4 border-b border-black pb-3">
              <div>
                <h2 className="text-base font-extrabold uppercase text-black">
                  {invoice.merchant_name || 'SHARMA KIRANA & GENERAL STORE'}
                </h2>
                <p className="text-[11px] text-slate-800 mt-0.5">
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
                  <span className="font-bold text-xs">{invoice.invoice_id || 'INV-2026-8841'}</span>
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
            <div className="border-b border-black pb-3 grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <p className="font-bold uppercase text-slate-800">Details of Receiver (Billed To):</p>
                <p className="font-semibold text-black">Walk-in Retail Consumer (Cash/UPI)</p>
                <p className="text-slate-700">Market Counter Supply</p>
                <p className="font-mono"><strong>State:</strong> Punjab (03)</p>
              </div>

              <div className="text-right">
                <p className="font-bold uppercase text-slate-800">Original Kacha Slip Reference:</p>
                <p className="font-mono text-slate-700">Vernacular Receipt Date: {invoice.raw_date_written || '31/10/26'}</p>
                <p className="font-mono text-emerald-800 font-semibold">Audited via TrueTax Deterministic Engine</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold uppercase text-[10px]">
                    <th className="border-r border-black p-1.5 text-center w-8">#</th>
                    <th className="border-r border-black p-1.5">Description of Goods</th>
                    <th className="border-r border-black p-1.5 text-center w-16">HSN/SAC</th>
                    <th className="border-r border-black p-1.5 text-right w-14">Qty</th>
                    <th className="border-r border-black p-1.5 text-center w-12">UQC</th>
                    <th className="border-r border-black p-1.5 text-right w-16">Rate (₹)</th>
                    <th className="border-r border-black p-1.5 text-right w-18">Taxable (₹)</th>
                    <th className="border-r border-black p-1.5 text-right w-16">CGST</th>
                    <th className="border-r border-black p-1.5 text-right w-16">SGST</th>
                    <th className="p-1.5 text-right w-20">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-300">
                      <td className="border-r border-black p-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border-r border-black p-1.5 font-medium">
                        <div>{item.product_name_normalized}</div>
                        {item.tax_rule_note && (
                          <span className="text-[9px] text-amber-900 font-sans block">
                            * {item.tax_rule_note}
                          </span>
                        )}
                      </td>
                      <td className="border-r border-black p-1.5 text-center font-mono font-bold">
                        {item.hsn_code || '9999'}
                      </td>
                      <td className="border-r border-black p-1.5 text-right font-mono font-bold">
                        {item.quantity}
                      </td>
                      <td className="border-r border-black p-1.5 text-center font-mono">
                        {item.unit_uqc || 'PCS'}
                      </td>
                      <td className="border-r border-black p-1.5 text-right font-mono">
                        {item.unit_price?.toFixed(2)}
                      </td>
                      <td className="border-r border-black p-1.5 text-right font-mono font-bold">
                        {item.audited_line_total?.toFixed(2)}
                      </td>
                      <td className="border-r border-black p-1.5 text-right font-mono">
                        <div>₹{item.cgst_amount?.toFixed(2)}</div>
                        <span className="text-[9px] text-slate-500">({item.cgst_rate || (item.gst_rate / 2)}%)</span>
                      </td>
                      <td className="border-r border-black p-1.5 text-right font-mono">
                        <div>₹{item.sgst_amount?.toFixed(2)}</div>
                        <span className="text-[9px] text-slate-500">({item.sgst_rate || (item.gst_rate / 2)}%)</span>
                      </td>
                      <td className="p-1.5 text-right font-mono font-bold">
                        {item.final_line_total_with_gst?.toFixed(2)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="border-t-2 border-black font-bold bg-slate-50">
                    <td colSpan={6} className="border-r border-black p-1.5 text-right uppercase">
                      Grand Totals:
                    </td>
                    <td className="border-r border-black p-1.5 text-right font-mono">
                      ₹{summary.audited_taxable_subtotal?.toFixed(2)}
                    </td>
                    <td className="border-r border-black p-1.5 text-right font-mono">
                      ₹{summary.total_cgst?.toFixed(2)}
                    </td>
                    <td className="border-r border-black p-1.5 text-right font-mono">
                      ₹{summary.total_sgst?.toFixed(2)}
                    </td>
                    <td className="p-1.5 text-right font-mono text-xs">
                      ₹{summary.final_gst_payable_total?.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Amount in Words */}
            <div className="border border-black p-2.5 bg-slate-50 text-[11px]">
              <strong>Total Invoice Amount in Words:</strong>{' '}
              <span className="italic font-bold">
                {numberToIndianRupees(summary.final_gst_payable_total)}
              </span>
            </div>

            {/* HSN Tax Summary Table Box */}
            <div className="border border-black p-2 text-[10px]">
              <p className="font-bold uppercase mb-1">HSN/SAC Tax Liability Summary:</p>
              <table className="w-full text-left border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold uppercase">
                    <th className="p-1 border-r border-slate-400">HSN/SAC</th>
                    <th className="p-1 border-r border-slate-400 text-right">Taxable Value</th>
                    <th className="p-1 border-r border-slate-400 text-right">CGST Rate</th>
                    <th className="p-1 border-r border-slate-400 text-right">CGST Amount</th>
                    <th className="p-1 border-r border-slate-400 text-right">SGST Rate</th>
                    <th className="p-1 border-r border-slate-400 text-right">SGST Amount</th>
                    <th className="p-1 text-right">Total Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {hsnSummaryList.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200 font-mono">
                      <td className="p-1 border-r border-slate-400 font-bold">{row.hsn}</td>
                      <td className="p-1 border-r border-slate-400 text-right">₹{row.txval.toFixed(2)}</td>
                      <td className="p-1 border-r border-slate-400 text-right">{row.cgst_rate}%</td>
                      <td className="p-1 border-r border-slate-400 text-right">₹{row.cgst_amt.toFixed(2)}</td>
                      <td className="p-1 border-r border-slate-400 text-right">{row.sgst_rate}%</td>
                      <td className="p-1 border-r border-slate-400 text-right">₹{row.sgst_amt.toFixed(2)}</td>
                      <td className="p-1 text-right font-bold">₹{row.total_tax.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer: UPI QR Code, Terms & Signatory */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-black text-[10px]">
              {/* UPI QR Payment Box */}
              <div className="border border-slate-300 p-2 rounded flex items-center gap-2">
                <div className="h-16 w-16 bg-slate-100 border border-slate-400 flex items-center justify-center shrink-0">
                  <QrCode className="h-12 w-12 text-slate-800" />
                </div>
                <div>
                  <p className="font-bold text-black uppercase">Scan to Pay UPI</p>
                  <p className="text-slate-600 font-mono text-[9px]">sharma.store@upi</p>
                  <p className="text-emerald-800 font-bold font-mono">
                    ₹{summary.final_gst_payable_total?.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Declarations */}
              <div className="text-[9px] text-slate-600 leading-tight">
                <p className="font-bold text-black mb-0.5">Declaration:</p>
                <p>
                  We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </p>
                <p className="mt-1 text-emerald-800 font-semibold">
                  Audited & Validated by TrueTax AI Vision Engine.
                </p>
              </div>

              {/* Authorized Signatory */}
              <div className="text-right flex flex-col justify-between">
                <p className="font-bold uppercase text-black">For {invoice.merchant_name || 'SHARMA KIRANA'}</p>
                <div className="pt-8">
                  <div className="border-t border-black inline-block pt-1 px-4 text-center font-bold">
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

