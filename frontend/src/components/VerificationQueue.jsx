import React from 'react';
import { AlertCircle, CheckCircle2, ArrowRight, Hash, DollarSign, Calculator, HelpCircle } from 'lucide-react';

/**
 * Structured "Action Required / Verification Queue" rendering backend `pending_doubts`.
 * Provides 1-click direct resolution buttons for:
 * - UNALLOCATED_LUMPSUM_TOTAL
 * - MATH_DISCREPANCY
 * - DUPLICATE_FY_INVOICE_NUMBER / MISSING_INVOICE_NUMBER
 * - LOW_OCR_CONFIDENCE / LOW_HSN_CONFIDENCE
 */
export default function VerificationQueue({
  doubts = [],
  onAllocateLumpsum,
  onAcceptAuditedTotal,
  onAssignNextInvoiceNumber,
  onDismissDoubt,
}) {
  if (!doubts || doubts.length === 0) {
    return (
      <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Verification Queue Clear — 100% Statutory & Mathematical Checks Passed</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
          0 Pending Doubts
        </span>
      </div>
    );
  }

  const blockingCount = doubts.filter((d) => d.severity === 'BLOCKING' || d.severity === 'CRITICAL').length;

  return (
    <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/70 rounded-xl p-3.5 sm:p-4 space-y-3 transition-colors shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-900/50 pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h3 className="font-semibold text-[15px] text-amber-950 dark:text-amber-100">
            Action Required — Verification Queue ({doubts.length})
          </h3>
        </div>
        {blockingCount > 0 && (
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
            {blockingCount} Blocking
          </span>
        )}
      </div>

      {/* Doubts List */}
      <div className="space-y-2">
        {doubts.map((doubt, idx) => {
          const code = doubt.code || doubt.field_type || 'DOUBT';
          const isLumpsum = code === 'UNALLOCATED_LUMPSUM_TOTAL' || code === 'MISSING_LINE_ITEM_PRICE';
          const isMath = code === 'MATH_DISCREPANCY' || doubt.has_math_error;
          const isInvNum =
            code === 'DUPLICATE_FY_INVOICE_NUMBER' ||
            code === 'MISSING_INVOICE_NUMBER' ||
            code === 'INVALID_INVOICE_NUMBER' ||
            code.includes('INVOICE_NUMBER') ||
            (doubt.message && (
              doubt.message.toLowerCase().includes('invoice number') ||
              doubt.message.toLowerCase().includes('rule 46(b)') ||
              doubt.message.toLowerCase().includes('too long') ||
              doubt.message.toLowerCase().includes('16 characters')
            ));

          return (
            <div
              key={doubt.doubt_id || idx}
              className="bg-white dark:bg-[#181D27] border border-amber-200 dark:border-zinc-700/80 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5 shrink-0">
                  {isLumpsum ? (
                    <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : isMath ? (
                    <Calculator className="h-4 w-4 text-red-600 dark:text-red-400" />
                  ) : isInvNum ? (
                    <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                      {code}
                    </span>
                    {doubt.line_number && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        Line #{doubt.line_number}
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] text-slate-800 dark:text-slate-200 font-medium">
                    {doubt.message || doubt.description || 'Verification required'}
                  </p>
                  {doubt.suggested_resolution && (
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 italic">
                      Recommendation: {doubt.suggested_resolution}
                    </p>
                  )}
                </div>
              </div>

              {/* 1-Click Action Resolution Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {isLumpsum && onAllocateLumpsum && (
                  <button
                    type="button"
                    onClick={() => onAllocateLumpsum(doubt.detected_value)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>Allocate Lumpsum</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}

                {isMath && onAcceptAuditedTotal && (
                  <button
                    type="button"
                    onClick={() => onAcceptAuditedTotal(doubt.line_number)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>Accept Audited Total</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {isInvNum && onAssignNextInvoiceNumber && (
                  <button
                    type="button"
                    onClick={() => onAssignNextInvoiceNumber()}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <span>Assign Next FY #</span>
                    <Hash className="h-3.5 w-3.5" />
                  </button>
                )}

                {onDismissDoubt && (
                  <button
                    type="button"
                    onClick={() => onDismissDoubt(doubt.doubt_id || idx)}
                    className="min-h-[38px] px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium cursor-pointer"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

