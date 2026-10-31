import React from 'react';
import { Layers, FileSearch, Sparkles, Calculator, CheckCircle2, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Shadow removal', desc: 'OpenCV CLAHE', icon: Layers },
  { id: 2, label: 'OCR', desc: 'Vernacular Vision', icon: FileSearch },
  { id: 3, label: 'HSN match', desc: 'PyTorch Vectors', icon: Sparkles },
  { id: 4, label: 'GST audit', desc: 'Math & Tax Engine', icon: Calculator },
];

export default function ScanProgress({ scanStep = 1, previewUrl = null }) {
  const currentStep = Math.min(Math.max(scanStep, 1), 4);
  const progressPercent = currentStep === 1 ? 25 : currentStep === 2 ? 50 : currentStep === 3 ? 75 : 95;

  return (
    <div className="w-full flex flex-col items-center py-2 sm:py-3 space-y-3 sm:space-y-4 animate-fadeIn">
      {/* Thumbnail with Active Scanning Laser Line */}
      {previewUrl ? (
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-emerald-500/60 shadow-md bg-black/5 dark:bg-white/5 shrink-0 group">
          <img
            src={previewUrl}
            alt="Receipt Scanning"
            className="w-full h-full object-cover filter contrast-105"
          />
          {/* Animated Green Laser Scan Line */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10B981] animate-bounce" />
          <div className="absolute inset-0 bg-emerald-900/10 pointer-events-none" />
        </div>
      ) : (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#059669] dark:text-emerald-400 flex items-center justify-center shadow-inner ring-4 ring-emerald-50 dark:ring-emerald-900/20">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      )}

      {/* Progress Bar Container */}
      <div className="w-full max-w-md space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#0F172A] dark:text-[#E5E7EB] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>Scanning receipt...</span>
          </span>
          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#059669] to-emerald-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 4 Pipeline Steps: Shadow removal → OCR → HSN match → GST audit */}
      <div className="w-full max-w-lg grid grid-cols-4 gap-1.5 sm:gap-2 pt-1 text-center">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center p-1.5 sm:p-2 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-[#059669] dark:text-emerald-300 font-semibold shadow-2xs scale-[1.02]'
                  : isDone
                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center mb-1 text-xs ${
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-emerald-500 text-white animate-pulse'
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-slate-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] leading-tight line-clamp-1">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

