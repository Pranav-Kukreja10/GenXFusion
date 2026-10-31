import React from 'react';
import {
  ShieldCheck,
  Sun,
  Moon,
  Settings,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import BillSwitcher from './BillSwitcher';
import ProfileMenu from './ProfileMenu';

export default function Header({
  invoice,
  onLoadPreset,
  onOpenSettings,
  onOpenProfile,
  onOpenHistory,
  onLogout,
  isRecalculating,
  backendStatus = 'online',
  darkMode,
  onToggleDarkMode,
  hasScannedInvoice = false,
  onScanNewBill,
}) {
  return (
    <header className="bg-white dark:bg-[#12151C] border-b border-[#E5E0D8] dark:border-zinc-800 sticky top-0 z-30 transition-colors shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand Identity + Scan New Bill Button */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  TrueTax <span className="text-emerald-700 dark:text-emerald-500 font-black">AI</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                  #25
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Vernacular OCR & GST Command Center
              </p>
            </div>

            {/* Scan New Bill Action */}
            {hasScannedInvoice && onScanNewBill && (
              <button
                type="button"
                onClick={onScanNewBill}
                className="ml-2 inline-flex items-center gap-1.5 bg-[#FAF8F5] hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 border border-[#E5E0D8] dark:border-zinc-700 shadow-2xs cursor-pointer"
                title="Scan another handwritten receipt"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Scan New Bill</span>
              </button>
            )}
          </div>

          {/* Center: Open Bills Switcher (Pill Tabs with Status Dots + Add Button) */}
          {hasScannedInvoice && (
            <div className="hidden lg:flex items-center">
              <BillSwitcher
                currentInvoiceId={invoice?.invoice_id}
                onSelectBill={onLoadPreset}
                onAddBill={onScanNewBill}
              />
            </div>
          )}

          {/* Right Section: Dark Mode, Settings, Profile Avatar */}
          <div className="flex items-center gap-2">
            
            {/* Recalculating indicator */}
            {isRecalculating && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Recalculating...
              </span>
            )}

            {/* Dark / Light Mode Switcher */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg border border-[#E5E0D8] dark:border-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Settings Gear Button with Live Backend Status Indicator */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 rounded-lg border border-[#E5E0D8] dark:border-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title={`API Configuration (${backendStatus === 'online' ? 'Backend Online' : 'Local Fallback'})`}
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <span
                className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-[#12151C] ${
                  backendStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={`Backend: ${backendStatus}`}
              />
            </div>

            {/* Profile Avatar Button */}
            <ProfileMenu
              onOpenProfile={onOpenProfile}
              onOpenSettings={onOpenSettings}
              onOpenHistory={onOpenHistory}
              onLogout={onLogout}
            />

          </div>
        </div>

        {/* Mobile Open Bills (Visible on small screens only when in Stage 2) */}
        {hasScannedInvoice && (
          <div className="lg:hidden py-2 border-t border-slate-100 dark:border-zinc-800 overflow-x-auto">
            <BillSwitcher
              currentInvoiceId={invoice?.invoice_id}
              onSelectBill={onLoadPreset}
              onAddBill={onScanNewBill}
            />
          </div>
        )}

      </div>
    </header>
  );
}

