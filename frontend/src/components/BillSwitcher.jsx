import React from 'react';
import { Plus, Receipt } from 'lucide-react';
import { DEMO_PRESETS } from '../utils/mockPresets';
import { computeLiveTotals } from '../utils/gstCalculations';

export default function BillSwitcher({
  currentInvoiceId,
  onSelectBill,
  onAddBill,
}) {
  return (
    <div className="flex items-center gap-1.5 bg-[#F3EFEA] dark:bg-zinc-800/80 p-1 rounded-xl border border-[#E5E0D8] dark:border-zinc-700/60 text-xs">
      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
        <Receipt className="h-3 w-3 text-emerald-600" /> Open Bills:
      </span>

      <div className="flex items-center gap-1 overflow-x-auto">
        {DEMO_PRESETS.map((preset) => {
          const isActive = currentInvoiceId === preset.data.invoice_id;
          const totals = computeLiveTotals(preset.data.active_items || []);
          const isAudited = totals.issueCount === 0;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectBill(preset)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {/* Status dot: green = audited / amber = needs review */}
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  isAudited ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
                title={isAudited ? 'Audited • All checks passed' : `${totals.issueCount} issues need review`}
              />

              <span className="truncate max-w-[120px]">{preset.title.split(' ')[0]}</span>

              <span
                className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                    : 'bg-black/5 dark:bg-white/5 text-slate-500'
                }`}
              >
                {preset.tag.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* '+' button to add a bill */}
        <button
          type="button"
          onClick={onAddBill}
          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Add a bill / scan new receipt"
          aria-label="Add new bill"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

