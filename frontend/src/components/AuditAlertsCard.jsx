import React, { useState } from 'react';
import {
  Wrench,
  FileCheck,
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
      {/* 4 Top KPI Cards — Spacious, Clean & Modern Monochrome */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Paper Written Grand Total */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs transition-colors">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Paper Written
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono-numbers text-base sm:text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              {formatINR(summary.written_grand_total)}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Kacha</span>
          </div>
        </div>

        {/* Audited Taxable Subtotal */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs transition-colors">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Audited Taxable
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono-numbers text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {formatINR(summary.audited_taxable_subtotal)}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Base</span>
          </div>
        </div>

        {/* Total GST */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs transition-colors">
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Total GST (CGST+SGST)
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono-numbers text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {formatINR((summary.total_cgst || 0) + (summary.total_sgst || 0))}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              50/50 split
            </span>
          </div>
        </div>

        {/* Final Pakka Invoice Total (Inverted Dark Card) */}
        <div className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl p-3.5 shadow-xs transition-colors">
          <div className="text-xs font-medium text-zinc-400 dark:text-zinc-600 flex items-center justify-between">
            <span>Pakka Total</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-mono-numbers text-base sm:text-lg font-semibold text-white dark:text-zinc-900">
              {formatINR(summary.final_gst_payable_total)}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600">
              Payable
            </span>
          </div>
        </div>

      </div>

      {/* Math Discrepancy Alert Bar (Shown only when errors exist) */}
      {mathErrorsCount > 0 && (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-zinc-900 dark:border-l-zinc-100 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Math Auditor caught {mathErrorsCount} calculation error{mathErrorsCount > 1 ? 's' : ''} on paper receipt
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                Paper written sums differ from exact Quantity × Unit Rate.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFixAllMathErrors}
            className="inline-flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs transition-all active:scale-[0.98] shrink-0 cursor-pointer"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>Fix All Errors</span>
          </button>
        </div>
      )}

      {/* Secondary Alerts Bar: Threshold Rules & Struck Items */}
      {(thresholdTriggeredItems.length > 0 || struckItems.length > 0) && (
        <div className="bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-2.5 text-xs transition-colors space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {thresholdTriggeredItems.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded text-[11px] font-mono">
                  <FileCheck className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span>
                    Rule: {thresholdTriggeredItems[0].tax_rule_note}
                  </span>
                </span>
              )}

              {struckItems.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded text-[11px] font-mono">
                  <Scissors className="h-3 w-3 text-zinc-400 shrink-0" />
                  <span>{struckItems.length} struck-out item excluded</span>
                </span>
              )}
            </div>

            {struckItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStruckDetails(!showStruckDetails)}
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                <span>{showStruckDetails ? 'Hide Struck Lines' : 'View Struck Lines'}</span>
                {showStruckDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* Expanded Struck Items List */}
          {showStruckDetails && struckItems.length > 0 && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 animate-fadeIn">
              {struckItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-zinc-400 text-[11px]">#{item.line_number || idx + 1}</span>
                    <span className="font-mono text-zinc-400 line-through truncate text-[11px]">
                      {item.raw_text_on_paper}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono">
                      {item.reason}
                    </span>
                    {onRestoreStruckItem && (
                      <button
                        type="button"
                        onClick={() => onRestoreStruckItem(idx)}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
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
