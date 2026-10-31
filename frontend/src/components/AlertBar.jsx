import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Wand2,
  FileBadge,
  Scissors,
  RotateCcw,
  Eye,
  X,
} from 'lucide-react';
import { computeLiveTotals } from '../utils/gstCalculations';
import ConfettiBurst from './ConfettiBurst';

export default function AlertBar({
  invoice,
  onFixAll,
  onRestoreStruckItem,
}) {
  const [isStruckModalOpen, setIsStruckModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const activeItems = invoice?.active_items || [];
  const struckOutItems = invoice?.struck_out_items || [];
  const buyerState = invoice?.pos || invoice?.buyer_state_code || '07';
  const sellerState = invoice?.seller_state_code || '07';

  const totals = computeLiveTotals(activeItems, struckOutItems, buyerState, sellerState);
  const issues = totals.issues;

  // Trigger confetti burst only when issues go from > 0 to 0
  const prevIssueCountRef = useRef(issues.length);
  useEffect(() => {
    if (prevIssueCountRef.current > 0 && issues.length === 0) {
      setShowConfetti(true);
    }
    prevIssueCountRef.current = issues.length;
  }, [issues.length]);

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

  // If no dynamic rule explicitly found on items, default to the prominent one if Wheat Flour present
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
    <div className="space-y-2.5 relative">
      {/* Lightweight Confetti Burst (fires when issues drop to 0) */}
      {showConfetti && <ConfettiBurst onComplete={() => setShowConfetti(false)} />}

      {/* =================================================================== */}
      {/* 1. Main Status Bar: Amber Alert or Green All Clear                  */}
      {/* =================================================================== */}
      {issues.length > 0 ? (
        <div
          className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-3.5 sm:p-4 transition-all duration-300 shadow-xs animate-fadeIn"
          role="alert"
          aria-live="polite"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <AlertTriangle className="h-4 w-4 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-amber-950 dark:text-amber-100 flex items-center gap-1.5 flex-wrap">
                  <span>
                    {issues.length === 1
                      ? `1 issue needs review: ${issues[0].itemName} rate mismatch`
                      : `${issues.length} issues need review`}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded">
                    Math Discrepancy
                  </span>
                </h4>
                <ul className="mt-1 space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                  {issues.map((iss) => (
                    <li key={iss.index} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>
                        Paper written ₹{iss.written.toFixed(2)} vs math ₹{iss.audited.toFixed(2)} (suggested fix: ₹{iss.suggestedFix.toFixed(2)})
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
              className="btn-tactile inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-xs transition-all shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label={`Fix all ${issues.length} rate mismatches`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Fix all</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs transition-all duration-400"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5">
            {/* SVG Checkmark with Self-Drawing Stroke Animation */}
            <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <svg className="h-4 w-4 stroke-[2.6]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M5 13l4 4L19 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-checkmark-draw"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-extrabold text-emerald-950 dark:text-emerald-100">
                All checks passed
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Line item arithmetic, HSN chapters &amp; tax rates match GSTN Portal rules.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-700 shadow-2xs">
            100% Audited
          </span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. Quiet Info Chips: Dynamic Tax Rules & Struck-out Item Excluded  */}
      {/* =================================================================== */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        {/* Dynamic Rule Chips */}
        {dynamicRules.map((rule, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg text-[10px] font-medium"
          >
            <FileBadge className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{rule.note.startsWith('Dynamic Rule:') ? rule.note : `Dynamic Rule: ${rule.note}`}</span>
          </div>
        ))}

        {/* Struck-Out Items Excluded Chip */}
        {struckOutItems.length > 0 && (
          <div className="inline-flex items-center gap-2 bg-[#F4F0EA] dark:bg-zinc-800/80 border border-[#E7E2DA] dark:border-zinc-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-medium">
            <Scissors className="h-3 w-3 text-slate-400 shrink-0" />
            <span>
              {struckOutItems.length} struck-out item excluded
            </span>
            <span className="text-slate-300 dark:text-zinc-600">•</span>
            <button
              type="button"
              onClick={() => setIsStruckModalOpen(true)}
              className="btn-tactile text-emerald-700 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:ring-1 focus-visible:ring-emerald-600 rounded px-1"
              aria-label="View excluded struck-out receipt items"
            >
              <Eye className="h-2.5 w-2.5" />
              <span>View</span>
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* Modal: View & Restore Excluded Struck-Out Items                     */}
      {/* =================================================================== */}
      {isStruckModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="struck-modal-title"
        >
          <div className="bg-white dark:bg-[#131822] border border-[#E7E2DA] dark:border-[#232B3A] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 id="struck-modal-title" className="font-bold text-slate-900 dark:text-white text-sm">
                  Excluded Struck-Out Items ({struckOutItems.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStruckModalOpen(false)}
                className="btn-tactile p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              The AI vision model detected pen cut marks or cancellations on these handwritten lines. They are automatically excluded from taxable sales turnover under GST Rule 46.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
              {struckOutItems.map((struck, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 text-xs"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="font-mono text-slate-500 line-through truncate">
                      {struck.raw_text_on_paper || struck.raw_text || 'Struck item'}
                    </div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      Omitted from GST Ledger
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                      ₹{(struck.written_line_total || struck.total || 0).toFixed(2)}
                    </span>
                    {onRestoreStruckItem && (
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreStruckItem(idx);
                          setIsStruckModalOpen(false);
                        }}
                        className="btn-tactile inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs"
                        title="Include back in active taxable items"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStruckModalOpen(false)}
                className="btn-tactile px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer"
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
