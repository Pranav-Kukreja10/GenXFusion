import React from 'react';
import { X } from 'lucide-react';

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
              className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-xl transition-all animate-toast-slide-in bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 border-zinc-800 dark:border-zinc-200"
            role="alert"
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className="shrink-0 mt-0.5">
                {isSuccess && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
                {isError && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
                {isWarning && <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />}
                {!isSuccess && !isError && !isWarning && <span className="w-2 h-2 rounded-full bg-zinc-400 inline-block" />}
              </div>

              <div className="text-xs min-w-0">
                {toast.title && <p className="font-semibold">{toast.title}</p>}
                <p className="leading-relaxed break-words font-medium">{toast.message}</p>
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
                  className="shrink-0 bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900 hover:opacity-90 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer btn-tactile"
              >
                {toast.action.label || 'Undo'}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-1 rounded-md text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-colors cursor-pointer btn-tactile"
              aria-label="Dismiss toast"
            >
              <X className="h-4 w-4" />
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
