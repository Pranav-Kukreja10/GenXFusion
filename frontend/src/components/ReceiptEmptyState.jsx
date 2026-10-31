import React from 'react';

/**
 * ReceiptEmptyState Component
 * 
 * Reusable empty state featuring an inline SVG illustration of a receipt
 * with an animated emerald scan line, followed by the text underneath.
 */
export default function ReceiptEmptyState({
  title = 'No items found',
  subtitle = null,
  action = null,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none ${className}`}
      role="status"
    >
      {/* SVG Receipt with Animated Scan Line */}
      <div className="relative w-24 h-28 sm:w-28 sm:h-32 mb-4 shrink-0">
        <svg
          viewBox="0 0 100 120"
          className="w-full h-full text-slate-200 dark:text-zinc-800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Paper receipt shadow */}
          <rect x="18" y="14" width="68" height="96" rx="6" fill="black" fillOpacity="0.06" />

          {/* Receipt paper background */}
          <rect
            x="16"
            y="10"
            width="68"
            height="96"
            rx="6"
            className="fill-white dark:fill-zinc-900 stroke-slate-300 dark:stroke-zinc-700"
            strokeWidth="2"
          />

          {/* Zig-zag cut at bottom */}
          <path
            d="M 16 100 L 22 104 L 28 100 L 34 104 L 40 100 L 46 104 L 52 100 L 58 104 L 64 100 L 70 104 L 76 100 L 84 100 L 84 10 Z"
            className="fill-white dark:fill-zinc-900 stroke-slate-300 dark:stroke-zinc-700"
            strokeWidth="1.5"
          />

          {/* Header line */}
          <rect x="26" y="22" width="48" height="5" rx="2.5" className="fill-slate-300 dark:fill-zinc-700" />
          <rect x="34" y="31" width="32" height="3" rx="1.5" className="fill-slate-200 dark:fill-zinc-800" />

          {/* Divider dashed line */}
          <line
            x1="24"
            y1="40"
            x2="76"
            y2="40"
            className="stroke-slate-300 dark:stroke-zinc-700"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Item rows */}
          <rect x="24" y="48" width="34" height="3.5" rx="1.5" className="fill-slate-200 dark:fill-zinc-800" />
          <rect x="64" y="48" width="12" height="3.5" rx="1.5" className="fill-slate-300 dark:fill-zinc-700" />

          <rect x="24" y="58" width="28" height="3.5" rx="1.5" className="fill-slate-200 dark:fill-zinc-800" />
          <rect x="64" y="58" width="12" height="3.5" rx="1.5" className="fill-slate-300 dark:fill-zinc-700" />

          <rect x="24" y="68" width="38" height="3.5" rx="1.5" className="fill-slate-200 dark:fill-zinc-800" />
          <rect x="64" y="68" width="12" height="3.5" rx="1.5" className="fill-slate-300 dark:fill-zinc-700" />

          {/* Bottom Total Line */}
          <line
            x1="24"
            y1="78"
            x2="76"
            y2="78"
            className="stroke-slate-300 dark:stroke-zinc-700"
            strokeWidth="1.5"
          />
          <rect x="24" y="84" width="20" height="4" rx="2" className="fill-slate-400 dark:fill-zinc-600" />
          <rect x="58" y="84" width="18" height="4" rx="2" className="fill-[#059669] dark:fill-emerald-400" />
        </svg>

        {/* Animated Emerald Laser Scan Line */}
        <div className="absolute inset-x-3 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_8px_#10B981] animate-receipt-scan pointer-events-none" />
      </div>

      {/* Primary message */}
      <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
        {title}
      </h3>

      {/* Subtitle / explanation */}
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
          {subtitle}
        </p>
      )}

      {/* Action button if provided */}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

