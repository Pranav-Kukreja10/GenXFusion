/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEMO_PRESETS } from '../utils/mockPresets';

const STORAGE_KEY = 'truetax_bills_data';
const LATEST_KEY = 'truetax_latest_bill_id';

const BillsContext = createContext(null);

function getInitialBills() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse bills from localStorage, fallback to demo presets:', err);
  }
  return DEMO_PRESETS.map((preset) => preset.data);
}

function getInitialLatestId(bills) {
  try {
    const saved = localStorage.getItem(LATEST_KEY);
    if (saved && bills.some((b) => b?.invoice_id === saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return bills[0]?.invoice_id || DEMO_PRESETS[0].data.invoice_id;
}

export function BillsProvider({ children }) {
  const [bills, setBills] = useState(getInitialBills);
  const [latestBillId, setLatestBillId] = useState(() => getInitialLatestId(bills));

  // Persist bills whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    } catch (err) {
      console.warn('Failed to persist bills to localStorage:', err);
    }
  }, [bills]);

  // Persist latestBillId whenever it changes
  useEffect(() => {
    try {
      if (latestBillId) {
        localStorage.setItem(LATEST_KEY, latestBillId);
      }
    } catch (err) {
      console.warn('Failed to persist latestBillId to localStorage:', err);
    }
  }, [latestBillId]);

  // Get a single bill by invoice_id
  const getBill = useCallback(
    (id) => {
      if (!id) return null;
      const target = String(id).trim().toLowerCase();
      return bills.find((b) => String(b.invoice_id).toLowerCase() === target) || null;
    },
    [bills]
  );

  // Update an existing bill
  const updateBill = useCallback((updatedInvoice) => {
    if (!updatedInvoice || !updatedInvoice.invoice_id) return;
    setBills((prev) => {
      const idx = prev.findIndex((b) => b.invoice_id === updatedInvoice.invoice_id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = updatedInvoice;
        return next;
      }
      return [updatedInvoice, ...prev];
    });
    setLatestBillId(updatedInvoice.invoice_id);
  }, []);

  // Add a newly scanned bill (prepended as latest)
  const addBill = useCallback((newInvoice) => {
    if (!newInvoice || !newInvoice.invoice_id) return;
    setBills((prev) => {
      // Remove any existing bill with the same ID if exists
      const filtered = prev.filter((b) => b.invoice_id !== newInvoice.invoice_id);
      return [newInvoice, ...filtered];
    });
    setLatestBillId(newInvoice.invoice_id);
  }, []);

  // Delete a bill by ID
  const deleteBill = useCallback(
    (invoiceId) => {
      setBills((prev) => {
        const next = prev.filter((b) => b.invoice_id !== invoiceId);
        if (latestBillId === invoiceId && next.length > 0) {
          setLatestBillId(next[0].invoice_id);
        }
        return next;
      });
    },
    [latestBillId]
  );

  return (
    <BillsContext.Provider
      value={{
        bills,
        latestBillId,
        setLatestBillId,
        getBill,
        updateBill,
        addBill,
        deleteBill,
      }}
    >
      {children}
    </BillsContext.Provider>
  );
}

export function useBills() {
  const ctx = useContext(BillsContext);
  if (!ctx) {
    throw new Error('useBills must be used within a BillsProvider');
  }
  return ctx;
}
