import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      performSearch('');
    }
  }, [isOpen]);

  const performSearch = async (q) => {
    setLoading(true);
    try {
      const data = await searchHsnApi(q);
      setResults(data);
    } catch (err) {
      console.error('HSN search failed:', err);
    } finally {
      setLoading(false);
    }
  };

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
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                8-Sector PyTorch HSN Master Search
              </h3>
              <p className="text-[11px] text-slate-400">
                Override HSN for Line Item #{rowIndex !== null ? rowIndex + 1 : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-[#FAF8F5] dark:bg-zinc-900/60 border-b border-[#E5E0D8] dark:border-zinc-800">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={handleQueryChange}
              placeholder="Search by HSN or product (e.g. Atta, Silk, Paint, Tap)..."
              className="w-full bg-white dark:bg-zinc-800 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="p-3 flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-center py-8 text-xs text-slate-400">Searching master database...</p>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
              <AlertCircle className="h-6 w-6 text-slate-400 mx-auto mb-1" />
              <p>No matching HSN codes found for &quot;{query}&quot;</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = item.hsn === currentHsn;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onSelectHsn(rowIndex, item);
                    onClose();
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-2xs'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-[#FAF8F5] dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold bg-slate-900 dark:bg-zinc-800 text-white px-2 py-0.5 rounded text-[11px]">
                        HSN {item.hsn}
                      </span>
                      <span className="text-[10px] font-semibold uppercase bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-zinc-700">
                        {item.sector}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.2 rounded">
                        {item.rate}% GST
                      </span>
                    </div>
                    <p className="mt-1 text-slate-800 dark:text-slate-200 font-medium truncate">
                      {item.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded text-[11px] font-bold transition-colors"
                  >
                    Select
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
