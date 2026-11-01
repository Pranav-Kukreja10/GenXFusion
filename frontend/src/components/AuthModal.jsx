import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
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
        .then((res) => {
          const val = res?.data || res;
          if (active) setGstinValidation(val);
        })
        .catch(() => {
          if (active) {
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            const isValidFormat = clean.length === 15 && gstinRegex.test(clean);
            setGstinValidation({
              is_valid: isValidFormat,
              state_name: isValidFormat ? 'Verified State' : '',
              error_reason: isValidFormat ? '' : 'Invalid format',
            });
          }
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
        const identifier = (emailOrPhone || '').trim();
        let pass = (password || '').trim();
        if (!pass && (identifier.toLowerCase().includes('demo') || identifier.toLowerCase() === 'admin' || !identifier)) {
          pass = 'demo1234';
        }
        await login({ email_or_phone: identifier || 'demo@truetax.in', password: pass });
      } else {
        await register({
          email_or_phone: emailOrPhone,
          password,
          full_name: fullName,
          default_business_name: businessName,
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
      setAddGstinError('Please enter a valid 15-character GSTIN number.');
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
      className="fixed inset-0 z-[100] bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden transition-all duration-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {isAuthenticated ? 'Store Profile & GSTIN Branches' : 'Sign In / Register'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isAuthenticated
                  ? `${user?.full_name} (${user?.email_or_phone})`
                  : 'Manage your store details and tax numbers'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {isAuthenticated ? (
            /* ============================================================= */
            /* 1. Logged-In View: Manage Multi-GSTIN Branches                */
            /* ============================================================= */
            <div className="space-y-4">
              {/* Account Quick Info */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {user?.full_name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {user?.default_business_name && <span>{user.default_business_name} · </span>}
                    <span>{user?.email_or_phone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <LogOut className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Logout</span>
                </button>
              </div>

              {/* GSTIN Branches Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Configured GSTIN Branches ({merchantGstins.length})
                  </h3>
                  {!showAddGstin && (
                    <button
                      type="button"
                      onClick={() => setShowAddGstin(true)}
                      className="text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:underline inline-flex items-center gap-1 cursor-pointer"
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
                            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/60 shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                                {branch.gstin}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                {branch.state_code} - {branch.state_name}
                              </span>
                              {Boolean(branch.is_default) && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
                              {branch.trade_name}
                            </div>
                            {branch.branch_address && (
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                                <span className="truncate max-w-sm">{branch.branch_address}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => switchActiveGstin(branch)}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            {!Boolean(branch.is_default) && (
                              <button
                                type="button"
                                onClick={() => setDefaultGstin(branch.id)}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                title="Set as primary default branch"
                              >
                                Make Default
                              </button>
                            )}
                            {merchantGstins.length > 1 && (
                              <button
                                type="button"
                                onClick={() => deleteGstin(branch.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        Add New GSTIN Branch
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddGstin(false)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {addGstinError && (
                      <div className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 dark:border-red-800">
                        {addGstinError}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          15-Digit GSTIN
                        </label>
                        {newGstin.length === 15 && (
                          <span
                            className={`text-[11px] font-mono inline-flex items-center gap-1 ${
                              isValidatingGstin
                                ? 'text-zinc-400'
                                : gstinValidation?.is_valid
                                ? 'text-zinc-800 dark:text-zinc-200'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {isValidatingGstin ? (
                              'Verifying...'
                            ) : gstinValidation?.is_valid ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Valid {gstinValidation.state_name}
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {gstinValidation?.error_reason || 'Invalid'}
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
                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm font-mono uppercase text-zinc-900 dark:text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Branch Trade / Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newTradeName}
                        onChange={(e) => setNewTradeName(e.target.value)}
                        placeholder="e.g. Ludhiana Central Branch"
                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                          Branch Phone
                        </label>
                        <input
                          type="text"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="Phone number"
                          className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                          Invoice Prefix
                        </label>
                        <input
                          type="text"
                          value={newPrefix}
                          onChange={(e) => setNewPrefix(e.target.value)}
                          placeholder="e.g. PB/26-27/"
                          className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Branch Address
                      </label>
                      <input
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Shop / Building, Road, City, PIN"
                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !gstinValidation?.is_valid}
                      className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
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
              <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                    <Zap className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" />
                    <span>Instant Demo Merchant</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Pre-loaded with 3 verified multi-state GSTIN branches (Punjab, MP, Delhi).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs rounded-lg shadow-xs transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                >
                  Demo Sign In
                </button>
              </div>

              {/* Segmented Auth Mode Switch */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
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
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Full Name / Merchant Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Business / Trade Name
                      </label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Ramesh Textiles"
                        className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Email Address or 10-Digit Mobile Number
                  </label>
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="merchant@example.com or 9876543210"
                    className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required={authMode === 'register' || (!emailOrPhone.toLowerCase().includes('demo') && emailOrPhone.toLowerCase() !== 'admin')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === 'login' ? 'Enter password (or demo1234)' : 'Enter account password'}
                    className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
                  />
                </div>

                {authMode === 'login' && (
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                    <span>Quick credentials:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailOrPhone('demo@truetax.in');
                        setPassword('demo1234');
                      }}
                      className="text-zinc-900 dark:text-zinc-100 font-medium hover:underline cursor-pointer"
                    >
                      Fill Demo (demo@truetax.in / demo1234)
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50 mt-2"
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
