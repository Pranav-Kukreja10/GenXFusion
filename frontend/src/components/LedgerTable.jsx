import React from 'react';
import {
  Plus,
  ListOrdered,
  ScanText,
  Search,
  Trash2,
  AlertTriangle,
  FileBadge,
  Check,
} from 'lucide-react';
import LineItemRow from './LineItemRow';
import ReceiptEmptyState from './ReceiptEmptyState';
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
  onToggleStrikeOut,
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
          className="btn-tactile inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="Add new line item to ledger"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400 stroke-[2.5]" />
          <span>Add Item</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 2. Empty State View with Animated Scanning Receipt Illustration     */}
      {/* =================================================================== */}
      {activeItems.length === 0 ? (
        <div className="py-6 px-4">
          <ReceiptEmptyState
            title="No items found, add one manually"
            subtitle="You can scan a new physical receipt photo or click below to add line items by hand."
            action={
              <button
                type="button"
                onClick={onAddItem}
                className="btn-tactile inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Item</span>
              </button>
            }
          />
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
                    onToggleStrikeOut={onToggleStrikeOut}
                    onDelete={onDeleteItem}
                    onOpenHsnSearch={onOpenHsnSearch}
                    isHovered={hoveredRowIndex === index}
                    onHover={(idx) => setHoveredRowIndex && setHoveredRowIndex(idx)}
                    onLeaveHover={() => setHoveredRowIndex && setHoveredRowIndex(null)}
                    isInterState={isInterState}
                    style={
                      index < 8
                        ? {
                            animation: 'rowSlideIn 250ms var(--ease-spring) both',
                            animationDelay: `${index * 40}ms`,
                          }
                        : {}
                    }
                  />
                ))}

                {/* Add Item Row at the End of Table */}
                <tr className="bg-[#FAF8F5]/40 dark:bg-zinc-900/30 hover:bg-[#FAF8F5] dark:hover:bg-zinc-800/50 transition-colors">
                  <td colSpan={7} className="py-2.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={onAddItem}
                      className="btn-tactile w-full py-2 border-2 border-dashed border-[#D5CEC3] dark:border-zinc-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
                  style={
                    index < 8
                      ? {
                          animation: 'rowSlideIn 250ms var(--ease-spring) both',
                          animationDelay: `${index * 40}ms`,
                        }
                      : {}
                  }
                  className={`border rounded-xl p-3.5 space-y-3 transition-all ${
                    isMismatch
                      ? 'border-l-4 border-l-red-600 border-slate-200 dark:border-zinc-700 bg-red-50/20 dark:bg-red-950/10'
                      : 'border-slate-200 dark:border-zinc-800 bg-[#FAF8F5]/30 dark:bg-zinc-900/40'
                  }`}
                >
                  {/* Row Top Strip: # and Confidence and Delete */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-500">
                        #{item.row_id || item.line_number || index + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
                        <span className={`h-2 w-2 rounded-full ${confidenceDotColor}`} />
                        {confidencePercent}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteItem(index)}
                      className="btn-tactile text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                      aria-label="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* OCR and Product Name */}
                  <div className="space-y-1">
                    {item.raw_text_on_paper && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 italic">
                        <ScanText className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[280px]">&quot;{item.raw_text_on_paper}&quot;</span>
                      </div>
                    )}
                    <input
                      type="text"
                      value={item.product_name_normalized || ''}
                      onChange={(e) => onItemChange(index, 'product_name_normalized', e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white"
                      placeholder="Product Description"
                    />
                  </div>

                  {/* Qty, Unit, Rate Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 font-medium uppercase">Qty &amp; Unit</label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity ?? 1}
                          onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-14 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-1.5 py-1 font-mono text-center"
                        />
                        <select
                          value={item.unit_uqc || item.standard_uqc || 'PCS'}
                          onChange={(e) => {
                            onItemChange(index, 'unit_uqc', e.target.value);
                            onItemChange(index, 'standard_uqc', e.target.value);
                          }}
                          className="flex-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-1.5 py-1 font-mono text-[11px]"
                        >
                          {UQC_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-medium uppercase">Unit Rate (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={item.unit_price ?? 0}
                        onChange={(e) => onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full mt-0.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md px-2 py-1 font-mono text-right"
                      />
                    </div>
                  </div>

                  {/* Mismatch Alert or Audited Note */}
                  {isMismatch ? (
                    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg p-2 text-xs flex items-center justify-between gap-2">
                      <div className="text-[11px] text-red-800 dark:text-red-300 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>Slip: ₹{writtenTotal.toFixed(2)} ≠ Calc: ₹{auditedTaxable.toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onFixSingleMathError(index)}
                        className="btn-tactile bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer shrink-0"
                      >
                        Apply ₹{auditedTaxable.toFixed(2)}
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>₹{auditedTaxable.toFixed(2)} audited</span>
                    </div>
                  )}

                  {/* HSN & Slab */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => onOpenHsnSearch(index)}
                      className="btn-tactile text-[11px] font-mono bg-slate-900 text-white px-2 py-1 rounded inline-flex items-center gap-1"
                    >
                      <span>HSN {item.hsn_code || '1101'}</span>
                      <Search className="h-2.5 w-2.5 text-slate-400" />
                    </button>

                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span className="text-slate-400 text-[10px]">Total:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        ₹{rowFinalTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Alternatives */}
                  {alternatives.length > 0 && (
                    <div className="pt-1">
                      <select
                        className="w-full text-[10px] font-mono bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-1"
                        onChange={(e) => {
                          const alt = alternatives.find((a) => a.hsn_code === e.target.value);
                          if (alt) {
                            onItemChange(index, 'hsn_code', alt.hsn_code);
                            onItemChange(index, 'gst_rate', alt.gst_rate);
                          }
                        }}
                      >
                        <option value="">HSN Alternatives ({alternatives.length})...</option>
                        {alternatives.map((alt) => (
                          <option key={alt.hsn_code} value={alt.hsn_code}>
                            HSN {alt.hsn_code}: {alt.label || alt.description} ({alt.gst_rate}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {item.tax_rule_note && (
                    <div className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 p-1.5 rounded flex items-center gap-1">
                      <FileBadge className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.tax_rule_note}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={onAddItem}
              className="btn-tactile w-full py-2.5 border-2 border-dashed border-[#D5CEC3] dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Line Item</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
