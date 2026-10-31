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
    <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-zinc-400" />
            <h3 className="font-semibold text-sm tracking-tight text-zinc-100">
              Search Item Category &amp; Tax Code
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={handleQueryChange}
              placeholder="Search by product name, category, or HSN code..."
              className="w-full h-9 pl-9 pr-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all"
            />
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2">
            Live search across official GST tariff directory (500+ common Indian retail goods).
          </p>
        </div>

        {/* Results list */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-400 font-mono">
              Searching master directory...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-zinc-400">
              <AlertCircle className="h-6 w-6 mx-auto stroke-1" />
              <p className="text-xs">No matching HSN codes found for &quot;{query}&quot;</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isCurrent = currentHsn && String(currentHsn) === String(item.hsn_code);
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onSelectHsn(rowIndex, item.hsn_code, item.gst_rate, item.description);
                    onClose();
                  }}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-zinc-100 dark:bg-zinc-800'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                        HSN {item.hsn_code}
                      </span>
                      <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded">
                        {item.gst_rate}% GST
                      </span>
                    </div>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                      {item.description}
                    </p>
                    {item.sector && (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Sector: {item.sector}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    Select
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
