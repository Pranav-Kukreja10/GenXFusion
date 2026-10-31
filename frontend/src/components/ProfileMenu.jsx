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
        className="h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs shadow-xs"
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
          className="absolute right-0 mt-1.5 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-1.5 z-50 animate-fadeIn text-xs text-zinc-700 dark:text-zinc-200 transition-colors"
        >
          {/* Header Section: Avatar, User Name, Business, Masked GSTIN */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg mb-1 border border-zinc-200/60 dark:border-zinc-700/60">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs flex items-center justify-center shrink-0">
                    {initials || 'M'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {displayBusiness || 'Verified Merchant'}
                    </p>
                  </div>
                </div>

                {displayGstin && (
                  <div className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Hash className="h-3 w-3" /> GSTIN:
                    </span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                      {displayGstin}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    Guest User
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
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
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">My Profile</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleItemClick(onOpenAuth)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Manage Branches / GSTINs
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                </button>
              </>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleItemClick(onOpenAuth)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity text-left cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In / Register</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => handleItemClick(onOpenHistory)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Scan History</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleItemClick(onOpenSettings)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">Settings</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </button>

            {isAuthenticated && (
              <>
                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleItemClick(() => { if (authLogout) authLogout(); if (onLogout) onLogout(); })}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-left font-medium cursor-pointer"
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
