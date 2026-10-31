import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProfileMenu from './ProfileMenu';

export default function TopBar({
  darkMode,
  onToggleDarkMode,
  onOpenProfile,
  onOpenSettings,
  onOpenHistory,
  onOpenAuth,
  onLogout,
  onViewDashboard: _onViewDashboard,
}) {
  const { user } = useAuth();

  return (
    <header className="w-full bg-[#FAF8F5] dark:bg-[#0B0E14] border-b border-[#E7E2DA] dark:border-[#232B3A] shrink-0 z-20 transition-colors">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Left: Brand Lockup (Links to '/') */}
        <Link
          to="/"
          className="flex items-center gap-2.5 sm:gap-3 group cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl"
          aria-label="TrueTax AI Home"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#059669] dark:bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20 shrink-0 group-hover:bg-[#047857] transition-colors">
            <ShieldCheck className="h-5 w-5 stroke-[2.3]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[clamp(1rem,1.5vw,1.15rem)] tracking-tight text-[#0F172A] dark:text-[#E5E7EB]">
              TrueTax <span className="text-[#059669] dark:text-emerald-400">AI</span>
            </span>
          </div>
        </Link>

        {/* Right: Controls (Account button, Dark mode toggle & Circular Avatar with Profile Menu) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Sign In / Merchant Account Trigger Button */}
          <button
            type="button"
            onClick={onOpenAuth}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E7E2DA] dark:border-[#232B3A] bg-white dark:bg-[#131822] text-[#0F172A] dark:text-[#E5E7EB] hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
            aria-label="Merchant Account Settings"
          >
            <div className="h-5 w-5 rounded-full bg-[#059669] dark:bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'M'}
            </div>
            <span className="hidden sm:inline truncate max-w-[120px]">
              {user ? (user.full_name || 'Account') : 'Sign In'}
            </span>
          </button>

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
            onOpenAuth={onOpenAuth}
            onLogout={onLogout}
          />
        </div>
      </div>
    </header>
  );
}
