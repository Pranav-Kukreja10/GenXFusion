import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  ArrowRight,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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
    <section className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8] dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Recent Scans & Audits
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Last 5 verified handwritten receipts from local markets
            </p>
          </div>
        </div>

        {scans.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>View all ({scans.length})</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Scans List or Empty State */}
      {scans.length === 0 ? (
        /* Empty State */
        <div className="py-8 text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#E5E0D8] dark:border-zinc-700 flex items-center justify-center text-slate-400">
            <Receipt className="h-7 w-7 stroke-[1.5]" />
          </div>
          <div className="max-w-xs mx-auto">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No recent scans yet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Scan a kacha bill or select a demo receipt above to start your GST audit log.
            </p>
          </div>
        </div>
      ) : (
        /* List of Last 5 Scans */
        <div className="space-y-2">
          {scans.slice(0, 5).map((scan) => {
            const isVerified = scan.status === 'Verified';
            const isMismatch = scan.status === 'Mismatch';

            return (
              <div
                key={scan.id || scan.invoice_id}
                onClick={() => onSelectScan && onSelectScan(scan)}
                className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-[#E5E0D8]/80 dark:border-zinc-800 bg-[#FAF8F5]/60 hover:bg-emerald-50/40 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/60 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-all cursor-pointer"
              >
                {/* Left: Thumbnail & Store Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    {scan.thumbnail ? (
                      <img
                        src={scan.thumbnail}
                        alt="Receipt"
                        className="h-full w-full object-cover rounded-lg"
                      />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {scan.merchant_name}
                      </p>
                      {scan.category && (
                        <span className="hidden sm:inline-block text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                          {scan.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      <span>{scan.invoice_id}</span>
                      <span>•</span>
                      <span>{scan.date || scan.raw_date}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Total & Status Chip */}
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <p className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
                      {formatCurrency(scan.total)}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {scan.item_count ? `${scan.item_count} items` : 'Audited'}
                    </p>
                  </div>

                  {/* Status Chip */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isVerified
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : isMismatch
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                    }`}
                  >
                    {isVerified ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : isMismatch ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    <span>{scan.status}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
