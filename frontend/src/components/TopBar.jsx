import React from 'react';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import ProfileMenu from './ProfileMenu';

export default function TopBar({
  darkMode,
  onToggleDarkMode,
  onOpenProfile,
  onOpenSettings,
  onOpenHistory,
  onLogout,
  onViewDashboard: _onViewDashboard,
}) {
  return (
    <header className="w-full bg-[#FAF8F5] dark:bg-[#0B0E14] border-b border-[#E7E2DA] dark:border-[#232B3A] shrink-0 z-20 transition-colors">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Left: Brand Lockup */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#059669] dark:bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20 shrink-0">
            <ShieldCheck className="h-5 w-5 stroke-[2.3]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[clamp(1rem,1.5vw,1.15rem)] tracking-tight text-[#0F172A] dark:text-[#E5E7EB]">
              TrueTax <span className="text-[#059669] dark:text-emerald-400">AI</span>
            </span>
            <span className="bg-[#D1FAE5] text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 font-mono">
              #25
            </span>
          </div>
        </div>

        {/* Right: Controls (Dark mode toggle & Circular Avatar with Profile Menu) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#E7E2DA] dark:border-[#232B3A] bg-white dark:bg-[#131822] text-[#64748B] dark:text-[#94A3B8] hover:text-[#059669] dark:hover:text-emerald-400 flex items-center justify-center transition-colors duration-150 active:scale-95 shadow-xs cursor-pointer"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* User Avatar with Profile Dropdown Menu */}
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

