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
    <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 md:px-8 transition-colors">
      <div className="max-w-[1600px] h-full mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity + Scan New Bill Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-8 w-8 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-4.5 w-4.5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                TrueTax
              </span>
              <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
                AI
              </span>
            </div>
          </div>

          {hasScannedInvoice && onScanNewBill && (
            <button
              type="button"
              onClick={onScanNewBill}
              className="ml-2 inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.98] border border-zinc-200 dark:border-zinc-700 shadow-xs cursor-pointer"
              title="Scan another handwritten receipt"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-zinc-500" />
              <span>Scan Bill</span>
            </button>
          )}
        </div>

        {/* Center: Presets & Print */}
        <div className="flex items-center gap-2">
          {onOpenPakkaModal && (
            <button
              type="button"
              onClick={onOpenPakkaModal}
              className="hidden lg:inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              title="Print official GST tax invoice"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Invoice</span>
            </button>
          )}

          {onExportGstr1 && (
            <button
              type="button"
              onClick={onExportGstr1}
              className="hidden lg:inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              title="Download official GSTN-compliant GSTR-1 JSON"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" />
              <span>GSTR-1 JSON</span>
            </button>
          )}
        </div>

        {/* Right: Status, Mode & Profile */}
        <div className="flex items-center gap-2.5">
          {isRecalculating ? (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 font-medium">
              <RefreshCw className="h-3 w-3 animate-spin text-zinc-600" /> Auditing...
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
              <span className="font-mono">{backendStatus === 'online' ? 'API Live' : 'Local Engine'}</span>
            </span>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 flex items-center justify-center transition-all cursor-pointer active:scale-[0.98]"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun className="h-3.5 w-3.5 text-zinc-200" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-zinc-700" />
            )}
          </button>

          {/* User Profile Avatar with Menu */}
          <ProfileMenu
            onOpenProfile={onOpenProfile}
            onOpenSettings={onOpenSettings}
            onOpenHistory={onOpenHistory}
            onLogout={onLogout}
          />
        </div>

      </div>
    </header>
  );
}
