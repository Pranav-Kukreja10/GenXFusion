import React from 'react';
import {
  ShieldCheck,
  Sun,
  Moon,
  Settings,
  FileCheck,
  RefreshCw,
  ArrowLeft,
  Printer,
  Download,
} from 'lucide-react';
import { DEMO_PRESETS } from '../utils/mockPresets';
import ProfileMenu from './ProfileMenu';

export default function HeaderCommandBar({
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
  onOpenPakkaModal,
  onExportGstr1,
}) {
  return (
    <header className="bg-white dark:bg-[#12151C] border-b border-[#E5E0D8] dark:border-zinc-800 sticky top-0 z-30 transition-colors shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand Identity + Stage 2 Scan New Bill Button */}
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

            {/* Stage 2 Action: Return to Initial Scan Landing */}
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

          {/* Center: Clean Preset Switcher (Visible in Stage 2) */}
          {hasScannedInvoice && (
            <div className="hidden lg:flex items-center bg-[#F3EFEA] dark:bg-zinc-800/80 p-1 rounded-xl border border-[#E5E0D8] dark:border-zinc-700/60 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                <FileCheck className="h-3 w-3 text-amber-500" /> Switch Slip:
              </span>
              {DEMO_PRESETS.map((preset) => {
                const isActive = invoice?.invoice_id === preset.data.invoice_id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onLoadPreset(preset)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{preset.title.split(' ')[0]}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded ${
                        isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-black/5 dark:bg-white/5 text-slate-500'
                      }`}
                    >
                      {preset.tag.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Section: Fast Export Actions, Dark Mode, Settings & Profile Avatar Menu */}
          <div className="flex items-center gap-2">
            
            {/* Recalculating indicator */}
            {isRecalculating && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <RefreshCw className="h-3 w-3 animate-spin" /> Recalculating...
              </span>
            )}

            {/* Stage 2 Fast Action Buttons */}
            {hasScannedInvoice && (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenPakkaModal}
                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">View Pakka GST Invoice</span>
                  <span className="md:hidden">Pakka</span>
                </button>

                <button
                  type="button"
                  onClick={onExportGstr1}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Export GSTR-1</span>
                  <span className="md:hidden">GSTR-1</span>
                </button>
              </div>
            )}

            {/* Dark / Light Mode Switcher Button */}
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

            {/* Settings Gear Button */}
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

            {/* Profile Avatar Button (Replaces the old "GROCERY" dropdown chip) */}
            <ProfileMenu
              onOpenProfile={onOpenProfile}
              onOpenSettings={onOpenSettings}
              onOpenHistory={onOpenHistory}
              onLogout={onLogout}
            />

          </div>
        </div>

        {/* Mobile Preset Selector (Visible on small screens only when scanned) */}
        {hasScannedInvoice && (
          <div className="lg:hidden py-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-1 overflow-x-auto text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Switch Slip:</span>
            <div className="flex items-center gap-1 shrink-0">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onLoadPreset(preset)}
                  className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                    invoice?.invoice_id === preset.data.invoice_id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {preset.title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
