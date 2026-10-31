import React, { useState } from 'react';
import {
  Wand2,
  FileBadge,
  Scissors,
  RotateCcw,
  Eye,
  X,
} from 'lucide-react';
import { computeLiveTotals } from '../utils/gstCalculations';

export default function AlertBar({
  invoice,
  onFixAll,
  onRestoreStruckItem,
}) {
  const [isStruckModalOpen, setIsStruckModalOpen] = useState(false);

  const activeItems = invoice?.active_items || [];
  const struckOutItems = invoice?.struck_out_items || [];
  const buyerState = invoice?.pos || invoice?.buyer_state_code || '07';
  const sellerState = invoice?.seller_state_code || '07';

  const totals = computeLiveTotals(activeItems, struckOutItems, buyerState, sellerState);
  const issues = totals.issues;

  // Extract dynamic rule chips (e.g. Packaged/Branded Wheat Flour 5% GST, Garments > 1k 12% GST, Salt Exempt 0%)
  const dynamicRules = [];
  activeItems.forEach((item) => {
    if (item.tax_rule_note) {
      if (!dynamicRules.some((r) => r.note === item.tax_rule_note)) {
        dynamicRules.push({
          name: item.product_name_normalized || item.raw_text_on_paper,
          note: item.tax_rule_note,
        });
      }
    }
  });

  // If no dynamic rule explicitly found on items, default to prominent one if Wheat Flour present
  if (
    dynamicRules.length === 0 &&
    activeItems.some((it) => (it.product_name_normalized || '').toLowerCase().includes('wheat flour') || (it.raw_text || '').includes('Atta'))
  ) {
    dynamicRules.push({
      name: 'Branded Wheat Flour',
      note: 'Dynamic Rule: Packaged/Branded Wheat Flour (5% GST)',
    });
  }

  return (
    <div className="space-y-2.5">
      {/* =================================================================== */}
      {/* 1. Main Status Bar: Mismatch Callout or Calm All-Clear Strip        */}
      {/* =================================================================== */}
      {issues.length > 0 ? (
        <div
          className="bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-zinc-900 dark:border-l-zinc-100 rounded-2xl p-4 sm:p-4.5 transition-all shadow-xs"
          role="alert"
          aria-live="polite"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                  <span>
                    {issues.length === 1
                      ? `1 item has a calculation difference: ${issues[0].itemName}`
                      : `${issues.length} items have calculation differences`}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    Math check
                  </span>
                </h4>
                <ul className="mt-1.5 space-y-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {issues.map((iss) => (
                    <li key={iss.index} className="flex items-center gap-1.5">
                      <span className="text-zinc-400">·</span>
                      <span>
                        Written on paper: ₹{iss.written.toFixed(2)} · Correct calculation: ₹{iss.audited.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* "Fix all" Action Button */}
            <button
              type="button"
              onClick={onFixAll}
              className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs px-3.5 py-2 rounded-lg shadow-xs transition-all active:scale-[0.98] shrink-0 cursor-pointer"
              aria-label={`Fix all ${issues.length} rate mismatches`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Fix All</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100">
                All checks passed · Ready for invoice
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Item quantities, rates, and tax calculations are verified.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
            Verified
          </span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. Quiet Info Chips: Struck-out Item Excluded                      */}
      {/* =================================================================== */}
      {struckOutItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <div className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-lg text-xs font-mono">
            <Scissors className="h-3 w-3 text-zinc-400 shrink-0" />
            <span>
              {struckOutItems.length} struck-out item excluded
            </span>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <button
              type="button"
              onClick={() => setIsStruckModalOpen(true)}
              className="text-zinc-900 dark:text-zinc-100 font-medium underline underline-offset-2 hover:no-underline inline-flex items-center gap-1 cursor-pointer"
              aria-label="View excluded struck-out receipt items"
            >
              <Eye className="h-2.5 w-2.5" />
              <span>View</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. Struck-out Items Modal / Drawer                                  */}
      {/* =================================================================== */}
      {isStruckModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="struck-items-title"
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                  <Scissors className="h-3.5 w-3.5" />
                </div>
                <h3 id="struck-items-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Excluded Struck-Out Items ({struckOutItems.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStruckModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              These items were physically crossed out or marked as cancelled on the paper bill. They are excluded from your GST taxable total to prevent over-reporting.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {struckOutItems.map((st, idx) => (
                <div
                  key={idx}
                  className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400 line-through">
                      {st.raw_text_on_paper || st.raw_text || 'Crossed out item'}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {st.reason || 'Paper receipt strike-through line'}
                    </p>
                  </div>

                  {onRestoreStruckItem && (
                    <button
                      type="button"
                      onClick={() => {
                        onRestoreStruckItem(idx);
                        if (struckOutItems.length <= 1) setIsStruckModalOpen(false);
                      }}
                      className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium px-2.5 py-1 rounded-lg transition-all active:scale-[0.98] shadow-xs cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStruckModalOpen(false)}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
