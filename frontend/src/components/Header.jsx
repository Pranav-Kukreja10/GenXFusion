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
  Sparkles,
  ArrowLeft,
  Sparkle,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({
  invoice,
  onLoadPreset,
  onOpenSettings,
  onOpenAuth,
  onQuickFillHeader,
  isRecalculating,
  darkMode,
  onToggleDarkMode,
  onScanNewBill,
}) {
  const navigate = useNavigate();
  const { user, merchantGstins, activeGstin, switchActiveGstin, isAuthenticated } = useAuth();
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
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Identity + Scan New Bill */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0 group rounded-xl p-1 focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="TrueTax AI Home"
              title="TrueTax AI Home"
            >
              <div className="h-9 w-9 rounded-xl bg-[#059669] dark:bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20 group-hover:bg-emerald-700 transition-colors shrink-0">
                <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    TrueTax <span className="text-[#059669] dark:text-emerald-400 font-black">AI</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded font-mono">
                    #25
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Vernacular OCR &amp; GST Command Center
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleScanClick}
              className="hidden md:inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Scan Bill</span>
            </button>
          </div>

          {/* Center: Active Merchant Branch Switcher */}
          <div className="flex items-center gap-2">
            {/* Multi-GSTIN Branch Switcher Dropdown */}
            {activeGstin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsGstinMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors text-xs font-medium cursor-pointer shadow-2xs"
                  aria-label="Active Merchant GSTIN Branch"
                >
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-left flex flex-col leading-tight max-w-[170px] sm:max-w-[220px]">
                    <span className="text-[11px] font-mono font-bold truncate tabular-nums">
                      {activeGstin.gstin}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {activeGstin.state_name} • {activeGstin.trade_name}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
                </button>

                {/* Dropdown Menu */}
                {isGstinMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsGstinMenuOpen(false)}
                    />
                    <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-50 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 space-y-1">
                      <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Switch Merchant GSTIN Branch
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
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-semibold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-mono font-bold tabular-nums">
                                {branch.gstin}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {branch.trade_name} ({branch.state_name})
                              </div>
                            </div>
                            {isCurrent && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsGstinMenuOpen(false);
                            if (onOpenAuth) onOpenAuth();
                          }}
                          className="w-full text-left p-2 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add New GSTIN / Manage Branches</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quick-Fill Active GSTIN button when paper lacks header */}
            {isMissingSupplierInfo && activeGstin && (
              <button
                type="button"
                onClick={onQuickFillHeader}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="Fill merchant name & GSTIN from active profile"
              >
                <FileCheck2 className="h-3.5 w-3.5 text-amber-600" />
                <span>Quick-Fill My GSTIN</span>
              </button>
            )}
          </div>

          {/* Right: Recalculating, Theme Toggle, Account / Sign In */}
          <div className="flex items-center gap-2">
            {isRecalculating && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <RefreshCw className="h-3 w-3 animate-spin" /> Recalculating...
              </span>
            )}

            {/* Dark / Light Mode Switcher */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>

            {/* Merchant Account / Sign In Trigger Button */}
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
              aria-label="Merchant Account Settings"
            >
              <div className="h-5 w-5 rounded-full bg-[#059669] dark:bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'M'}
              </div>
              <span className="hidden sm:inline truncate max-w-[120px]">
                {user?.full_name || 'Account'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
