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
    <header className="sticky top-0 z-40 h-14 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 md:px-8 shrink-0 transition-colors">
      <div className="max-w-6xl h-full mx-auto w-full flex items-center justify-between">
        {/* Left: High-Contrast Monochrome Brand Lockup */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 rounded-lg p-0.5"
          aria-label="TrueTax AI Home"
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

        {/* Right: Controls (Uniform compact controls) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Sign In / Merchant Account Trigger Button */}
          <button
            type="button"
            onClick={onOpenAuth}
            className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all duration-200 text-xs font-medium cursor-pointer shadow-xs inline-flex items-center gap-2 active:scale-[0.98]"
            aria-label="Merchant Account Settings"
          >
            <div className="h-4 w-4 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center text-[10px] font-bold">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'M'}
            </div>
            <span className="truncate max-w-[120px]">
              {user ? (user.full_name || 'Account') : 'Sign In'}
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
              className="h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750 flex items-center justify-center transition-all duration-200 active:scale-[0.98] shadow-xs cursor-pointer btn-tactile"
          >
            {darkMode ? (
              <Sun className="h-3.5 w-3.5 text-zinc-200" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-zinc-700" />
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
