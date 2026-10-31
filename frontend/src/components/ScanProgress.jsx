import React from 'react';
import { Layers, FileSearch, FileCheck, Calculator, CheckCircle2, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Enhance', desc: 'Clarity & contrast', icon: Layers },
  { id: 2, label: 'Read items', desc: 'Handwritten items', icon: FileSearch },
  { id: 3, label: 'Tax codes', desc: 'Category lookup', icon: FileCheck },
  { id: 4, label: 'Check math', desc: 'GST calculation', icon: Calculator },
];

export default function ScanProgress({ scanStep = 1, previewUrl = null }) {
  const currentStep = Math.min(Math.max(scanStep, 1), 4);
  const progressPercent = currentStep === 1 ? 25 : currentStep === 2 ? 50 : currentStep === 3 ? 75 : 95;

  return (
    <div className="w-full flex flex-col items-center py-3 sm:py-4 space-y-4 animate-fadeIn">
      {/* Thumbnail with Active Scanning Laser Line */}
      {previewUrl ? (
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-100 dark:bg-zinc-800 shrink-0 group">
          <img
            src={previewUrl}
            alt="Receipt Scanning"
            className="w-full h-full object-cover filter contrast-105"
          />
          {/* Animated Monochrome Laser Scan Line */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-zinc-900 to-transparent dark:via-zinc-100 shadow-sm animate-bounce" />
          <div className="absolute inset-0 bg-black/5 dark:bg-white/5 pointer-events-none" />
        </div>
      ) : (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-700 dark:text-zinc-300" />
        </div>
      )}

      {/* Progress Bar Container */}
      <div className="w-full max-w-md space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 inline-block" />
            <span>Scanning receipt...</span>
          </span>
          <span className="font-mono text-zinc-600 dark:text-zinc-400 font-semibold tabular-nums">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 4 Pipeline Steps: Enhance → Read items → Tax codes → Check math */}
      <div className="w-full max-w-lg grid grid-cols-4 gap-2 pt-1 text-center">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                isCurrent
                  ? 'bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : isDone
                  ? 'text-zinc-700 dark:text-zinc-300 font-medium'
                  : 'text-zinc-400 dark:text-zinc-600'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center mb-1.5 text-xs ${
                  isDone
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : isCurrent
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                ) : (
                  <StepIcon className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="text-xs leading-tight line-clamp-1">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

