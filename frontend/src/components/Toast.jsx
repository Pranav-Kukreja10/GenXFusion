import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-toast-slide-in ${
              isSuccess
                ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                : isError
                ? 'bg-red-50 dark:bg-red-950/90 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100'
                : isWarning
                ? 'bg-amber-50 dark:bg-amber-950/90 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-white'
            }`}
            role="alert"
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                {isError && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                {isWarning && <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="h-4 w-4 text-blue-600" />}
              </div>

              <div className="text-xs min-w-0">
                {toast.title && <p className="font-bold">{toast.title}</p>}
                <p className="leading-relaxed break-words">{toast.message}</p>
              </div>
            </div>

            {/* Optional Action (e.g. Undo) */}
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action.onClick();
                  onDismiss(toast.id);
                }}
                className="shrink-0 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer btn-tactile"
              >
                {toast.action.label || 'Undo'}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer btn-tactile"
              aria-label="Dismiss toast"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Countdown Progress Bar */}
            <div
              className={`absolute bottom-0 left-0 h-0.5 ${
                isSuccess
                  ? 'bg-emerald-500/80 dark:bg-emerald-400/80'
                  : isError
                  ? 'bg-red-500/80 dark:bg-red-400/80'
                  : isWarning
                  ? 'bg-amber-500/80 dark:bg-amber-400/80'
                  : 'bg-emerald-600/80'
              } animate-toast-progress`}
              style={{
                animationDuration: toast.action ? '6000ms' : '4000ms',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
