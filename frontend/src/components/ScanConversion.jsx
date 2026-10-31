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
 * Stage 1: Shadow removal (emerald laser sweep + OpenCV CLAHE filter enhancement)
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
      <div className="w-full flex flex-col items-center py-5 text-center space-y-3 bg-red-50/30 dark:bg-red-950/20 rounded-xl p-4 border border-red-500/80 transition-colors">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center ring-4 ring-red-50 dark:ring-red-900/20">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
            Couldn't read this photo. Try again with better light.
          </h3>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-sm mx-auto">
            {typeof error === 'string' && error.length < 120
              ? error
              : 'Handwriting recognition encountered low illumination or motion blur.'}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
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

      {/* 1. Header Strip: Temporary / Pakka Status + Skip Action */}
      <div className="w-full flex items-center justify-between gap-2 mb-2 px-1">
        {/* Status Tag that cross-fades */}
        <div className="flex items-center gap-1.5">
          {isPakkaStage ? (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#059669] dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-400/80 dark:border-emerald-700 text-[10px] sm:text-xs font-mono font-bold px-2.5 py-0.5 rounded-full shadow-2xs transition-all duration-300">
              <ShieldCheck className="h-3 w-3" />
              <span>TAX INVOICE · AUDITED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800 text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full shadow-2xs transition-all duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>TEMPORARY · KACHA</span>
            </span>
          )}

          {isDemo && (
            <span className="text-[10px] font-mono bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-md font-semibold">
              Demo Bill
            </span>
          )}
        </div>

        {/* Stage progress tracker & Skip action */}
        <div className="flex items-center gap-2 text-xs">
          <span className="hidden sm:inline font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {stage === 0 && 'Capture'}
            {stage === 1 && 'Shadow Removal'}
            {stage === 2 && 'Vernacular OCR'}
            {stage === 3 && 'HSN & GST Audit'}
            {stage === 4 && 'Pakka Seal'}
          </span>

          {!isPakkaStage && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 underline underline-offset-2 px-1 py-0.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Transformation Stage Viewport */}
      <div
        className={`w-full relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-[#FAF8F5] dark:bg-[#111622] transition-all duration-300 ${
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
                    ? 'contrast-115 brightness-105 saturate-105'
                    : 'grayscale-40 contrast-90 brightness-95'
                }`}
              />
            ) : (
              <div className="w-full h-full bg-[#F7F3E8] dark:bg-[#1a202c] flex items-center justify-center text-slate-400 text-xs font-mono">
                [Sharma Kirana Handwritten Estimate]
              </div>
            )}

            {/* STAGE 1: Emerald Sweeping Laser Line (OpenCV CLAHE) */}
            {stage >= 1 && (
              <div
                className={`absolute inset-x-0 h-[2px] bg-emerald-400 shadow-[0_0_12px_#10B981,0_0_24px_#059669] pointer-events-none z-10 ${
                  prefersReducedMotion ? 'hidden' : 'animate-laser-sweep'
                }`}
              >
                <div className="w-full h-8 -mt-8 bg-gradient-to-t from-emerald-500/25 via-emerald-500/5 to-transparent pointer-events-none" />
              </div>
            )}

            {/* STAGE 1 Tech Label: OpenCV CLAHE enhanced */}
            {stage === 1 && (
              <div className="absolute bottom-2 left-2 z-20 inline-flex items-center gap-1.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-sm border border-emerald-500/40">
                <Layers className="h-3 w-3 text-emerald-400" />
                <span>OpenCV CLAHE enhanced</span>
              </div>
            )}

            {/* STAGE 2: Bounding Boxes with Confidence Dots */}
            {stage === 2 && (
              <div className="absolute inset-0 p-3 flex flex-col justify-around pointer-events-none z-20">
                {/* Item 1 */}
                <div
                  className="bg-black/70 backdrop-blur-xs border border-emerald-400/80 rounded px-2 py-1 flex items-center justify-between text-[11px] text-white font-mono shadow-xs transition-opacity duration-200"
                  style={{ animationDelay: '0ms' }}
                >
                  <div className="flex items-center gap-1.5">
                    <ScanText className="h-3 w-3 text-emerald-400" />
                    <span className="truncate max-w-[200px]">1.5 BOX Ashirvaad Atta</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    98%
                  </span>
                </div>

                {/* Item 2 */}
                <div
                  className="bg-black/70 backdrop-blur-xs border border-emerald-400/80 rounded px-2 py-1 flex items-center justify-between text-[11px] text-white font-mono shadow-xs transition-opacity duration-200"
                  style={{ animationDelay: '80ms' }}
                >
                  <div className="flex items-center gap-1.5">
                    <ScanText className="h-3 w-3 text-emerald-400" />
                    <span className="truncate max-w-[200px]">0.5 KGS Tata Namak</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    99%
                  </span>
                </div>

                {/* Item 3 (Mismatch) */}
                <div
                  className="bg-black/70 backdrop-blur-xs border border-amber-400/90 rounded px-2 py-1 flex items-center justify-between text-[11px] text-white font-mono shadow-xs transition-opacity duration-200"
                  style={{ animationDelay: '160ms' }}
                >
                  <div className="flex items-center gap-1.5">
                    <ScanText className="h-3 w-3 text-amber-400" />
                    <span className="truncate max-w-[200px]">0.75 LTR Fortune Mustard Oil</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    88%
                  </span>
                </div>

                {/* Item 4 */}
                <div
                  className="bg-black/70 backdrop-blur-xs border border-emerald-400/80 rounded px-2 py-1 flex items-center justify-between text-[11px] text-white font-mono shadow-xs transition-opacity duration-200"
                  style={{ animationDelay: '240ms' }}
                >
                  <div className="flex items-center gap-1.5">
                    <ScanText className="h-3 w-3 text-emerald-400" />
                    <span className="truncate max-w-[200px]">2 PCS Dettol Soap</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    94%
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =================================================================== */
          /* STAGES 3 & 4: Mini GST Ledger & Audited Pakka Invoice Seal         */
          /* =================================================================== */
          <div className="w-full h-[200px] p-2.5 flex flex-col justify-between bg-white dark:bg-[#131822] text-[#0F172A] dark:text-[#E5E7EB] text-xs">
            {/* Header of Mini Ledger */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              <span>Item & Statutory HSN</span>
              <span>Rate / Audit</span>
            </div>

            {/* Mini Ledger Rows */}
            <div className="space-y-1.5 py-1 overflow-hidden font-mono text-[11px]">
              {/* Row 1: Wheat Flour */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Wheat Flour (Branded)
                  </span>
                  <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                    HSN 1101 · 5%
                  </span>
                </div>
                <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                  ₹1,800.00
                </span>
              </div>

              {/* Row 2: Tata Salt (Exempt) */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Tata Salt (Iodized)
                  </span>
                  <span className="text-[9px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-1 py-0.2 rounded shrink-0">
                    HSN 2501 · 0%
                  </span>
                </div>
                <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                  ₹15.00
                </span>
              </div>

              {/* Row 3: Mustard Oil (Math Mismatch Correction) */}
              <div
                className={`flex items-center justify-between px-1 -mx-1 rounded transition-colors ${
                  stage === 3 && !prefersReducedMotion ? 'animate-amber-discrepancy' : 'bg-amber-50/50 dark:bg-amber-950/20'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                  <span className="font-semibold text-amber-900 dark:text-amber-200 truncate">
                    Mustard Cooking Oil
                  </span>
                  <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                    HSN 1514 · 5%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="tabular-nums font-bold text-amber-700 dark:text-amber-400">
                    ₹{mustardRate}.00
                  </span>
                  {mustardRate === 135 && (
                    <span className="text-[9px] bg-emerald-600 text-white font-bold px-1 rounded inline-flex items-center gap-0.5">
                      <Check className="h-2.5 w-2.5" />
                      Fixed
                    </span>
                  )}
                </div>
              </div>

              {/* Row 4: Struck-Out Excluded Item */}
              <div className="flex items-center justify-between relative opacity-40 text-slate-400 dark:text-slate-500">
                <span className="line-through truncate max-w-[200px]">
                  2 kg Maida - 90 (cut)
                </span>
                <span className="text-[9px] font-medium italic">
                  Excluded from GST
                </span>
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-400/60 -translate-y-1/2 animate-strike-line pointer-events-none" />
              </div>
            </div>

            {/* STAGE 4: Rubber Stamp Overlay in Corner */}
            {stage >= 4 && (
              <div
                className={`absolute top-4 right-4 z-30 pointer-events-none ${
                  prefersReducedMotion ? '' : 'animate-rubber-stamp'
                }`}
              >
                <div className="border-2 border-[#059669] dark:border-emerald-400 text-[#059669] dark:text-emerald-400 bg-white/90 dark:bg-[#131822]/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-center shadow-md font-mono">
                  <div className="text-[10px] font-black tracking-wider uppercase leading-none">
                    PAKKA TAX INVOICE
                  </div>
                  <div className="text-[8px] font-bold tracking-tight text-emerald-700 dark:text-emerald-300 mt-0.5">
                    AUDITED · GSTN v3.1
                  </div>
                </div>
              </div>
            )}

            {/* Stage 4 Summary Totals Strip */}
            <div className="border-t border-slate-200 dark:border-zinc-800 pt-1.5 flex items-center justify-between font-mono text-[11px]">
              <div>
                <span className="text-slate-500 text-[10px]">Taxable: </span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  ₹{displayTotals.taxable.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">GST: </span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  ₹{displayTotals.gst.toFixed(2)}
                </span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded text-right">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">Final: </span>
                <span className="font-extrabold tabular-nums text-[#059669] dark:text-emerald-300">
                  ₹{displayTotals.finalTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Progress Bar & Real Pipeline Label */}
      <div className="w-full mt-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] sm:text-xs">
            {!isPakkaStage ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span>{currentConfig.label}</span>
            {currentConfig.tech && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({currentConfig.tech})
              </span>
            )}
          </span>
          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-xs">
            {Math.round(progress * 100)}%
          </span>
        </div>

        <div className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#059669] via-emerald-500 to-emerald-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
