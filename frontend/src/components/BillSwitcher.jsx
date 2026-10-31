import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt } from 'lucide-react';
import { useBills } from '../context/BillsContext';
import { computeLiveTotals } from '../utils/gstCalculations';

export default function BillSwitcher({ currentInvoiceId }) {
  const navigate = useNavigate();
  const { bills } = useBills();

  const handleSelectTab = (billId) => {
    navigate(`/dashboard/${billId}`);
  };

  const handleAddBill = () => {
    navigate('/');
  };

  return (
    <div
      className="flex items-center gap-1.5 bg-[#F3EFEA] dark:bg-zinc-800/80 p-1 rounded-xl border border-[#E7E2DA] dark:border-zinc-700/60 text-xs"
      role="tablist"
      aria-label="Open Invoices"
    >
      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1 shrink-0">
        <Receipt className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden xl:inline">Open Bills:</span>
      </span>

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[420px]">
        {bills.map((bill) => {
          const isActive = currentInvoiceId === bill.invoice_id;
          const totals = computeLiveTotals(bill.active_items || []);
          const isAudited = totals.issueCount === 0;
          const shortName = (bill.merchant_name || bill.invoice_id || 'Bill').split(' ')[0];
          const sectorTag = bill.detected_sector || 'GST';

          return (
            <button
              key={bill.invoice_id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelectTab(bill.invoice_id)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 text-xs ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs font-extrabold ring-1 ring-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-900/50'
              }`}
              title={`${bill.invoice_id} (${bill.merchant_name || 'Store'}): ${
                isAudited ? 'All checks passed' : `${totals.issueCount} issue needs review`
              }`}
            >
              {/* Status dot: green = audited / amber = needs review */}
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  isAudited ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />

              <span className="truncate max-w-[100px]">{shortName}</span>

              <span
                className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'bg-black/5 dark:bg-white/5 text-slate-500'
                }`}
              >
                {sectorTag.slice(0, 4)}
              </span>
            </button>
          );
        })}

        {/* '+' button to add a bill -> navigates to '/' */}
        <button
          type="button"
          onClick={handleAddBill}
          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
          title="Add a bill / scan new receipt (navigates to scan page)"
          aria-label="Scan New Bill (+)"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
