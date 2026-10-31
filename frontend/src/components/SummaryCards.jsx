import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Calculator,
  Percent,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { computeLiveTotals } from '../utils/gstCalculations';

/**
 * Animated count-up component for tabular mono numeric values.
 */
function CountUpNumber({ value, prefix = '₹', decimals = 2 }) {
  const [displayVal, setDisplayVal] = useState(() => Number(value) || 0);
  const prevValRef = useRef(Number(value) || 0);

  useEffect(() => {
    const startVal = prevValRef.current;
    const endVal = Number(value) || 0;

    if (Math.abs(startVal - endVal) < 0.001) {
      return;
    }

    const duration = 400; // ms
    const startTime = performance.now();
    let animId;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplayVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        setDisplayVal(endVal);
        prevValRef.current = endVal;
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  return (
    <span className="font-mono tabular-nums">
      {prefix}
      {displayVal.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

export default function SummaryCards({ invoice }) {
  const activeItems = invoice?.active_items || [];
  const struckOutItems = invoice?.struck_out_items || [];
  const buyerState = invoice?.pos || invoice?.buyer_state_code || '07';
  const sellerState = invoice?.seller_state_code || '07';

  const totals = computeLiveTotals(activeItems, struckOutItems, buyerState, sellerState);

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      role="region"
      aria-label="Invoice Financial Summary Cards"
    >
      {/* =================================================================== */}
      {/* 1. Handwritten Total (As Written)                                   */}
      {/* =================================================================== */}
      <div
        className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700"
        tabIndex={0}
        aria-label={`Handwritten paper total: ₹${totals.handwrittenTotal.toFixed(2)}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Original Bill Total
          </span>
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            As Written
          </span>
        </div>

        <div className="my-3">
          <div className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums tracking-tight">
            <CountUpNumber value={totals.handwrittenTotal} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">Total on paper receipt</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Taxable Value                                                    */}
      {/* =================================================================== */}
      <div
        className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700"
        tabIndex={0}
        aria-label={`Taxable Value: ₹${totals.taxableValue.toFixed(2)}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Subtotal (Before Tax)
          </span>
          {totals.mathSavings !== 0 ? (
            <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
              {totals.mathSavings > 0
                ? `Diff -₹${Math.abs(totals.mathSavings).toFixed(2)}`
                : `Diff +₹${Math.abs(totals.mathSavings).toFixed(2)}`}
            </span>
          ) : (
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              Verified
            </span>
          )}
        </div>

        <div className="my-3">
          <div className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums tracking-tight">
            <CountUpNumber value={totals.taxableValue} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Calculator className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">Audited items subtotal</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. GST Collected (CGST + SGST)                                      */}
      {/* =================================================================== */}
      <div
        className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700"
        tabIndex={0}
        aria-label={`GST Collected: ₹${totals.gstCollected.toFixed(2)}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Tax (GST)
          </span>
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            {totals.isInterState ? 'IGST' : 'CGST + SGST'}
          </span>
        </div>

        <div className="my-3">
          <div className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums tracking-tight">
            <CountUpNumber value={totals.gstCollected} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Percent className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span className="truncate">Total GST calculated</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. Final Invoice Total (Inverted High-Contrast Obsidian Card)       */}
      {/* =================================================================== */}
      <div
        className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all duration-200"
        tabIndex={0}
        aria-label={`Final Payable Total: ₹${totals.finalInvoiceTotal.toFixed(2)}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-600">
            Total Invoice Amount
          </span>
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-white/10 dark:bg-zinc-900/10 text-zinc-200 dark:text-zinc-800">
            Final Total
          </span>
        </div>

        <div className="my-3">
          <div className="text-xl sm:text-2xl font-semibold font-mono tabular-nums tracking-tight">
            <CountUpNumber value={totals.finalInvoiceTotal} />
          </div>
        </div>

        {/* Comparison Line: Handwritten vs Final Payable */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
          {totals.underBilledDiff !== 0 ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              {totals.underBilledDiff > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3" />
                  <span>₹{totals.underBilledDiff.toFixed(2)} diff vs paper</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3" />
                  <span>₹{Math.abs(totals.underBilledDiff).toFixed(2)} diff vs paper</span>
                </>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-zinc-300 dark:text-zinc-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>Matches Paper Total</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
