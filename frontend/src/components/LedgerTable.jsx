import React from 'react';
import {
  Plus,
  ListOrdered,
  ScanText,
  Search,
  Trash2,
  AlertTriangle,
  Sparkles,
  Check,
  FileQuestion,
} from 'lucide-react';
import LineItemRow from './LineItemRow';
import { computeRowGST, roundToPaise } from '../utils/gstCalculations';

const UQC_OPTIONS = [
  'PCS', 'KGS', 'BOX', 'LTR', 'MTR', 'BAG', 'CAN', 'SET', 'ROL', 'BTL', 'NOS', 'OTH'
];

export default function LedgerTable({
  invoice,
  onItemChange,
  onFixSingleMathError,
  onOpenHsnSearch,
  onAddItem,
  onDeleteItem,
  hoveredRowIndex,
  setHoveredRowIndex,
  isRecalculating: _isRecalculating = false,
}) {
  const activeItems = invoice?.active_items || [];
  const buyerState = invoice?.pos || invoice?.buyer_state_code || '07';
  const sellerState = invoice?.seller_state_code || '07';
  const isInterState = buyerState !== sellerState;

  return (
    <div className="bg-white dark:bg-[#131822] border border-[#E7E2DA] dark:border-[#232B3A] rounded-2xl shadow-xs overflow-hidden flex flex-col transition-colors">
      
      {/* =================================================================== */}
      {/* 1. Sticky Table Header Strip                                        */}
      {/* =================================================================== */}
      <div className="sticky top-0 z-20 px-4 py-3 border-b border-[#E7E2DA] dark:border-zinc-800 bg-white/95 dark:bg-[#131822]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ListOrdered className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                Audited GST Ledger &amp; Line Items
              </h2>
              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-[#FAF8F5] dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-[#E7E2DA] dark:border-zinc-700">
                {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Hover row to see tax split • Click HSN to search &amp; remap
            </p>
          </div>
        </div>

        {/* "+ Add Item" Header Action Button */}
        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Add new line item to ledger"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400 stroke-[2.5]" />
          <span>Add Item</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 2. Empty State View                                                 */}
      {/* =================================================================== */}
      {activeItems.length === 0 ? (
        <div className="py-14 px-4 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
            <FileQuestion className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
              No items found, add one manually
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              You can scan a new physical receipt photo or click below to add line items by hand.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add First Item</span>
          </button>
        </div>
      ) : (
        <>
          {/* =================================================================== */}
          {/* 3. Desktop Table (lg:block, internal scroll inside ledger)           */}
          {/* =================================================================== */}
          <div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[580px]">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#FAF8F5] dark:bg-zinc-900/90 border-b border-[#E7E2DA] dark:border-zinc-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider backdrop-blur-xs">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Vernacular OCR &amp; Normalized Goods</th>
                  <th className="py-2.5 px-3 w-36">Qty &amp; Unit</th>
                  <th className="py-2.5 px-3 min-w-[170px]">Rate &amp; Math</th>
                  <th className="py-2.5 px-3 min-w-[210px]">HSN &amp; Tax Slab</th>
                  <th className="py-2.5 px-3 w-32 text-right">Row Total</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2DA]/70 dark:divide-zinc-800/80 text-xs">
                {activeItems.map((item, index) => (
                  <LineItemRow
                    key={item.row_id || item.line_number || index}
                    item={item}
                    index={index}
                    onItemChange={onItemChange}
                    onFixError={onFixSingleMathError}
                    onDelete={onDeleteItem}
                    onOpenHsnSearch={onOpenHsnSearch}
                    isHovered={hoveredRowIndex === index}
                    onHover={(idx) => setHoveredRowIndex && setHoveredRowIndex(idx)}
                    onLeaveHover={() => setHoveredRowIndex && setHoveredRowIndex(null)}
                    isInterState={isInterState}
                  />
                ))}

                {/* Add Item Row at the End of Table */}
                <tr className="bg-[#FAF8F5]/40 dark:bg-zinc-900/30 hover:bg-[#FAF8F5] dark:hover:bg-zinc-800/50 transition-colors">
                  <td colSpan={7} className="py-2.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={onAddItem}
                      className="w-full py-2 border-2 border-dashed border-[#D5CEC3] dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Add Item</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* =================================================================== */}
          {/* 4. Mobile Stacked Cards View (lg:hidden)                           */}
          {/* =================================================================== */}
          <div className="block lg:hidden p-3 space-y-3">
            {activeItems.map((item, index) => {
              const qty = parseFloat(item.quantity) || 0;
              const unitPrice = parseFloat(item.unit_price) || 0;
              const auditedTaxable = roundToPaise(qty * unitPrice);

              const rawWritten =
                item.written_line_total !== undefined &&
                item.written_line_total !== null &&
                !isNaN(parseFloat(item.written_line_total))
                  ? parseFloat(item.written_line_total)
                  : auditedTaxable;

              const writtenTotal = roundToPaise(rawWritten);
              const diff = roundToPaise(writtenTotal - auditedTaxable);
              const isMismatch = Boolean(item.has_math_error || Math.abs(diff) > 0.05);

              const gstRate = parseFloat(item.gst_rate) || 0;
              const taxInfo = computeRowGST(auditedTaxable, gstRate, isInterState);
              const rowFinalTotal = taxInfo.totalWithTax;
              const alternatives = item.top_3_alternatives || item.hsn_alternatives || [];

              const rawConfidence = item.confidence ?? item.confidence_score ?? 0.95;
              const confidencePercent = Math.round(rawConfidence <= 1.0 ? rawConfidence * 100 : rawConfidence);
              const confidenceDotColor =
                confidencePercent >= 90
                  ? 'bg-emerald-500'
                  : confidencePercent >= 70
                  ? 'bg-amber-500'
                  : 'bg-red-500';

              return (
                <div
                  key={item.row_id || item.line_number || index}
                  className={`border rounded-2xl p-3.5 space-y-2.5 transition-all ${
                    isMismatch
                      ? 'border-l-[3px] border-l-red-600 border-[#E7E2DA] dark:border-zinc-800 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-l-[3px] border-l-emerald-600 border-[#E7E2DA] dark:border-zinc-800 bg-white dark:bg-[#131822]'
                  }`}
                >
                  {/* Card Header: #, confidence dot, raw OCR chip, delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-slate-400">
                        #{item.row_id || index + 1}
                      </span>
                      <span className={`h-2.5 w-2.5 rounded-full ${confidenceDotColor}`} />
                      <span className="text-[10px] font-mono text-slate-500">
                        {confidencePercent}%
                      </span>
                    </div>

                    {/* Raw OCR chip */}
                    {(item.raw_text || item.raw_text_on_paper) && (
                      <div className="flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-[#FAF8F5] dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-[#E7E2DA] dark:border-zinc-700 px-2 py-0.5 rounded max-w-full truncate">
                          <ScanText className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="truncate">&quot;{item.raw_text || item.raw_text_on_paper}&quot;</span>
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteItem(index)}
                      className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                      aria-label="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Product Name input */}
                  <div>
                    <input
                      type="text"
                      value={item.product_name_normalized ?? item.product_name ?? ''}
                      onChange={(e) => onItemChange(index, 'product_name_normalized', e.target.value)}
                      placeholder="Product / Item Description"
                      className="w-full font-bold text-slate-900 dark:text-white bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600 rounded-lg px-2.5 py-1.5 text-xs transition-all outline-hidden"
                    />
                  </div>

                  {/* Qty, Unit, Rate Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Qty &amp; Unit</label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity ?? 1}
                          onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600"
                        />
                        <select
                          value={item.standard_uqc || item.unit_uqc || 'PCS'}
                          onChange={(e) => {
                            onItemChange(index, 'standard_uqc', e.target.value);
                            onItemChange(index, 'unit_uqc', e.target.value);
                          }}
                          className="flex-1 bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-emerald-600"
                        >
                          {UQC_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Rate (₹)</label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          step="any"
                          value={item.unit_price ?? 0}
                          onChange={(e) => onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Math Check & Discrepancy Box */}
                  {isMismatch ? (
                    <div className="bg-red-100/90 dark:bg-red-950/70 border border-red-300 dark:border-red-900/80 rounded-xl p-2 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-red-950 dark:text-red-200 font-bold text-[11px]">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        <span>Paper ₹{writtenTotal} ≠ math ₹{auditedTaxable}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onFixSingleMathError(index)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                        <span>Apply ₹{auditedTaxable.toFixed(0)}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>✓ ₹{auditedTaxable.toFixed(0)} audited taxable</span>
                    </div>
                  )}

                  {/* HSN & Slab & Alternatives */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E7E2DA]/80 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => onOpenHsnSearch(index)}
                      className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 text-white px-2.5 py-1 rounded-lg font-mono text-xs font-bold"
                    >
                      <span>HSN {item.hsn_code || '1101'}</span>
                      <span>•</span>
                      <span className="text-emerald-400">{gstRate}%</span>
                      <Search className="h-2.5 w-2.5 text-slate-400" />
                    </button>

                    <div className="text-right">
                      <div className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        ₹{rowFinalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        CGST ₹{taxInfo.cgst.toFixed(2)} + SGST ₹{taxInfo.sgst.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Alternatives dropdown on mobile */}
                  {alternatives.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const alt = alternatives.find((a) => a.hsn_code === e.target.value);
                        if (alt) {
                          onItemChange(index, 'hsn_code', alt.hsn_code);
                          onItemChange(index, 'gst_rate', alt.gst_rate);
                        }
                      }}
                      defaultValue=""
                      className="w-full bg-[#FAF8F5] dark:bg-zinc-800/70 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300"
                    >
                      <option value="">Alternatives ({alternatives.length})...</option>
                      {alternatives.map((alt, aIdx) => (
                        <option key={aIdx} value={alt.hsn_code}>
                          HSN {alt.hsn_code}: {alt.label || alt.description} ({alt.gst_rate}%)
                        </option>
                      ))}
                    </select>
                  )}

                  {item.tax_rule_note && (
                    <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                      <Sparkles className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                      <span>{item.tax_rule_note}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Mobile Add Item Button */}
            <button
              type="button"
              onClick={onAddItem}
              className="w-full py-2.5 border-2 border-dashed border-[#D5CEC3] dark:border-zinc-700 hover:border-emerald-500 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Item</span>
            </button>
          </div>
        </>
      )}

      {/* Table Footer Summary Strip */}
      <div className="p-3 border-t border-[#E7E2DA] dark:border-zinc-800 bg-[#FAF8F5]/80 dark:bg-zinc-900/40 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          Showing {activeItems.length} audited items
        </span>

        <button
          type="button"
          onClick={onAddItem}
          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-3 w-3 stroke-[3]" />
          <span>Add New Row</span>
        </button>
      </div>
    </div>
  );
}
