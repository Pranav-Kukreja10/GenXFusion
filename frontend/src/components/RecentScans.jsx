import React, { useState, useEffect } from 'react';
import {
  Clock,
  ArrowRight,
  Receipt,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { loadRecentScans } from '../utils/profileStorage';

export default function RecentScans({ onSelectScan, onViewAll }) {
  const [scans, setScans] = useState(loadRecentScans());

  useEffect(() => {
    const handleUpdate = () => {
      setScans(loadRecentScans());
    };
    window.addEventListener('truetax_scans_updated', handleUpdate);
    return () => window.removeEventListener('truetax_scans_updated', handleUpdate);
  }, []);

  const formatCurrency = (num) => {
    const val = Number(num) || 0;
    return `₹${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <section className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 sm:p-5 space-y-4 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Recent Scans &amp; Audits
            </h3>
            <p className="text-[11px] text-zinc-400">
              Verified handwritten receipts from local markets
            </p>
          </div>
        </div>

        {scans.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View all ({scans.length})</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Scans List */}
      {scans.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <Receipt className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto stroke-1" />
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            No previous scans logged yet.
          </p>
          <p className="text-[11px] text-zinc-400">
            Upload or capture a paper bill above to start auditing.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scans.slice(0, 5).map((scan) => {
            const isMismatch = scan.status === 'Mismatch';

            return (
              <div
                key={scan.id}
                onClick={() => onSelectScan && onSelectScan(scan)}
                className="group p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail / Icon */}
                  <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                    {scan.thumbnail ? (
                      <img
                        src={scan.thumbnail}
                        alt="Scanned slip thumbnail"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Receipt className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {scan.merchant_name}
                      </span>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {scan.category}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5 font-mono">
                      <span>{scan.date || scan.raw_date}</span>
                      <span>·</span>
                      <span>{scan.item_count} items</span>
                    </div>
                  </div>
                </div>

                {/* Right: Total & Status */}
                <div className="text-right shrink-0">
                  <div className="font-mono font-semibold text-xs text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCurrency(scan.total)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {isMismatch ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-600 dark:text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Discrepancy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Audited
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
