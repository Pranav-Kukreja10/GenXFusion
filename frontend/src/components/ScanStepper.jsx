import React from 'react';
import {
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Layers,
  FileSearch,
  Sparkles,
  Calculator,
} from 'lucide-react';

const STEPS = [
  {
    id: 1,
    title: 'Shadow Removal',
    subtitle: 'OpenCV CLAHE',
    icon: Layers,
    description: 'Leveling illumination & removing harsh camera shadows',
  },
  {
    id: 2,
    title: 'OCR',
    subtitle: 'Vernacular Vision',
    icon: FileSearch,
    description: 'Extracting Hindi/English vernacular handwritten lines',
  },
  {
    id: 3,
    title: 'HSN Matching',
    subtitle: 'PyTorch Vectors',
    icon: Sparkles,
    description: 'Sub-2.5ms cosine vector ranking across 6 sectors',
  },
  {
    id: 4,
    title: 'GST Audit',
    subtitle: 'Math & Tax Engine',
    icon: Calculator,
    description: 'Auditing shopkeeper totals & dynamic ₹1k GST rules',
  },
];

export default function ScanStepper({ currentStep = 1, failedStep = null }) {
  return (
    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5 space-y-4 animate-fadeIn transition-colors">
      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/40 text-xs">
        <span className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
          <span>Processing Kacha Bill Pipeline</span>
        </span>
        <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
          Step {Math.min(currentStep, 4)} of 4
        </span>
      </div>

      {/* Stepper Grid (Horizontal on Desktop, Stacked on Mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
        {STEPS.map((step) => {
          const StepIcon = step.icon;
          const isDone = currentStep > step.id && failedStep !== step.id;
          const isActive = currentStep === step.id && failedStep !== step.id;
          const isFailed = failedStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-2.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-white dark:bg-zinc-800 shadow-sm border border-emerald-300 dark:border-emerald-600'
                  : 'bg-transparent'
              }`}
            >
              {/* Step Circle Badge */}
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-600 animate-pulse'
                    : isFailed
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isActive ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-700 dark:text-emerald-300" />
                ) : isFailed ? (
                  <AlertCircle className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </div>

              {/* Step Labels */}
              <div className="min-w-0 flex-1 sm:flex-initial">
                <p
                  className={`text-xs font-bold leading-tight ${
                    isActive
                      ? 'text-emerald-900 dark:text-white'
                      : isDone
                      ? 'text-emerald-800 dark:text-emerald-300'
                      : isFailed
                      ? 'text-red-600'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {step.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/40 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-emerald-600 dark:bg-emerald-400 h-full transition-all duration-300 rounded-full"
          style={{ width: `${(Math.min(currentStep, 4) / 4) * 100}%` }}
        />
      </div>

      {/* Active Step Description */}
      <p className="text-[11px] text-center text-emerald-800 dark:text-emerald-300 font-medium">
        {STEPS[Math.min(currentStep - 1, 3)]?.description}
      </p>
    </div>
  );
}
