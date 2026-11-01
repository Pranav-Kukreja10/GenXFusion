import React, { useState } from 'react';
import {
  ScanText,
  Search,
  Trash2,
  Check,
  Ban,
  Undo2,
  FileBadge,
} from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { UQC_OPTIONS, GST_SLAB_OPTIONS } from '../utils/indianStates';
import { computeRowGST, roundToPaise } from '../utils/gstCalculations';

/**
 * Professional, high-contrast monochrome LineItemRow component.
 * Features:
 * - Tabular numbers on all quantity, rate, tax, and total values.
 * - Structured inline diff bar below rate input (no floating badge clutter).
 * - Crisp monochrome monospace chips for HSN and Tax Slabs.
 * - Row strike-out / restore toggle for handwritten crossed-out items.
 * - Single-click "Apply" button for rate arithmetic discrepancies.
 * - Smooth row collapse on delete (220ms) and green flash on fix.
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
      ? 'bg-emerald-600'
      : confidencePercent >= 70
      ? 'bg-zinc-500'
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
      className={`group transition-all duration-200 border-b border-zinc-100 dark:border-zinc-800 ${
        isDeleting
          ? 'opacity-0 scale-y-0 max-h-0 pointer-events-none'
          : justFixed
          ? 'animate-row-flash-green border-l-4 border-l-emerald-500'
          : isStruck
          ? 'bg-zinc-100/50 dark:bg-zinc-900/40 opacity-60'
          : isMismatch
          ? 'border-l-2 border-l-red-500 bg-red-50/20 dark:bg-red-950/10'
          : isHovered
          ? 'border-l-2 border-l-zinc-900 dark:border-l-zinc-100 bg-zinc-50/80 dark:bg-zinc-800/40'
          : 'border-l-2 border-l-transparent hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30'
      }`}
    >
      {/* 1. Line Number */}
      <td className="py-2.5 px-2 text-center align-top w-8">
        <span className="font-mono text-zinc-400 dark:text-zinc-500 text-xs font-medium tabular-nums block pt-1.5">
          {item.row_id || item.line_number || index + 1}
        </span>
      </td>

      {/* 2. Item Name & Raw Text Badge */}
      <td className="py-2.5 px-2 align-top min-w-[220px]">
        <div className="space-y-1.5">
          {/* Raw Text Pill */}
          {(item.raw_text || item.raw_text_on_paper) && (
            <div className="inline-flex items-center gap-1.5 max-w-full">
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                  isStruck
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 line-through'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <ScanText className="h-3 w-3 text-zinc-400 shrink-0" />
                <span className="truncate">&quot;{item.raw_text || item.raw_text_on_paper}&quot;</span>
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
            className={`w-full h-8 px-2.5 text-xs font-medium rounded-lg border transition-all outline-none ${
              isStruck
                ? 'line-through text-zinc-400 bg-transparent border-transparent cursor-not-allowed'
                : 'text-zinc-900 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-1 focus:ring-zinc-900/10'
            }`}
            placeholder="Commodity / Item description"
            aria-label="Normalized Product Description"
          />
        </div>
        {/* Category Description or Statutory Note */}
        {(item.category_description || item.hsn_description || item.item_sector) && (
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 px-0.5 truncate max-w-full">
            {item.category_description || item.hsn_description || item.item_sector}
          </div>
        )}
        </div>
      </td>

      {/* 3. Quantity & Standard UQC */}
      <td className="py-2.5 px-2 align-top w-32 space-y-1">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="any"
            min="0"
            value={item.quantity ?? 1}
            disabled={isStruck}
            onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
            className="w-12 h-8 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 text-right focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 outline-none tabular-nums disabled:opacity-50"
            aria-label="Quantity"
          />

          <div className="w-18">
            <CustomDropdown
              value={item.unit_uqc || item.standard_uqc || 'PCS'}
              options={UQC_OPTIONS}
              disabled={isStruck}
              buttonClassName="h-8 px-1.5 text-xs"
              onChange={(val) => {
                onItemChange(index, 'unit_uqc', val);
                onItemChange(index, 'standard_uqc', val);
              }}
              ariaLabel="Select Statutory UQC Unit"
            />
          </div>
        </div>

        {item.raw_unit && (
          <div className="text-[10px] text-zinc-400 font-mono px-0.5 truncate">
            Paper: &quot;{item.raw_unit}&quot;
          </div>
        )}
      </td>

      {/* 4. Rate & Math Check */}
      <td className="py-2.5 px-2 align-top w-28 space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-zinc-400 font-mono text-xs">₹</span>
          <input
            type="number"
            step="any"
            min="0"
            value={item.unit_price ?? 0}
            disabled={isStruck}
            onChange={(e) => onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
            className="w-full h-8 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 text-right focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 outline-none tabular-nums disabled:opacity-50"
            aria-label="Unit Rate"
          />
        </div>

        {/* Structured Inline Diff Bar Below Rate Input */}
        {isMismatch ? (
          <div className="flex items-center justify-between gap-1 bg-zinc-100/90 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 rounded-md px-1.5 py-0.5 text-[10px] font-mono">
            <div className="flex items-center gap-0.5 text-zinc-600 dark:text-zinc-400 truncate">
              <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
              <span className="line-through text-zinc-400">₹{writtenTotal.toFixed(0)}</span>
              <span>→</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">₹{auditedTaxable.toFixed(0)}</span>
            </div>
            <button
              type="button"
              onClick={handleFix}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all cursor-pointer shadow-xs active:scale-[0.98] shrink-0 btn-tactile"
              title={`Apply audited rate ₹${auditedTaxable.toFixed(2)}`}
            >
              Fix
            </button>
          </div>
        ) : (
          !isStruck && (
            <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1 px-0.5 tabular-nums">
              <Check className="h-3 w-3 text-zinc-500 shrink-0" />
              <span className="truncate">₹{auditedTaxable.toFixed(2)} verified</span>
            </div>
          )
        )}
      </td>

      {/* 5. HSN Code & GST Slab */}
      <td className="py-2.5 px-2 align-top w-40 space-y-1">
        <div className="flex items-center gap-1">
          {/* HSN Monochrome Monospace Chip Button */}
          <button
            type="button"
            disabled={isStruck}
            onClick={() => onOpenHsnSearch(index)}
            className="h-8 px-2 inline-flex items-center gap-1 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-all cursor-pointer disabled:opacity-50 shrink-0 btn-tactile"
            title="Search HSN Master Directory"
            aria-label={`HSN ${item.hsn_code || '1101'}`}
          >
            <span>HSN {item.hsn_code || '1101'}</span>
            <Search className="h-2.5 w-2.5 text-zinc-400" />
          </button>

          {/* GST Slab Dropdown */}
          <div className="w-18">
            <CustomDropdown
              value={gstRate}
              options={GST_SLAB_OPTIONS}
              disabled={isStruck}
              buttonClassName="h-8 px-1.5 text-xs"
              onChange={(val) => onItemChange(index, 'gst_rate', parseFloat(val))}
              ariaLabel="Select GST Slab"
            />
          </div>
        </div>

        {/* Alternatives custom dropdown if provided */}
        {alternatives.length > 0 && !isStruck && (
          <div className="w-full">
            <CustomDropdown
              value=""
              placeholder={`Alternatives (${alternatives.length})...`}
              buttonClassName="h-7 px-2 text-[11px]"
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
          <div className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono max-w-full">
            <FileBadge className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
            <span className="truncate">{item.tax_rule_note}</span>
          </div>
        )}
      </td>

      {/* 6. Row Total */}
      <td className="py-2.5 px-2 align-top text-right w-24 space-y-0.5">
        <div className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold text-xs tabular-nums">
          {isStruck ? (
            <span className="line-through text-zinc-400">₹0.00</span>
          ) : (
            `₹${rowFinalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          )}
        </div>
        {isStruck && (
          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">
            Excluded
          </span>
        )}
      </td>

      {/* 7. Action Controls: Strike-Out & Delete */}
      <td className="py-2.5 px-1 align-top text-center w-12">
        <div className="flex items-center justify-center gap-0.5 pt-0.5">
          {/* Strike-Out / Restore Button */}
          <button
            type="button"
            onClick={() => onToggleStrikeOut && onToggleStrikeOut(index)}
            className={`btn-tactile p-1 rounded-md transition-colors cursor-pointer ${
              isStruck
                ? 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={isStruck ? 'Restore line item' : 'Mark item as struck-out / scratched'}
            aria-label={isStruck ? 'Restore line' : 'Strike out line'}
          >
            {isStruck ? <Undo2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
          </button>

          {/* Delete Row Button */}
          <button
            type="button"
            onClick={handleDelete}
            className="btn-tactile text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Delete line item"
            aria-label={`Delete ${item.product_name_normalized || 'item'}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
