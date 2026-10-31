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

    const duration = 450; // ms
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
      className="flex overflow-x-auto gap-3.5 pb-2 pt-0.5 no-scrollbar snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible"
      role="region"
      aria-label="Invoice Financial Summary Cards"
    >
      {/* =================================================================== */}
      {/* 4. Final Invoice Total (HERO CARD)                                  */}
      {/* Mobile: FIRST (order-1), Desktop: 4th (lg:order-4)                  */}
      {/* =================================================================== */}
      <div
        className="order-1 lg:order-4 shrink-0 w-[280px] sm:w-[320px] lg:w-auto snap-start bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all text-white flex flex-col justify-between relative overflow-hidden group focus-within:ring-2 focus-within:ring-emerald-400"
        tabIndex={0}
        aria-label={`Final Payable Total: ₹${totals.finalInvoiceTotal.toFixed(2)}`}
      >
        <div className="flex items-center justify-between z-10">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">
            Final Invoice Total
          </span>
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
            Payable
          </span>
        </div>

        <div className="my-2 z-10">
          <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-white">
            <CountUpNumber value={totals.finalInvoiceTotal} />
          </div>
        </div>

        {/* Comparison Chip: Handwritten vs Final Payable */}
        <div className="flex items-center gap-2 z-10 pt-1">
          {totals.underBilledDiff !== 0 ? (
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs ${
                totals.underBilledDiff > 0
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-emerald-200 text-emerald-950'
              }`}
            >
              {totals.underBilledDiff > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3" />
                  <span>₹{totals.underBilledDiff.toFixed(2)} under-billed</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3" />
                  <span>₹{Math.abs(totals.underBilledDiff).toFixed(2)} over-billed</span>
                </>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
              <CheckCircle2 className="h-3 w-3" /> Matches Paper Total
            </span>
          )}
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      </div>

      {/* =================================================================== */}
      {/* 1. Handwritten Total (As Written)                                   */}
      {/* Mobile: 2nd (order-2), Desktop: 1st (lg:order-1)                   */}
      {/* =================================================================== */}
      <div
        className="order-2 lg:order-1 shrink-0 w-[260px] sm:w-[280px] lg:w-auto snap-start bg-white dark:bg-[#131822] border border-[#E7E2DA] dark:border-[#232B3A] rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between focus-within:ring-2 focus-within:ring-emerald-600"
        tabIndex={0}
        aria-label={`Handwritten paper total: ₹${totals.handwrittenTotal.toFixed(2)}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Handwritten Total
          </span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
            As Written
          </span>
        </div>

        <div className="my-2">
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            <CountUpNumber value={totals.handwrittenTotal} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Raw paper total on receipt</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Taxable Value                                                    */}
      {/* Mobile: 3rd (order-3), Desktop: 2nd (lg:order-2)                   */}
      {/* =================================================================== */}
      <div
        className="order-3 lg:order-2 shrink-0 w-[260px] sm:w-[280px] lg:w-auto snap-start bg-white dark:bg-[#131822] border border-[#E7E2DA] dark:border-[#232B3A] rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between focus-within:ring-2 focus-within:ring-emerald-600"
        tabIndex={0}
        aria-label={`Taxable Value: ₹${totals.taxableValue.toFixed(2)}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Taxable Value
          </span>
          {totals.mathSavings !== 0 ? (
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                totals.mathSavings > 0
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {totals.mathSavings > 0
                ? `Saved ₹${Math.abs(totals.mathSavings).toFixed(2)}`
                : `Fixed ₹${Math.abs(totals.mathSavings).toFixed(2)}`}
            </span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              Audited
            </span>
          )}
        </div>

        <div className="my-2">
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            <CountUpNumber value={totals.taxableValue} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Calculator className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">Pre-tax audited base</span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. GST Collected (CGST + SGST)                                      */}
      {/* Mobile: 4th (order-4), Desktop: 3rd (lg:order-3)                   */}
      {/* =================================================================== */}
      <div
        className="order-4 lg:order-3 shrink-0 w-[260px] sm:w-[280px] lg:w-auto snap-start bg-white dark:bg-[#131822] border border-[#E7E2DA] dark:border-[#232B3A] rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between focus-within:ring-2 focus-within:ring-emerald-600"
        tabIndex={0}
        aria-label={`GST Collected: ₹${totals.gstCollected.toFixed(2)}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            GST Collected
          </span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
            CGST + SGST
          </span>
        </div>

        <div className="my-2">
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            <CountUpNumber value={totals.gstCollected} />
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <Percent className="h-3 w-3 text-emerald-600 shrink-0" />
          <span className="truncate">
            CGST: ₹{totals.cgstTotal.toFixed(2)} • SGST: ₹{totals.sgstTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
