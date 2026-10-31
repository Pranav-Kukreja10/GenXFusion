import React from 'react';
import {
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Layers,
  FileSearch,
  FileCheck,
  Calculator,
} from 'lucide-react';

const STEPS = [
  {
    id: 1,
    title: 'Enhance Image',
    subtitle: 'Clarity & contrast',
    icon: Layers,
    description: 'Leveling lighting and removing camera shadows',
  },
  {
    id: 2,
    title: 'Read Items',
    subtitle: 'Line-by-line',
    icon: FileSearch,
    description: 'Reading items, units, and handwritten prices',
  },
  {
    id: 3,
    title: 'Tax Categories',
    subtitle: 'Code matching',
    icon: FileCheck,
    description: 'Assigning proper item categories and standard tax rates',
  },
  {
    id: 4,
    title: 'Audit & Math',
    subtitle: 'Verified ledger',
    icon: Calculator,
    description: 'Checking arithmetic accuracy and calculating GST',
  },
];

export default function ScanStepper({ currentStep = 1, failedStep = null }) {
  return (
    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 space-y-4 animate-fadeIn transition-colors shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 text-xs">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <span>Processing Paper Bill</span>
        </span>
        <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
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
              className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-zinc-50 dark:bg-zinc-800/80 shadow-xs border border-zinc-300 dark:border-zinc-700'
                  : 'bg-transparent'
              }`}
            >
              {/* Step Circle Badge */}
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isDone
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                    : isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-2 border-zinc-900 dark:border-zinc-100'
                    : isFailed
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-zinc-900 dark:text-zinc-100" />
                ) : isFailed ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </div>

              {/* Step Labels */}
              <div className="min-w-0 flex-1 sm:flex-initial">
                <p
                  className={`text-xs font-semibold leading-tight ${
                    isActive
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : isDone
                      ? 'text-zinc-800 dark:text-zinc-200'
                      : isFailed
                      ? 'text-red-600'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {step.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-zinc-900 dark:bg-zinc-100 h-full transition-all duration-300 rounded-full"
          style={{ width: `${(Math.min(currentStep, 4) / 4) * 100}%` }}
        />
      </div>

      {/* Active Step Description */}
      <p className="text-xs text-center text-zinc-600 dark:text-zinc-400 font-medium">
        {STEPS[Math.min(currentStep - 1, 3)]?.description}
      </p>
    </div>
  );
}
