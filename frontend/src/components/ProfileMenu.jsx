import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Building,
  History,
  Settings,
  LogOut,
  LogIn,
  Hash,
  ChevronRight,
} from 'lucide-react';
import {
  loadProfile,
  maskGstin,
  getInitials,
} from '../utils/profileStorage';
import { useAuth } from '../context/AuthContext';

export default function ProfileMenu({
  onOpenProfile,
  onOpenSettings,
  onOpenHistory,
  onOpenAuth,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(loadProfile());
  const { user, activeGstin, logout: authLogout } = useAuth();
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Sync profile when updated
  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(loadProfile());
    };
    window.addEventListener('truetax_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('truetax_profile_updated', handleProfileUpdate);
  }, []);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isAuthenticated = Boolean(user);
  const displayName = user?.full_name || (profile.fullName && profile.fullName !== 'Rajesh Sharma' ? profile.fullName : '');
  const displayBusiness = activeGstin?.trade_name || user?.default_business_name || (profile.businessName && profile.businessName !== 'Sharma Kirana & General Store' ? profile.businessName : '');
  const displayGstin = activeGstin?.gstin ? maskGstin(activeGstin.gstin) : (profile.gstin ? maskGstin(profile.gstin) : '');
  const initials = displayName ? getInitials(displayName) : '';

  const handleItemClick = (callback) => {
    setIsOpen(false);
    if (callback) callback();
  };

  return (
    <div className="relative inline-block text-left">
      {/* Profile Avatar Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User profile menu"
        className={`h-9 w-9 rounded-full flex items-center justify-center shadow-xs transition-transform active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-[#12151C] cursor-pointer ${
          isAuthenticated
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs'
            : 'bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-bold'
        }`}
        title={isAuthenticated ? `${displayName} (${displayBusiness})` : 'Account (Sign In)'}
      >
        {isAuthenticated && initials ? (
          <span>{initials}</span>
        ) : (
          <User className="h-4 w-4" />
        )}
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 shadow-2xl p-2 z-50 animate-fadeIn text-xs text-slate-700 dark:text-slate-200 focus:outline-hidden transition-colors"
        >
          {/* Header Section: Avatar, User Name, Business, Masked GSTIN */}
          <div className="p-3 bg-[#FAF8F5] dark:bg-zinc-900/60 rounded-xl mb-1.5 border border-[#E5E0D8]/60 dark:border-zinc-800/80">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {initials || 'M'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-slate-900 dark:text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                      {displayBusiness || 'Verified Merchant'}
                    </p>
                  </div>
                </div>

                {displayGstin && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-zinc-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Hash className="h-3 w-3" /> GSTIN:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                      {displayGstin}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0 shadow-xs">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-slate-900 dark:text-white truncate">
                    Guest User
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Sign in to sync receipts &amp; branches
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5" role="none">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleItemClick(onOpenProfile)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">My Profile</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleItemClick(onOpenAuth)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Building className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Manage Branches / GSTINs
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleItemClick(onOpenAuth)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors text-left cursor-pointer font-semibold"
              >
                <div className="flex items-center gap-2.5">
                  <LogIn className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Sign In / Register</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-emerald-500" />
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => handleItemClick(onOpenHistory)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <History className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Scan History</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleItemClick(onOpenSettings)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/80 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Settings</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {isAuthenticated && (
              <>
                <div className="my-1 border-t border-[#E5E0D8]/60 dark:border-zinc-800/80" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleItemClick(() => { if (authLogout) authLogout(); if (onLogout) onLogout(); })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left font-semibold cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
