import React, { useState } from 'react';
import {
  ShieldCheck,
  Download,
  AlertTriangle,
  FileCheck2,
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
  const [showTooltip, setShowTooltip] = useState(false);

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
      className="sticky bottom-0 z-30 bg-white/95 dark:bg-[#131822]/95 backdrop-blur-md border-t border-[#E7E2DA] dark:border-[#232B3A] shadow-xl px-4 sm:px-6 py-3 transition-colors"
      role="toolbar"
      aria-label="Invoice Audit Actions & Final Totals"
    >
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Final Invoice Total & GSTN Compliance Badge */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Final Invoice Total
              </span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Payable
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums leading-tight">
              ₹{totals.finalInvoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-[#E7E2DA] dark:bg-zinc-800" />

          {/* Compliance & Breakdown */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">GSTN Schema v3.1</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              Taxable: ₹{totals.taxableValue.toFixed(2)} • GST: ₹{totals.gstCollected.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Secondary: Download GSTR-1 JSON */}
          <button
            type="button"
            onClick={onExportGstr1}
            disabled={isRecalculating}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-[#FAF8F5] hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 border border-[#E7E2DA] dark:border-zinc-700 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Download GSTN-compliant GSTR-1 JSON"
            aria-label="Download GSTR-1 JSON"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Download GSTR-1 JSON</span>
          </button>

          {/* Primary Action 1: Preview Tax Invoice */}
          <button
            type="button"
            onClick={handlePreview}
            disabled={isRecalculating}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Preview standard Tax Invoice modal"
            aria-label="Preview Tax Invoice"
          >
            <Eye className="h-3.5 w-3.5 text-emerald-400" />
            <span>Preview Tax Invoice</span>
          </button>

          {/* Primary Action 2: Generate Tax Invoice (Disabled with Tooltip until issues resolved) */}
          <div
            className="relative flex-1 md:flex-initial"
            onMouseEnter={() => hasErrors && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              type="button"
              onClick={onGenerateInvoice}
              disabled={hasErrors || isRecalculating}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                hasErrors
                  ? 'bg-slate-200 dark:bg-zinc-800/80 text-slate-400 dark:text-zinc-500 cursor-not-allowed shadow-none border border-slate-300 dark:border-zinc-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/25'
              }`}
              aria-label={hasErrors ? `Generate Tax Invoice disabled: Resolve ${issueCount} issue first` : 'Generate Tax Invoice'}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Generate Tax Invoice</span>
            </button>

            {/* Tooltip when disabled due to errors */}
            {hasErrors && showTooltip && (
              <div
                className="absolute right-0 bottom-full mb-2 z-50 w-64 bg-slate-900 dark:bg-zinc-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-slate-700 flex items-start gap-2 animate-fadeIn pointer-events-none"
                role="tooltip"
              >
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Resolve <strong>{issueCount} {issueCount === 1 ? 'issue' : 'issues'}</strong> first before generating the finalized Tax Invoice.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}
