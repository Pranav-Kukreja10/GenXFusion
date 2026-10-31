import React, { useState } from 'react';
import {
  ScanText,
  Search,
  Trash2,
  AlertTriangle,
  Sparkles,
  Check,
} from 'lucide-react';
import { computeRowGST, roundToPaise } from '../utils/gstCalculations';

const UQC_OPTIONS = [
  'PCS', 'KGS', 'BOX', 'LTR', 'MTR', 'BAG', 'CAN', 'SET', 'ROL', 'BTL', 'NOS', 'OTH'
];

const GST_SLABS = [0, 5, 12, 18, 28];

export default function LineItemRow({
  item,
  index,
  onItemChange,
  onFixError,
  onDelete,
  onOpenHsnSearch,
  isHovered = false,
  onHover,
  onLeaveHover,
  isInterState = false,
}) {
  const [showTooltip, setShowTooltip] = useState(false);

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
  const isMismatch = Boolean(item.has_math_error || Math.abs(diff) > 0.05);

  const gstRate = parseFloat(item.gst_rate) || 0;
  const taxInfo = computeRowGST(auditedTaxable, gstRate, isInterState);
  const rowFinalTotal = taxInfo.totalWithTax;

  // Alternatives list
  const alternatives = item.top_3_alternatives || item.hsn_alternatives || [];

  return (
    <tr
      onMouseEnter={() => onHover && onHover(index)}
      onMouseLeave={() => onLeaveHover && onLeaveHover()}
      className={`group transition-all duration-150 ${
        isMismatch
          ? 'border-l-[3px] border-l-red-600 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50/70 dark:hover:bg-red-950/30'
          : isHovered
          ? 'border-l-[3px] border-l-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'border-l-[3px] border-l-transparent hover:bg-slate-50/80 dark:hover:bg-zinc-800/40'
      }`}
    >
      {/* 1. Line Number & Confidence Dot */}
      <td className="py-3 px-3 text-center align-top">
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <span className="font-mono text-slate-400 dark:text-slate-500 text-xs font-semibold">
            {item.row_id || item.line_number || index + 1}
          </span>

          {/* Confidence dot with % tooltip */}
          <div
            className="relative cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label={`${confidencePercent}% OCR confidence`}
          >
            <span
              className={`block h-2.5 w-2.5 rounded-full ${confidenceDotColor} ring-2 ring-white dark:ring-zinc-900 shadow-2xs`}
            />
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-40 bg-slate-900 text-white text-[10px] font-mono px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap pointer-events-none">
                {confidencePercent}% confidence
              </div>
            )}
          </div>
        </div>
      </td>

      {/* 2. Vernacular OCR Text & Normalized Product Name */}
      <td className="py-2.5 px-3 align-top min-w-[220px] space-y-1.5">
        {/* Vernacular OCR chip with ScanText icon */}
        {(item.raw_text || item.raw_text_on_paper) && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono bg-[#FAF8F5] dark:bg-zinc-800/90 text-slate-700 dark:text-slate-300 border border-[#E7E2DA] dark:border-zinc-700 px-2 py-0.5 rounded-md font-medium max-w-full truncate shadow-2xs">
              <ScanText className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">&quot;{item.raw_text || item.raw_text_on_paper}&quot;</span>
            </span>
          </div>
        )}

        {/* Normalized Editable Product Name */}
        <div>
          <input
            type="text"
            value={item.product_name_normalized ?? item.product_name ?? ''}
            onChange={(e) => onItemChange(index, 'product_name_normalized', e.target.value)}
            placeholder="Product / Item Description"
            className="w-full font-bold text-slate-900 dark:text-white bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-emerald-600 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-emerald-600 rounded-md px-2 py-1 text-xs transition-all outline-hidden"
            aria-label="Product Name"
          />
        </div>

        {/* Category Description or Sector Note */}
        {(item.category_description || item.hsn_description || item.item_sector) && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-1 truncate max-w-[280px]">
            {item.category_description || item.hsn_description || item.item_sector}
          </div>
        )}
      </td>

      {/* 3. Quantity & Standard UQC */}
      <td className="py-2.5 px-3 align-top w-36 space-y-1">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="any"
            min="0.01"
            value={item.quantity ?? 1}
            onChange={(e) => onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
            className="w-18 bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600 outline-hidden tabular-nums"
            aria-label="Quantity"
          />

          <select
            value={item.standard_uqc || item.unit_uqc || 'PCS'}
            onChange={(e) => {
              onItemChange(index, 'standard_uqc', e.target.value);
              onItemChange(index, 'unit_uqc', e.target.value);
            }}
            className="bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600 outline-hidden cursor-pointer"
            aria-label="Unit of Measurement"
          >
            {UQC_OPTIONS.map((u) => (
              <option key={u} value={u} className="dark:bg-zinc-900">
                {u}
              </option>
            ))}
          </select>
        </div>

        {item.raw_unit && (
          <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono px-1">
            Raw unit: &quot;{item.raw_unit}&quot;
          </div>
        )}
      </td>

      {/* 4. Rate & Math Check */}
      <td className="py-2.5 px-3 align-top min-w-[170px] space-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-mono text-xs font-bold">₹</span>
          <input
            type="number"
            step="any"
            min="0"
            value={item.unit_price ?? 0}
            onChange={(e) => onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
            className="w-24 bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600 outline-hidden tabular-nums"
            aria-label="Unit Rate"
          />
        </div>

        {/* Math Check: Mismatch Button or Audited Badge */}
        {isMismatch ? (
          <div className="bg-red-100/90 dark:bg-red-950/70 border border-red-300 dark:border-red-900/80 text-red-950 dark:text-red-200 rounded-lg p-1.5 text-[10px] space-y-1 shadow-2xs">
            <div className="flex items-center gap-1 font-bold">
              <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
              <span>Paper ₹{writtenTotal.toFixed(0)} ≠ ₹{auditedTaxable.toFixed(0)}</span>
            </div>
            <button
              type="button"
              onClick={() => onFixError(index)}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-md px-2 py-1 text-[10px] font-bold flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-red-400"
              title={`Apply audited rate ₹${auditedTaxable.toFixed(2)}`}
            >
              <Check className="h-3 w-3 stroke-[3]" />
              <span>Apply ₹{auditedTaxable.toFixed(0)}</span>
            </button>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1 px-1">
            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>✓ ₹{auditedTaxable.toFixed(0)} audited</span>
          </div>
        )}
      </td>

      {/* 5. HSN & Tax Slab Merged Pill + Alternatives Ghost Dropdown */}
      <td className="py-2.5 px-3 align-top min-w-[210px] space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Merged HSN & Slab Pill */}
          <button
            type="button"
            onClick={() => onOpenHsnSearch(index)}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Click to search HSN code in Master Directory"
            aria-label={`HSN ${item.hsn_code || '1101'} at ${gstRate}% GST`}
          >
            <span>HSN {item.hsn_code || '1101'}</span>
            <span className="text-slate-400">•</span>
            <span className="text-emerald-400">{gstRate}%</span>
            <Search className="h-2.5 w-2.5 text-slate-400" />
          </button>

          {/* Quick Rate Selector */}
          <select
            value={gstRate}
            onChange={(e) => onItemChange(index, 'gst_rate', parseFloat(e.target.value))}
            className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-hidden cursor-pointer focus:ring-1 focus:ring-emerald-600"
            aria-label="GST Slab"
          >
            {GST_SLABS.map((r) => (
              <option key={r} value={r} className="dark:bg-zinc-900">
                {r}% GST
              </option>
            ))}
          </select>
        </div>

        {/* Ghost Select Alternative Dropdown */}
        {alternatives.length > 0 && (
          <div className="relative">
            <select
              onChange={(e) => {
                if (!e.target.value) return;
                const alt = alternatives.find((a) => a.hsn_code === e.target.value);
                if (alt) {
                  onItemChange(index, 'hsn_code', alt.hsn_code);
                  onItemChange(index, 'gst_rate', alt.gst_rate);
                  if (alt.label || alt.description) {
                    onItemChange(index, 'category_description', alt.label || alt.description);
                  }
                }
              }}
              defaultValue=""
              className="w-full bg-[#FAF8F5] dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300 rounded-md px-1.5 py-0.5 text-[10px] font-medium focus:outline-hidden cursor-pointer"
              aria-label="HSN Alternatives"
            >
              <option value="">Alternatives ({alternatives.length})...</option>
              {alternatives.map((alt, aIdx) => (
                <option key={aIdx} value={alt.hsn_code} className="dark:bg-zinc-900">
                  HSN {alt.hsn_code}: {alt.label || alt.description} ({alt.gst_rate}%)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dynamic Rule Note */}
        {item.tax_rule_note && (
          <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded text-[9px] font-semibold">
            <Sparkles className="h-2.5 w-2.5 text-amber-600 shrink-0" />
            <span className="truncate max-w-[210px]">{item.tax_rule_note}</span>
          </div>
        )}
      </td>

      {/* 6. Row Total with Live Hover Split */}
      <td className="py-2.5 px-3 align-top text-right min-w-[130px] space-y-0.5">
        <div className="font-mono text-slate-900 dark:text-white font-extrabold text-sm tabular-nums">
          ₹{rowFinalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
          Taxable: ₹{auditedTaxable.toFixed(2)}
        </div>

        {/* Row hover reveals CGST/SGST split */}
        <div className="text-[9px] font-mono font-medium text-emerald-700 dark:text-emerald-400 tabular-nums transition-all">
          <span className="group-hover:hidden">
            +₹{taxInfo.totalGst.toFixed(2)} GST
          </span>
          <span className="hidden group-hover:inline text-[9px] bg-emerald-50 dark:bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/60">
            CGST ₹{taxInfo.cgst.toFixed(2)} + SGST ₹{taxInfo.sgst.toFixed(2)}
          </span>
        </div>
      </td>

      {/* 7. Delete Row Button */}
      <td className="py-2.5 px-2 align-top text-center w-10">
        <button
          type="button"
          onClick={() => onDelete(index)}
          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-red-400"
          title="Delete line item"
          aria-label={`Delete ${item.product_name_normalized || 'item'}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
