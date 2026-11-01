import React from 'react';
import {
  ShieldCheck,
  Download,
  Eye,
} from 'lucide-react';
import { computeLiveTotals } from '../utils/gstCalculations';

export default function ActionBar({
  invoice,
  onExportGstr1,
  onGenerateInvoice,
  onPreviewInvoice,
  isRecalculating = false,
}) {
  const activeItems = invoice?.active_items || [];
  const struckOutItems = invoice?.struck_out_items || [];
  const buyerState = invoice?.pos || invoice?.buyer_state_code || '07';
  const sellerState = invoice?.seller_state_code || '07';

  const totals = computeLiveTotals(activeItems, struckOutItems, buyerState, sellerState);
  const issueCount = totals.issues.length;
  const hasErrors = issueCount > 0;

  const handlePreview = () => {
    if (onPreviewInvoice) {
      onPreviewInvoice();
    } else if (onGenerateInvoice) {
      onGenerateInvoice();
    }
  };

  return (
    <aside
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-8 py-3 transition-colors shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
      role="toolbar"
      aria-label="Invoice Actions & Totals"
    >
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Clean Typographic Summary of Final Invoice Total */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-start">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Invoice Total
              </span>
            </div>
            <div className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums leading-tight tracking-tight">
              ₹{totals.finalInvoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="hidden sm:block h-7 w-px bg-zinc-200 dark:bg-zinc-800" />

          {/* Compliance & Breakdown */}
          <div className="space-y-0.5 hidden sm:block">
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-800 dark:text-zinc-200">Verified &amp; Ready</span>
              <span className="text-zinc-300 dark:text-zinc-600">·</span>
              <span className="font-mono text-zinc-500">
                {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 tabular-nums">
              Subtotal: ₹{totals.taxableValue.toFixed(2)} · Tax: ₹{totals.gstCollected.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Subtle Ghost Button: Export GSTR-1 */}
          <button
            type="button"
            onClick={onExportGstr1}
            disabled={isRecalculating}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title="Export GSTR-1 JSON"
            aria-label="Export GSTR-1"
          >
            <Download className="h-3.5 w-3.5 text-zinc-400" />
            <span>Export GSTR-1</span>
          </button>

          {/* Secondary Outline Button: Preview Invoice */}
          <button
            type="button"
            onClick={handlePreview}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            title="Preview standard Tax Invoice modal"
            aria-label="Preview Invoice"
          >
            <Eye className="h-3.5 w-3.5 text-zinc-400" />
            <span>Preview Invoice</span>
          </button>

          {/* High-Contrast Primary CTA: Download Tax Invoice */}
          <button
            type="button"
            onClick={onGenerateInvoice || handlePreview}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            title="Preview & Download Tax Invoice"
            aria-label="Download Tax Invoice"
          >
            <Download className="h-4 w-4" />
            <span>Download Tax Invoice</span>
            {hasErrors && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${issueCount} items flagged`} />
            )}
          </button>
        </div>

      </div>
    </aside>
  );
}
