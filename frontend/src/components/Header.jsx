import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  hasScannedInvoice: _hasScannedInvoice = true,
  onScanNewBill,
}) {
  const navigate = useNavigate();

  const handleScanClick = () => {
    if (onScanNewBill) {
      onScanNewBill();
    } else {
      navigate('/');
    }
  };

  return (
    <header className="bg-white dark:bg-[#12151C] border-b border-[#E5E0D8] dark:border-zinc-800 sticky top-0 z-30 transition-colors shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand Identity (Links to '/') + Scan New Bill Button */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-3 shrink-0 group cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl p-1"
              aria-label="TrueTax AI Home"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center text-white shadow-xs group-hover:bg-emerald-700 transition-colors">
                <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    TrueTax <span className="text-emerald-700 dark:text-emerald-500 font-black">AI</span>
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

            {/* Scan New Bill Action -> navigates to '/' */}
            <button
              type="button"
              onClick={handleScanClick}
              className="ml-2 inline-flex items-center gap-1.5 bg-[#FAF8F5] hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 border border-[#E5E0D8] dark:border-zinc-700 shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Scan another handwritten receipt (navigates to /)"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Scan New Bill</span>
            </button>
          </div>

          {/* Center: Open Bills Switcher (Pill Tabs with Status Dots + Add Button) */}
          <div className="hidden lg:flex items-center">
            <BillSwitcher
              currentInvoiceId={invoice?.invoice_id}
              onSelectBill={onLoadPreset}
              onAddBill={handleScanClick}
            />
          </div>

          {/* Right Section: Recalculating indicator, Dark Mode, Settings, Profile Avatar */}
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

            {/* Settings Trigger */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-lg border border-[#E5E0D8] dark:border-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Open API & Local OCR Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* User Profile Avatar with Credentials Menu */}
            <ProfileMenu
              onOpenProfile={onOpenProfile}
              onOpenSettings={onOpenSettings}
              onOpenHistory={onOpenHistory}
              onLogout={onLogout}
              backendStatus={backendStatus}
            />
          </div>

        </div>
      </div>
    </header>
  );
}
