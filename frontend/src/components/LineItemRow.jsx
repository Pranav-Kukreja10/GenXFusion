import React, { useState } from 'react';
import {
  ScanText,
  Search,
  Trash2,
  AlertTriangle,
  Check,
  Ban,
  Undo2,
  FileBadge,
} from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { UQC_OPTIONS, GST_SLAB_OPTIONS } from '../utils/indianStates';
import { computeRowGST, roundToPaise } from '../utils/gstCalculations';

/**
 * Professional, zero-AI-slop LineItemRow component.
 * Features:
 * - 15px font-size for primary inputs, weight 500, min 42px touch target heights.
 * - Tabular numbers on all quantity, rate, tax, and total values.
 * - Row strike-out / restore toggle (statutory paper pen scratches excluded from taxable turnover).
 * - Accessible CustomDropdowns (no native <select>).
 * - Live math check with instant "Apply audited total" button.
 * - Smooth row collapse on delete (250ms) and green flash on fix.
 */
export default function LineItemRow({
  item,
  index,
  onItemChange,
  onFixError,
  onDelete,
  onOpenHsnSearch,
  onToggleStrikeOut,
  isHovered = false,
  onHover,
  onLeaveHover,
  isInterState = false,
  style = {},
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [justFixed, setJustFixed] = useState(false);

  const isStruck = Boolean(item.is_struck_out || item.struck_out);

  // Confidence calculation
  const rawConfidence = item.confidence ?? item.confidence_score ?? 0.95;
  const confidencePercent = Math.round(rawConfidence <= 1.0 ? rawConfidence * 100 : rawConfidence);

  const confidenceDotColor =
    confidencePercent >= 90
      ? 'bg-emerald-500'
      : confidencePercent >= 70
      ? 'bg-amber-500'
      : 'bg-red-500';

  // Live row calculations
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
  const isMismatch = !isStruck && Boolean(item.has_math_error || Math.abs(diff) > 0.05);

  const gstRate = parseFloat(item.gst_rate) || 0;
  const taxInfo = isStruck
    ? { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalGst: 0, totalWithTax: 0 }
    : computeRowGST(auditedTaxable, gstRate, isInterState);
  const rowFinalTotal = taxInfo.totalWithTax;

  // Alternatives list
  const alternatives = item.top_3_alternatives || item.hsn_alternatives || [];

  // Smooth delete collapse handler
  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(index);
    }, 220);
  };

  // Fix handler with green flash animation
  const handleFix = () => {
    setJustFixed(true);
    onFixError(index);
    setTimeout(() => setJustFixed(false), 700);
  };

  return (
    <tr
      style={style}
      onMouseEnter={() => onHover && onHover(index)}
      onMouseLeave={() => onLeaveHover && onLeaveHover()}
      className={`group border-b border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ${
        isDeleting
          ? 'opacity-0 scale-y-0 max-h-0 pointer-events-none'
          : justFixed
          ? 'animate-row-flash-green border-l-4 border-l-emerald-500'
          : isStruck
          ? 'bg-slate-100/60 dark:bg-slate-900/40 opacity-60'
          : isMismatch
          ? 'border-l-4 border-l-red-600 bg-red-50/50 dark:bg-red-950/20'
          : isHovered
          ? 'border-l-4 border-l-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'border-l-4 border-l-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
      }`}
    >
      {/* 1. Line Number & Confidence Dot */}
      <td className="py-3 px-3 text-center align-top">
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <span className="font-mono text-slate-500 dark:text-slate-400 text-xs font-semibold tabular-nums">
            {item.row_id || item.line_number || index + 1}
          </span>

          {/* Confidence dot with % tooltip */}
          <div
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full inline-block ${confidenceDotColor} cursor-help ring-2 ring-white dark:ring-slate-900 shadow-2xs`}
              aria-label={`OCR Confidence: ${confidencePercent}%`}
            />

            {showTooltip && (
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-30 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none animate-fadeIn"
                role="tooltip"
              >
                {confidencePercent}% OCR Confidence
              </div>
            )}
          </div>
        </div>
      </td>

      {/* 2. Vernacular OCR & Normalized Goods */}
      <td className="py-3 px-3 align-top min-w-[240px] space-y-1.5">
        {/* Monospace Raw Vernacular OCR Chip */}
        {item.raw_text_on_paper && (
          <div className="inline-flex items-center gap-1.5 bg-[#FAF8F5] dark:bg-slate-800/80 border border-[#E7E2DA] dark:border-slate-700 rounded-md px-2 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-300 max-w-full">
            <ScanText className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate max-w-[260px] italic">
              &quot;{item.raw_text_on_paper}&quot;
            </span>
          </div>
        )}

        {/* Normalized Goods Input */}
        <div>
          <input
            type="text"
            value={item.product_name_normalized || ''}
            disabled={isStruck}
            onChange={(e) => onItemChange(index, 'product_name_normalized', e.target.value)}
            className={`w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[15px] font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs disabled:opacity-50 ${
              isStruck ? 'line-through text-slate-400' : ''
            }`}
            placeholder="Commodity / Item description"
            aria-label="Normalized Product Description"
          />
        </div>
      </td>

      {/* 3. Quantity & Standardized UQC Unit */}
      <td className="py-3 px-3 align-top w-40 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="any"
            min="0"
            value={item.quantity ?? 1}
            disabled={isStruck}
            onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
            className="w-16 min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[15px] font-mono font-medium text-slate-900 dark:text-slate-100 text-right focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums disabled:opacity-50"
            aria-label="Item Quantity"
          />

          <div className="flex-1 min-w-[70px]">
            <CustomDropdown
              value={item.unit_uqc || item.standard_uqc || 'PCS'}
              options={UQC_OPTIONS}
              disabled={isStruck}
              onChange={(val) => {
                onItemChange(index, 'unit_uqc', val);
                onItemChange(index, 'standard_uqc', val);
              }}
              ariaLabel="Select Statutory UQC Unit"
            />
          </div>
        </div>

        {item.raw_unit && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono px-1">
            Slip unit: &quot;{item.raw_unit}&quot;
          </div>
        )}
      </td>

      {/* 4. Rate & Math Check */}
      <td className="py-3 px-3 align-top min-w-[180px] space-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-mono text-[15px] font-medium">₹</span>
          <input
            type="number"
            step="any"
            min="0"
            value={item.unit_price ?? 0}
            disabled={isStruck}
            onChange={(e) => onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
            className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[15px] font-mono font-medium text-slate-900 dark:text-slate-100 text-right focus:outline-hidden focus:ring-2 focus:ring-emerald-500 tabular-nums disabled:opacity-50"
            aria-label="Unit Rate"
          />
        </div>

        {/* Math Check: Mismatch Action or Audited Status */}
        {isMismatch ? (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-900 text-red-950 dark:text-red-200 rounded-lg p-2 text-xs space-y-1.5 transition-all duration-300">
            <div className="flex items-center gap-1 font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="tabular-nums">Slip ₹{writtenTotal.toFixed(2)} ≠ Calc ₹{auditedTaxable.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={handleFix}
              className="btn-tactile w-full bg-red-600 hover:bg-red-700 text-white rounded-md px-2 py-1 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
              title={`Apply audited rate ₹${auditedTaxable.toFixed(2)}`}
            >
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="tabular-nums">Apply ₹{auditedTaxable.toFixed(2)}</span>
            </button>
          </div>
        ) : (
          !isStruck && (
            <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1 px-1 tabular-nums">
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>₹{auditedTaxable.toFixed(2)} audited</span>
            </div>
          )
        )}
      </td>

      {/* 5. HSN Code & GST Slab */}
      <td className="py-3 px-3 align-top min-w-[220px] space-y-1.5">
        <div className="flex items-center gap-1.5">
          {/* HSN Selector Button */}
          <button
            type="button"
            disabled={isStruck}
            onClick={() => onOpenHsnSearch(index)}
            className="btn-tactile min-h-[42px] px-3 py-1.5 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-mono text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Search HSN Master Directory"
            aria-label={`HSN ${item.hsn_code || '1101'}`}
          >
            <span>HSN {item.hsn_code || '1101'}</span>
            <Search className="h-3 w-3 text-slate-400" />
          </button>

          {/* GST Slab Dropdown */}
          <div className="w-28">
            <CustomDropdown
              value={gstRate}
              options={GST_SLAB_OPTIONS}
              disabled={isStruck}
              onChange={(val) => onItemChange(index, 'gst_rate', parseFloat(val))}
              ariaLabel="Select GST Slab"
            />
          </div>
        </div>

        {/* Alternatives custom dropdown if provided */}
        {alternatives.length > 0 && !isStruck && (
          <div>
            <CustomDropdown
              value=""
              placeholder={`Alternatives (${alternatives.length})...`}
              options={alternatives.map((alt) => ({
                value: alt.hsn_code,
                label: `HSN ${alt.hsn_code}: ${alt.label || alt.description}`,
                badge: `${alt.gst_rate}%`,
              }))}
              onChange={(hsnCode) => {
                const alt = alternatives.find((a) => a.hsn_code === hsnCode);
                if (alt) {
                  onItemChange(index, 'hsn_code', alt.hsn_code);
                  onItemChange(index, 'gst_rate', alt.gst_rate);
                  if (alt.label || alt.description) {
                    onItemChange(index, 'category_description', alt.label || alt.description);
                  }
                }
              }}
              ariaLabel="Select HSN Alternative"
            />
          </div>
        )}

        {/* Dynamic Tax Rule Note */}
        {item.tax_rule_note && !isStruck && (
          <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
            <FileBadge className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate max-w-[230px]">{item.tax_rule_note}</span>
          </div>
        )}
      </td>

      {/* 6. Row Total with Tax Breakdown */}
      <td className="py-3 px-3 align-top text-right min-w-[140px] space-y-1">
        <div className="font-mono text-slate-900 dark:text-slate-100 font-semibold text-[15px] tabular-nums">
          {isStruck ? (
            <span className="line-through text-slate-400">₹0.00</span>
          ) : (
            `₹${rowFinalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          )}
        </div>
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
          Base: ₹{isStruck ? '0.00' : auditedTaxable.toFixed(2)}
        </div>
        {!isStruck && (
          <div className="text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 tabular-nums">
            +₹{taxInfo.totalGst.toFixed(2)} GST
          </div>
        )}
        {isStruck && (
          <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900">
            Excluded (₹0 Tax)
          </span>
        )}
      </td>

      {/* 7. Action Controls: Strike-Out & Delete */}
      <td className="py-3 px-2 align-top text-center w-20">
        <div className="flex items-center justify-center gap-1">
          {/* Strike-Out / Restore Button */}
          <button
            type="button"
            onClick={() => onToggleStrikeOut && onToggleStrikeOut(index)}
            className={`btn-tactile p-2 rounded-lg transition-colors cursor-pointer ${
              isStruck
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
            title={isStruck ? 'Restore line item' : 'Mark item as struck-out / scratched'}
            aria-label={isStruck ? 'Restore line' : 'Strike out line'}
          >
            {isStruck ? <Undo2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
          </button>

          {/* Delete Row Button */}
          <button
            type="button"
            onClick={handleDelete}
            className="btn-tactile text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Delete line item"
            aria-label={`Delete ${item.product_name_normalized || 'item'}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
