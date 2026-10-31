import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getAuthToken,
  clearAuthToken,
  loginApi,
  registerApi,
  getMeApi,
  addGstinApi,
  setDefaultGstinApi,
  deleteGstinApi,
} from '../services/api';

const AuthContext = createContext(null);

const ACTIVE_GSTIN_STORAGE_KEY = 'parchisetu_active_gstin_id';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [merchantGstins, setMerchantGstins] = useState([]);
  const [activeGstin, setActiveGstin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync active GSTIN branch from list
  const resolveActiveGstin = useCallback((gstins, preferredId = null) => {
    if (!gstins || gstins.length === 0) return null;
    if (preferredId) {
      const found = gstins.find((g) => g.id === preferredId || g.gstin === preferredId);
      if (found) return found;
    }
    const defaultBranch = gstins.find((g) => g.is_default);
    return defaultBranch || gstins[0];
  }, []);

  // Initialize Auth state on mount
  useEffect(() => {
    async function initAuth() {
      const token = getAuthToken();
      if (token) {
        try {
          const data = await getMeApi();
          const u = data.user || data;
          const branches = data.merchant_gstins || u.merchant_gstins || [];
          setUser(u);
          setMerchantGstins(branches);

          const savedGstinId = localStorage.getItem(ACTIVE_GSTIN_STORAGE_KEY);
          const active = resolveActiveGstin(branches, savedGstinId ? Number(savedGstinId) : null);
          setActiveGstin(active);
          setLoading(false);
          return;
        } catch (err) {
          console.warn('Existing token invalid or expired. Auto-logging into verified Demo Merchant.', err);
          clearAuthToken();
        }
      }

      // Auto-initialize demo merchant for effortless judging & testing
      try {
        const demoData = await loginApi({ demo_mode: true });
        setUser(demoData.user);
        const branches = demoData.merchant_gstins || [];
        setMerchantGstins(branches);
        const active = resolveActiveGstin(branches);
        setActiveGstin(active);
        if (active) localStorage.setItem(ACTIVE_GSTIN_STORAGE_KEY, String(active.id));
      } catch (err) {
        console.error('Failed to auto-seed demo auth:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, [resolveActiveGstin]);

  // Login handler
  const login = useCallback(
    async ({ email_or_phone, password }) => {
      setLoading(true);
      try {
        const data = await loginApi({ email_or_phone, password });
        setUser(data.user);
        const branches = data.merchant_gstins || [];
        setMerchantGstins(branches);
        const active = resolveActiveGstin(branches);
        setActiveGstin(active);
        if (active) localStorage.setItem(ACTIVE_GSTIN_STORAGE_KEY, String(active.id));
        return data;
      } finally {
        setLoading(false);
      }
    },
    [resolveActiveGstin]
  );

  // 1-Click Demo Login
  const loginDemo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loginApi({ demo_mode: true });
      setUser(data.user);
      const branches = data.merchant_gstins || [];
      setMerchantGstins(branches);
      const active = resolveActiveGstin(branches);
      setActiveGstin(active);
      if (active) localStorage.setItem(ACTIVE_GSTIN_STORAGE_KEY, String(active.id));
      return data;
    } finally {
      setLoading(false);
    }
  }, [resolveActiveGstin]);

  // Register handler
  const register = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const data = await registerApi(payload);
        setUser(data.user);
        const branches = data.merchant_gstins || [];
        setMerchantGstins(branches);
        const active = resolveActiveGstin(branches);
        setActiveGstin(active);
        if (active) localStorage.setItem(ACTIVE_GSTIN_STORAGE_KEY, String(active.id));
        return data;
      } finally {
        setLoading(false);
      }
    },
    [resolveActiveGstin]
  );

  // Logout handler
  const logout = useCallback(() => {
    clearAuthToken();
    localStorage.removeItem(ACTIVE_GSTIN_STORAGE_KEY);
    setUser(null);
    setMerchantGstins([]);
    setActiveGstin(null);
  }, []);

  // Switch Active GSTIN branch
  const switchActiveGstin = useCallback((branch) => {
    if (!branch) return;
    setActiveGstin(branch);
    localStorage.setItem(ACTIVE_GSTIN_STORAGE_KEY, String(branch.id));
  }, []);

  // Add GSTIN Branch
  const addGstin = useCallback(
    async (payload) => {
      const res = await addGstinApi(payload);
      const branches = res.merchant_gstins || [];
      setMerchantGstins(branches);
      if (payload.is_default || !activeGstin) {
        const active = resolveActiveGstin(branches, res.branch?.id);
        setActiveGstin(active);
        if (active) localStorage.setItem(ACTIVE_GSTIN_STORAGE_KEY, String(active.id));
      }
      return res;
    },
    [activeGstin, resolveActiveGstin]
  );

  // Set Default GSTIN
  const setDefaultGstin = useCallback(
    async (gstinId) => {
      const res = await setDefaultGstinApi(gstinId);
      const branches = res.merchant_gstins || [];
      setMerchantGstins(branches);
      const active = resolveActiveGstin(branches, gstinId);
      setActiveGstin(active);
      if (active) localStorage.setItem(ACTIVE_GSTIN_STORAGE_KEY, String(active.id));
      return res;
    },
    [resolveActiveGstin]
  );

  // Delete GSTIN
  const deleteGstin = useCallback(
    async (gstinId) => {
      const res = await deleteGstinApi(gstinId);
      const branches = res.merchant_gstins || [];
      setMerchantGstins(branches);
      const active = resolveActiveGstin(branches);
      setActiveGstin(active);
      if (active) localStorage.setItem(ACTIVE_GSTIN_STORAGE_KEY, String(active.id));
      return res;
    },
    [resolveActiveGstin]
  );

  // Quick-Fill Helper: inject active branch into invoice when header fields are missing
  const quickFillHeader = useCallback(
    (currentInvoice) => {
      if (!currentInvoice || !activeGstin) return currentInvoice;
      const suppState = activeGstin.state_code || '03';
      const posState = currentInvoice.place_of_supply_state_code || suppState;
      const isInter = suppState !== posState;

      return {
        ...currentInvoice,
        merchant_name: activeGstin.trade_name || currentInvoice.merchant_name,
        store_name_guess: activeGstin.trade_name || currentInvoice.store_name_guess,
        supplier_gstin: activeGstin.gstin,
        extracted_supplier_gstin: activeGstin.gstin,
        supplier_state_code: suppState,
        supplier_state_name: activeGstin.state_name || 'Punjab',
        store_address: activeGstin.branch_address || currentInvoice.store_address,
        supplier_phone: activeGstin.branch_phone || currentInvoice.supplier_phone,
        is_inter_state: isInter,
        pending_doubts: (currentInvoice.pending_doubts || []).filter(
          (d) => d.code !== 'MISSING_SUPPLIER_GSTIN' && d.code !== 'MISSING_STORE_NAME'
        ),
      };
    },
    [activeGstin]
  );

  const value = {
    user,
    merchantGstins,
    activeGstin,
    loading,
    isAuthenticated: Boolean(user),
    login,
    loginDemo,
    register,
    logout,
    switchActiveGstin,
    addGstin,
    setDefaultGstin,
    deleteGstin,
    quickFillHeader,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

