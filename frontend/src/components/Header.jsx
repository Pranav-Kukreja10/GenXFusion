import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Sun,
  Moon,
  Building2,
  ChevronDown,
  Check,
  Plus,
  RefreshCw,
  ArrowLeft,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({
  invoice,
  onLoadPreset,
  onOpenSettings: _onOpenSettings,
  onOpenAuth,
  onQuickFillHeader,
  isRecalculating,
  darkMode,
  onToggleDarkMode,
  onScanNewBill,
}) {
  const navigate = useNavigate();
  const { user, merchantGstins, activeGstin, switchActiveGstin } = useAuth();
  const [isGstinMenuOpen, setIsGstinMenuOpen] = useState(false);

  const handleScanClick = () => {
    if (onScanNewBill) {
      onScanNewBill();
    } else {
      navigate('/');
    }
  };

  const isMissingSupplierInfo = Boolean(
    invoice &&
      (!invoice.supplier_gstin ||
        invoice.supplier_gstin === '' ||
        !invoice.merchant_name ||
        invoice.merchant_name.toLowerCase().includes('kacha') ||
        invoice.merchant_name.toLowerCase().includes('unknown'))
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 md:px-8 transition-colors">
      <div className="max-w-[1600px] h-full mx-auto flex items-center justify-between gap-3">
        {/* Left: High-Contrast Monochrome Brand Lockup + Scan Bill */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 group rounded-lg p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
            aria-label="TrueTax AI Home"
            title="TrueTax AI Home"
          >
            <div className="h-8 w-8 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-105 active:scale-95">
              <ShieldCheck className="h-4.5 w-4.5 stroke-[2.2]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                TrueTax
              </span>
              <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
                AI
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleScanClick}
            className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 hover:border-zinc-300 transition-all duration-200 active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5 btn-tactile"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Scan Bill</span>
          </button>
        </div>

        {/* Center: Active Merchant Branch Switcher & Quick-Fill */}
        <div className="flex items-center gap-2">
          {activeGstin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsGstinMenuOpen((prev) => !prev)}
                className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-all duration-200 text-xs font-medium cursor-pointer inline-flex items-center gap-2 shadow-xs active:scale-[0.98]"
                aria-label="Active Merchant GSTIN Branch"
              >
                <Building2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <div className="text-left flex items-center gap-1.5 leading-none max-w-[170px] sm:max-w-[220px]">
                  <span className="font-mono font-semibold truncate tabular-nums text-zinc-900 dark:text-zinc-100">
                    {activeGstin.gstin}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate hidden sm:inline">
                    · {activeGstin.trade_name}
                  </span>
                </div>
                <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0 ml-0.5" />
              </button>

              {/* Branch Switcher Dropdown */}
              {isGstinMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsGstinMenuOpen(false)}
                  />
                  <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-50 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 space-y-1">
                    <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                      Switch Store GSTIN Branch
                    </div>

                    {merchantGstins.map((branch) => {
                      const isCurrent = branch.id === activeGstin.id;
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            switchActiveGstin(branch);
                            setIsGstinMenuOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium'
                              : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-mono font-semibold tabular-nums">
                              {branch.gstin}
                            </div>
                            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                              {branch.trade_name} ({branch.state_name})
                            </div>
                          </div>
                          {isCurrent && <Check className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" />}
                        </button>
                      );
                    })}

                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsGstinMenuOpen(false);
                          if (onOpenAuth) onOpenAuth();
                        }}
                        className="w-full text-left p-2 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Add New GSTIN / Manage Branches</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {isMissingSupplierInfo && activeGstin && (
            <button
              type="button"
              onClick={onQuickFillHeader}
              className="h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-all duration-200 cursor-pointer shadow-xs inline-flex items-center gap-1.5 btn-tactile"
              title="Fill store name & GSTIN from active profile"
            >
              <FileCheck2 className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
              <span className="hidden sm:inline">Use My GSTIN</span>
            </button>
          )}
        </div>

        {/* Right: Uniform Actions: Recalculating, Theme Toggle, Account */}
        <div className="flex items-center gap-2">
          {isRecalculating && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <RefreshCw className="h-3 w-3 animate-spin text-zinc-600 dark:text-zinc-300" />
              <span>Calculating...</span>
            </span>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all duration-200 cursor-pointer flex items-center justify-center active:scale-[0.98]"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun className="h-3.5 w-3.5 text-zinc-200" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-zinc-700" />
            )}
          </button>

          {/* Account Button */}
          <button
            type="button"
            onClick={onOpenAuth}
            className="h-8 px-3 rounded-lg bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all duration-200 text-xs font-medium cursor-pointer inline-flex items-center gap-2 shadow-xs active:scale-[0.98]"
            aria-label="Merchant Account Settings"
          >
            <div className="h-4 w-4 rounded-full bg-white/20 dark:bg-zinc-900/20 text-current flex items-center justify-center text-[10px] font-bold">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'M'}
            </div>
            <span className="truncate max-w-[120px]">
              {user?.full_name || 'Account'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
