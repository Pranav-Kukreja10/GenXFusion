import React, { useState } from 'react';
import {
  AlertOctagon,
  Wrench,
  Sparkles,
  Scissors,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { formatINR } from '../utils/numberToWords';

export default function AuditAlertsCard({
  invoice,
  onFixAllMathErrors,
  onRestoreStruckItem,
}) {
  const [showStruckDetails, setShowStruckDetails] = useState(false);

  const summary = invoice?.summary || {};
  const mathErrorsCount = summary.total_math_errors_caught || 0;
  const struckItems = invoice?.struck_out_items || [];

  const thresholdTriggeredItems = (invoice?.active_items || []).filter(
    (item) => item.tax_rule_note && item.tax_rule_note.length > 0
  );

  return (
    <div className="space-y-3">
      {/* 4 Top KPI Cards — Spacious, Clean & Modern */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Paper Written Grand Total */}
        <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-xl p-3.5 shadow-2xs transition-colors">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Paper Written
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono-numbers text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300">
              {formatINR(summary.written_grand_total)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Kacha</span>
          </div>
        </div>

        {/* Audited Taxable Subtotal */}
        <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-xl p-3.5 shadow-2xs transition-colors">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Audited Taxable
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono-numbers text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {formatINR(summary.audited_taxable_subtotal)}
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium font-mono">Base</span>
          </div>
        </div>

        {/* Total GST */}
        <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-xl p-3.5 shadow-2xs transition-colors">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total GST (CGST+SGST)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono-numbers text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {formatINR((summary.total_cgst || 0) + (summary.total_sgst || 0))}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              50/50 split
            </span>
          </div>
        </div>

        {/* Final Pakka Invoice Total */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-xl p-3.5 shadow-2xs ring-1 ring-emerald-500/20 transition-colors">
          <div className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center justify-between">
            <span>Pakka Total</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono-numbers text-base sm:text-lg font-extrabold text-emerald-900 dark:text-emerald-200">
              {formatINR(summary.final_gst_payable_total)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400">
              Payable
            </span>
          </div>
        </div>

      </div>

      {/* Crimson Math Discrepancy Alert Bar (Shown only when errors exist) */}
      {mathErrorsCount > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900/60 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-red-600 flex items-center justify-center text-white shrink-0">
              <AlertOctagon className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-red-900 dark:text-red-300">
                ⚠️ Deterministic Math Auditor caught {mathErrorsCount} calculation error{mathErrorsCount > 1 ? 's' : ''} on paper receipt!
              </span>
              <p className="text-[11px] text-red-800 dark:text-red-400 mt-0.5">
                Paper written sums differ from exact Quantity × Unit Rate.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFixAllMathErrors}
            className="inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95 shrink-0"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Auto-Fix All Math Errors</span>
          </button>
        </div>
      )}

      {/* Collapsible Secondary Alerts Bar: Threshold Rules & Struck Items */}
      {(thresholdTriggeredItems.length > 0 || struckItems.length > 0) && (
        <div className="bg-[#FAF8F5] dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-xl p-2.5 text-xs transition-colors space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {thresholdTriggeredItems.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded text-[11px] font-medium">
                  <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
                  <span>
                    Dynamic Rule: <strong>{thresholdTriggeredItems[0].tax_rule_note}</strong>
                  </span>
                </span>
              )}

              {struckItems.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium">
                  <Scissors className="h-3 w-3 text-slate-500 shrink-0" />
                  <span>{struckItems.length} struck-out item safely excluded</span>
                </span>
              )}
            </div>

            {struckItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStruckDetails(!showStruckDetails)}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
              >
                <span>{showStruckDetails ? 'Hide Struck Lines' : 'View Struck Lines'}</span>
                {showStruckDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* Expanded Struck Items List */}
          {showStruckDetails && struckItems.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-1.5 animate-fadeIn">
              {struckItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-2 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-slate-400 text-[11px]">#{item.line_number || idx + 1}</span>
                    <span className="font-mono text-slate-500 line-through truncate text-[11px]">
                      {item.raw_text_on_paper}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {item.reason}
                    </span>
                    {onRestoreStruckItem && (
                      <button
                        type="button"
                        onClick={() => onRestoreStruckItem(idx)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
