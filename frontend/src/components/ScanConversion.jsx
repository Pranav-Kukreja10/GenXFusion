import React, { useState, useEffect, useMemo } from 'react';
import {
  ScanText,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { getStageTotals, STAGE_CONFIG } from '../utils/scanStagesEngine.js';

/**
 * ScanConversion Component
 * 
 * Replaces the static scanning state in UploadCard, converting a temporary
 * handwritten (kacha) bill into a permanent (pakka) audited tax invoice.
 * 
 * Stages:
 * Stage 0: Capture & Prep (tilt settle, Kacha tag)
 * Stage 1: Shadow removal (laser sweep + OpenCV CLAHE filter enhancement)
 * Stage 2: Vernacular OCR (staggered bounding boxes + confidence dots)
 * Stage 3: HSN match & GST audit (mini ledger, struck item, mismatch fix 150->135)
 * Stage 4: Pakka Seal & Totals (rubber stamp impact, count-up monospace numbers, border pulse)
 */
export default function ScanConversion({
  imageUrl = null,
  stage = 0,
  progress = 0,
  result = null,
  _onDone = null,
  error = null,
  onRetry = null,
  onSkip = null,
  isDemo = false,
  prefersReducedMotion = false,
}) {
  const totals = useMemo(() => getStageTotals(result), [result]);

  // Animated rate counter for mustard oil mismatch (150 -> 135)
  const [mustardFixed, setMustardFixed] = useState(false);
  useEffect(() => {
    if (stage >= 3) {
      const timer = setTimeout(() => {
        setMustardFixed(true);
      }, prefersReducedMotion ? 100 : 450);
      return () => clearTimeout(timer);
    }
  }, [stage, prefersReducedMotion]);

  const mustardRate = stage >= 3 && mustardFixed ? 135 : 150;

  // Tabular count-up for Stage 4 totals
  const [countUpFactor, setCountUpFactor] = useState(0);

  useEffect(() => {
    if (stage < 4) return;

    if (prefersReducedMotion) {
      const timer = setTimeout(() => setCountUpFactor(1.0), 0);
      return () => clearTimeout(timer);
    }

    const start = Date.now();
    const duration = 700;
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const factor = Math.min(elapsed / duration, 1.0);
      const eased = factor === 1 ? 1 : 1 - Math.pow(2, -10 * factor);
      setCountUpFactor(eased);

      if (factor >= 1.0) {
        clearInterval(interval);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [stage, prefersReducedMotion]);

  const displayTotals = useMemo(() => {
    if (stage < 4) return { taxable: 0, gst: 0, finalTotal: 0 };
    return {
      taxable: Math.round(totals.taxable * countUpFactor * 100) / 100,
      gst: Math.round(totals.gst * countUpFactor * 100) / 100,
      finalTotal: Math.round(totals.finalTotal * countUpFactor * 100) / 100,
    };
  }, [stage, totals, countUpFactor]);

  // Dynamic status tag and stage announcement
  const currentConfig = STAGE_CONFIG[stage] || STAGE_CONFIG[0];
  const isPakkaStage = stage >= 4;

  // Error condition UI
  if (error) {
    return (
      <div className="w-full flex flex-col items-center py-5 text-center space-y-3 bg-red-50/40 dark:bg-red-950/20 rounded-xl p-4 border border-red-200 dark:border-red-900/60 transition-colors">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm">
            Couldn&apos;t read this photo. Try again with better light.
          </h3>
          <p className="text-[11px] text-red-700 dark:text-red-400 mt-1 max-w-sm mx-auto">
            {typeof error === 'string' && error.length < 120
              ? error
              : 'Handwriting recognition encountered low illumination or motion blur.'}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-full flex flex-col items-center transition-all duration-300 relative select-none ${
        isPakkaStage && !prefersReducedMotion ? 'animate-border-pulse' : ''
      }`}
    >
      {/* Accessible screen reader live update */}
      <div className="sr-only" aria-live="polite">
        {currentConfig.ariaText}
      </div>

      {/* 1. Header Strip: Status + Skip Action */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 px-1">
        {/* Status Tag */}
        <div className="flex items-center gap-1.5">
          {isPakkaStage ? (
            <span className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 text-[10px] sm:text-xs font-mono font-medium px-2.5 py-0.5 rounded-full shadow-xs transition-all duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
              <span>INVOICE READY</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] sm:text-xs font-mono font-medium px-2.5 py-0.5 rounded-full shadow-xs transition-all duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 inline-block" />
              <span>PROCESSING BILL</span>
            </span>
          )}

          {isDemo && (
            <span className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded font-medium">
              Sample Bill
            </span>
          )}
        </div>

        {/* Stage progress tracker & Skip action */}
        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
            {stage === 0 && 'Preparing'}
            {stage === 1 && 'Enhancing Photo'}
            {stage === 2 && 'Reading Text'}
            {stage === 3 && 'Checking Math'}
            {stage === 4 && 'Complete'}
          </span>

          {!isPakkaStage && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 underline underline-offset-2 px-1 py-0.5 rounded transition-colors cursor-pointer"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Transformation Stage Viewport */}
      <div
        className={`w-full relative rounded-xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/60 transition-all duration-300 ${
          stage === 0 && !prefersReducedMotion ? 'animate-kacha-tilt' : ''
        }`}
        style={{ minHeight: '190px', maxHeight: '220px' }}
      >
        {/* =================================================================== */}
        {/* STAGES 0, 1, 2: Receipt Photo with Sweeping Laser & Bounding Boxes  */}
        {/* =================================================================== */}
        {stage < 3 ? (
          <div className="relative w-full h-[200px] flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Scanning handwritten bill"
                className={`w-full h-full object-cover transition-all duration-500 ${
                  stage >= 1
                    ? 'contrast-110 brightness-100 saturate-100'
                    : 'grayscale-30 contrast-90 brightness-95'
                }`}
              />
            ) : (
              <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 text-xs font-mono">
                [Sharma Kirana Handwritten Estimate]
              </div>
            )}

            {/* STAGE 1: Sweeping Laser Line (Monochrome / OpenCV CLAHE) */}
            {stage >= 1 && (
              <div
                className={`absolute inset-x-0 h-[1.5px] bg-zinc-900 dark:bg-zinc-100 shadow-[0_0_8px_rgba(0,0,0,0.4)] pointer-events-none z-10 ${
                  prefersReducedMotion ? 'hidden' : 'animate-laser-sweep'
                }`}
              >
                <div className="w-full h-6 -mt-6 bg-gradient-to-t from-zinc-900/20 via-zinc-900/5 to-transparent dark:from-zinc-100/20 pointer-events-none" />
              </div>
            )}

            {/* STAGE 1 Label */}
            {stage === 1 && (
              <div className="absolute bottom-2 left-2 z-20 inline-flex items-center gap-1.5 bg-zinc-900/85 backdrop-blur-sm text-zinc-100 text-[10px] font-mono px-2 py-0.5 rounded shadow-xs border border-zinc-700">
                <Layers className="h-3 w-3 text-zinc-300" />
                <span>Enhancing contrast</span>
              </div>
            )}

            {/* STAGE 2: Bounding Boxes with Confidence Dots */}
            {stage === 2 && (
              <div className="absolute inset-0 p-3 flex flex-col justify-around pointer-events-none z-20">
                {/* Item 1 */}
                <div
                  className="bg-zinc-900/85 backdrop-blur-xs border border-zinc-700 rounded px-2 py-1 flex items-center justify-between text-[11px] text-zinc-100 font-mono shadow-xs transition-opacity duration-200"
                  style={{ animationDelay: '0ms' }}
                >
                  <div className="flex items-center gap-1.5">
                    <ScanText className="h-3 w-3 text-zinc-400" />
                    <span className="truncate max-w-[200px]">1.5 BOX Ashirvaad Atta</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-200 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    98%
                  </span>
                </div>

                {/* Item 2 */}
                <div
                  className="bg-zinc-900/85 backdrop-blur-xs border border-zinc-700 rounded px-2 py-1 flex items-center justify-between text-[11px] text-zinc-100 font-mono shadow-xs transition-opacity duration-200"
                  style={{ animationDelay: '80ms' }}
                >
                  <div className="flex items-center gap-1.5">
                    <ScanText className="h-3 w-3 text-zinc-400" />
                    <span className="truncate max-w-[200px]">Tata Salt 1kg</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-200 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    99%
                  </span>
                </div>

                {/* Item 3 */}
                <div
                  className="bg-zinc-900/85 backdrop-blur-xs border border-zinc-700 rounded px-2 py-1 flex items-center justify-between text-[11px] text-zinc-100 font-mono shadow-xs transition-opacity duration-200"
                  style={{ animationDelay: '160ms' }}
                >
                  <div className="flex items-center gap-1.5">
                    <ScanText className="h-3 w-3 text-zinc-400" />
                    <span className="truncate max-w-[200px]">Sarson Tel (Mustard)</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    82%
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =================================================================== */
          /* STAGES 3, 4: Audited Mini GST Ledger & Seal                         */
          /* =================================================================== */
          <div className="w-full h-full p-3 flex flex-col justify-between bg-white dark:bg-zinc-900 text-xs font-mono animate-fadeIn relative">
            <div className="space-y-1.5 text-[11px]">
              {/* Row 1: Ashirvaad Atta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    Ashirvaad Atta 10kg
                  </span>
                  <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 shrink-0">
                    HSN 1101 · 5%
                  </span>
                </div>
                <span className="tabular-nums font-mono text-zinc-700 dark:text-zinc-300">
                  ₹580.00
                </span>
              </div>

              {/* Row 2: Tata Salt (Exempt) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    Tata Salt (Iodized)
                  </span>
                  <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 shrink-0">
                    HSN 2501 · 0%
                  </span>
                </div>
                <span className="tabular-nums font-mono text-zinc-700 dark:text-zinc-300">
                  ₹15.00
                </span>
              </div>

              {/* Row 3: Mustard Oil (Math Mismatch Correction) */}
              <div
                className={`flex items-center justify-between px-1.5 py-0.5 rounded transition-colors ${
                  stage === 3 && !prefersReducedMotion ? 'animate-amber-discrepancy' : 'bg-zinc-50 dark:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    Mustard Cooking Oil
                  </span>
                  <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 shrink-0">
                    HSN 1514 · 5%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                    ₹{mustardRate}.00
                  </span>
                  {mustardRate === 135 && (
                    <span className="text-[9px] bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-medium px-1 rounded inline-flex items-center gap-0.5">
                      <Check className="h-2.5 w-2.5" />
                      Fixed
                    </span>
                  )}
                </div>
              </div>

              {/* Row 4: Struck-Out Excluded Item */}
              <div className="flex items-center justify-between relative opacity-40 text-zinc-400 dark:text-zinc-500">
                <span className="line-through truncate max-w-[200px]">
                  2 kg Maida - 90 (cut)
                </span>
                <span className="text-[9px] font-medium">
                  Excluded from GST
                </span>
                <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-400 dark:bg-zinc-600 -translate-y-1/2 animate-strike-line pointer-events-none" />
              </div>
            </div>

            {/* STAGE 4: Rubber Stamp Overlay in Corner */}
            {stage >= 4 && (
              <div
                className={`absolute top-3 right-3 z-30 pointer-events-none ${
                  prefersReducedMotion ? '' : 'animate-rubber-stamp'
                }`}
              >
                <div className="border border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-center shadow-xs font-mono">
                  <div className="text-[9px] font-bold tracking-widest uppercase leading-none">
                    PAKKA INVOICE
                  </div>
                  <div className="text-[8px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                    GSTN v3.1 AUDITED
                  </div>
                </div>
              </div>
            )}

            {/* Stage 4 Summary Totals Strip */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-1.5 flex items-center justify-between font-mono text-[11px]">
              <div>
                <span className="text-zinc-400 text-[10px]">Taxable: </span>
                <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                  ₹{displayTotals.taxable.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px]">GST: </span>
                <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                  ₹{displayTotals.gst.toFixed(2)}
                </span>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded text-right">
                <span className="text-zinc-500 dark:text-zinc-400 text-[10px]">Total: </span>
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  ₹{displayTotals.finalTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Progress Bar: Ultra-sleek h-1 with smooth fill */}
      <div className="w-full mt-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 text-[11px]">
            {!isPakkaStage ? (
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 inline-block" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
            )}
            <span>
              {stage === 0 && 'Preparing preview...'}
              {stage === 1 && 'Clearing shadows & contrast...'}
              {stage === 2 && 'Reading item descriptions & prices...'}
              {stage === 3 && 'Checking calculation & GST slabs...'}
              {stage >= 4 && 'Invoice ready'}
            </span>
          </span>
          <span className="font-mono text-zinc-900 dark:text-zinc-100 font-medium text-xs tabular-nums">
            {Math.round(progress * 100)}%
          </span>
        </div>

        <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
