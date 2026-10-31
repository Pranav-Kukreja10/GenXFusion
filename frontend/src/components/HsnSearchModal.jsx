import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Tag, AlertCircle } from 'lucide-react';
import { searchHsnApi } from '../services/api';

export default function HsnSearchModal({
  isOpen,
  onClose,
  rowIndex,
  currentHsn,
  onSelectHsn,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (q) => {
    setLoading(true);
    try {
      const data = await searchHsnApi(q);
      setResults(data);
    } catch (err) {
      console.error('HSN search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      performSearch('');
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, performSearch]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    performSearch(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#12151C] rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col border border-[#E5E0D8] dark:border-zinc-800 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 dark:bg-zinc-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-emerald-400" />
            <h3 className="font-bold text-base">Search HSN Master Directory</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-[#E5E0D8] dark:border-zinc-800 bg-[#FAF8F5] dark:bg-zinc-900/40">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={handleQueryChange}
              placeholder="Search by product name, category, or 4/6-digit HSN code..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Live search across CBIC official GST tariff directory (500+ common Indian retail goods).
          </p>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#E5E0D8]/60 dark:divide-zinc-800 space-y-2">
          {loading ? (
            <div className="py-8 text-center text-slate-400">
              <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Searching HSN database...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <AlertCircle className="h-8 w-8 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="text-sm font-semibold">No HSN matches found</p>
              <p className="text-xs mt-1">Try keywords like &apos;atta&apos;, &apos;oil&apos;, &apos;soap&apos;, &apos;cloth&apos;, or enter a 4-digit chapter code.</p>
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={`${item.hsn}-${idx}`}
                onClick={() => {
                  onSelectHsn(rowIndex, item);
                  onClose();
                }}
                className={`p-3 rounded-lg flex items-center justify-between hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer ${
                  currentHsn === item.hsn ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-900 dark:bg-zinc-800 text-white px-2 py-0.5 rounded">
                      HSN {item.hsn}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.description}
                    </span>
                  </div>
                  {item.sector && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Sector: {item.sector}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-block text-xs font-black px-2 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-mono">
                    {item.rate}% GST
                  </span>
                  <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                    CGST {(item.rate / 2).toFixed(1)}% + SGST {(item.rate / 2).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#FAF8F5] dark:bg-zinc-900/60 border-t border-[#E5E0D8] dark:border-zinc-800 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
