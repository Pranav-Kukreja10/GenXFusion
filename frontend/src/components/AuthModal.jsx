import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  MapPin,
  Lock,
  Mail,
  User,
  ArrowRight,
  LogOut,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validateGstinApi } from '../services/api';

export default function AuthModal({ isOpen, onClose }) {
  const {
    user,
    merchantGstins,
    activeGstin,
    isAuthenticated,
    login,
    loginDemo,
    register,
    logout,
    switchActiveGstin,
    addGstin,
    setDefaultGstin,
    deleteGstin,
  } = useAuth();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add GSTIN Form state
  const [showAddGstin, setShowAddGstin] = useState(false);
  const [newGstin, setNewGstin] = useState('');
  const [newTradeName, setNewTradeName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPrefix, setNewPrefix] = useState('');
  const [gstinValidation, setGstinValidation] = useState(null);
  const [isValidatingGstin, setIsValidatingGstin] = useState(false);
  const [addGstinError, setAddGstinError] = useState('');

  // Validate GSTIN on typing
  useEffect(() => {
    let active = true;
    const clean = newGstin.trim().toUpperCase();
    if (clean.length === 15) {
      setIsValidatingGstin(true);
      validateGstinApi(clean)
        .then(({ data }) => {
          if (active) setGstinValidation(data);
        })
        .catch(() => {
          if (active) setGstinValidation(null);
        })
        .finally(() => {
          if (active) setIsValidatingGstin(false);
        });
    } else {
      setGstinValidation(null);
    }
    return () => {
      active = false;
    };
  }, [newGstin]);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        await login({ email_or_phone: emailOrPhone, password });
      } else {
        await register({
          email_or_phone: emailOrPhone,
          password,
          full_name: fullName,
          default_business_name: businessName,
          contact_phone: emailOrPhone.includes('@') ? '' : emailOrPhone,
        });
      }
      onClose();
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setAuthError('');
    setIsSubmitting(true);
    try {
      await loginDemo();
      onClose();
    } catch (err) {
      setAuthError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddGstinSubmit = async (e) => {
    e.preventDefault();
    setAddGstinError('');
    if (!gstinValidation?.is_valid) {
      setAddGstinError('Please enter a valid 15-character GSTIN with verified Mod-36 checksum.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addGstin({
        gstin: newGstin.trim().toUpperCase(),
        trade_name: newTradeName.trim() || user?.default_business_name || user?.full_name,
        branch_address: newAddress.trim(),
        branch_phone: newPhone.trim(),
        invoice_prefix: newPrefix.trim(),
        is_default: merchantGstins.length === 0,
      });
      setShowAddGstin(false);
      setNewGstin('');
      setNewTradeName('');
      setNewAddress('');
      setNewPhone('');
      setNewPrefix('');
      setGstinValidation(null);
    } catch (err) {
      setAddGstinError(err.message || 'Failed to add GSTIN branch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden transition-all duration-200 my-8">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isAuthenticated ? 'Merchant Profile & Multi-GSTIN Branches' : 'Sign In / Register'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAuthenticated
                  ? `${user?.full_name} (${user?.email_or_phone})`
                  : 'Manage multiple state branches & auto-fill receipts'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {isAuthenticated ? (
            /* ============================================================= */
            /* 1. Logged-In View: Manage Multi-GSTIN Branches                */
            /* ============================================================= */
            <div className="space-y-4">
              {/* Account Quick Info */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
                    {user?.full_name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.default_business_name && <span>{user.default_business_name} • </span>}
                    <span>{user?.email_or_phone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              {/* GSTIN Branches Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Configured GSTIN Branches ({merchantGstins.length})
                  </h3>
                  {!showAddGstin && (
                    <button
                      type="button"
                      onClick={() => setShowAddGstin(true)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Branch</span>
                    </button>
                  )}
                </div>

                {/* Branches List */}
                <div className="space-y-2">
                  {merchantGstins.map((branch) => {
                    const isActive = activeGstin?.id === branch.id;
                    return (
                      <div
                        key={branch.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                {branch.gstin}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {branch.state_code} - {branch.state_name}
                              </span>
                              {Boolean(branch.is_default) && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                              {branch.trade_name}
                            </div>
                            {branch.branch_address && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-sm">{branch.branch_address}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => switchActiveGstin(branch)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            {!Boolean(branch.is_default) && (
                              <button
                                type="button"
                                onClick={() => setDefaultGstin(branch.id)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="Set as primary default branch"
                              >
                                Make Default
                              </button>
                            )}
                            {merchantGstins.length > 1 && (
                              <button
                                type="button"
                                onClick={() => deleteGstin(branch.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Delete GSTIN branch"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add GSTIN Branch Form */}
                {showAddGstin && (
                  <form
                    onSubmit={handleAddGstinSubmit}
                    className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/40 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Add New GSTIN Branch
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddGstin(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {addGstinError && (
                      <div className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 dark:border-red-800">
                        {addGstinError}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          15-Digit GSTIN
                        </label>
                        {newGstin.length === 15 && (
                          <span
                            className={`text-[11px] font-semibold inline-flex items-center gap-1 ${
                              gstinValidation?.is_valid
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {gstinValidation?.is_valid ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Valid {gstinValidation.state_name}
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" /> {gstinValidation?.error_reason || 'Invalid'}
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        maxLength={15}
                        required
                        value={newGstin}
                        onChange={(e) => setNewGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                        placeholder="e.g. 03AAEPG1807C1ZM"
                        className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-mono uppercase text-slate-900 dark:text-slate-100 tabular-nums focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Branch Trade / Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newTradeName}
                        onChange={(e) => setNewTradeName(e.target.value)}
                        placeholder="e.g. Ludhiana Central Branch"
                        className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Branch Phone
                        </label>
                        <input
                          type="text"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="Phone number"
                          className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Invoice Prefix
                        </label>
                        <input
                          type="text"
                          value={newPrefix}
                          onChange={(e) => setNewPrefix(e.target.value)}
                          placeholder="e.g. PB/26-27/"
                          className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Branch Address
                      </label>
                      <input
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Shop / Building, Road, City, PIN"
                        className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !gstinValidation?.is_valid}
                      className="w-full min-h-[42px] bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving Branch...' : 'Save GSTIN Branch'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================= */
            /* 2. Logged-Out View: Login / Register Form                     */
            /* ============================================================= */
            <div className="space-y-4">
              {/* 1-Click Instant Demo Login Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
                    <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500" />
                    <span>Instant Demo Merchant</span>
                  </div>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                    Pre-loaded with 3 verified multi-state GSTIN branches (Punjab, MP, Delhi).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isSubmitting}
                  className="px-4 py-2 min-h-[38px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  1-Click Demo Sign In
                </button>
              </div>

              {/* Segmented Auth Mode Switch */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium">
                  {authError}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Full Name / Merchant Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Business / Trade Name
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Ramesh Textiles"
                        className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Email Address or 10-Digit Mobile Number
                  </label>
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="merchant@example.com or 9876543210"
                    className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[42px] bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isSubmitting
                    ? 'Processing...'
                    : authMode === 'login'
                    ? 'Sign In to Merchant Hub'
                    : 'Create Account & Continue'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
