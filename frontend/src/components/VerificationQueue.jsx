import React from 'react';
import { ArrowRight, Hash, DollarSign, Calculator, HelpCircle } from 'lucide-react';

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
  // If doubts is empty, don't show a redundant duplicate banner (consolidated with AlertBar)
  if (!doubts || doubts.length === 0) {
    return null;
  }

  const blockingCount = doubts.filter((d) => d.severity === 'BLOCKING' || d.severity === 'CRITICAL').length;

  return (
    <div className="bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 border-l-4 border-l-zinc-900 dark:border-l-zinc-100 rounded-2xl p-4 sm:p-5 space-y-3.5 transition-colors shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0" />
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            Items Requiring Review ({doubts.length})
          </h3>
        </div>
        {blockingCount > 0 && (
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
            {blockingCount} Action needed
          </span>
        )}
      </div>

      {/* Doubts List */}
      <div className="space-y-2.5">
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
              className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="mt-0.5 shrink-0">
                  {isLumpsum ? (
                    <DollarSign className="h-4 w-4 text-zinc-500" />
                  ) : isMath ? (
                    <Calculator className="h-4 w-4 text-zinc-500" />
                  ) : isInvNum ? (
                    <Hash className="h-4 w-4 text-zinc-500" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-zinc-500" />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-medium text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      {code}
                    </span>
                    {doubt.line_number && (
                      <span className="text-[11px] font-mono text-zinc-400">
                        Line #{doubt.line_number}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                    {doubt.message || doubt.description || 'Verification required'}
                  </p>
                  {doubt.statutory_rule && (
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Statutory Rule: {doubt.statutory_rule}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {isLumpsum && onAllocateLumpsum && (
                  <button
                    type="button"
                    onClick={() => onAllocateLumpsum(doubt)}
                    className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium transition-all shadow-xs inline-flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                  >
                    <span>Allocate Lumpsum</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}

                {isMath && onAcceptAuditedTotal && (
                  <button
                    type="button"
                    onClick={onAcceptAuditedTotal}
                    className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium transition-all shadow-xs inline-flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                  >
                    <span>Accept Audited Math</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}

                {isInvNum && onAssignNextInvoiceNumber && (
                  <button
                    type="button"
                    onClick={onAssignNextInvoiceNumber}
                    className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium transition-all shadow-xs inline-flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                  >
                    <span>Assign Next FY Number</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}

                {onDismissDoubt && (
                  <button
                    type="button"
                    onClick={() => onDismissDoubt(doubt.doubt_id || idx)}
                    className="h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-xs font-medium transition-all cursor-pointer"
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
