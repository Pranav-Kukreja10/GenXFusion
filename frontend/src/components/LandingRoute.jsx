import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import ProfileModal from './ProfileModal';
import ApiSettingsModal from './ApiSettingsModal';
import AuthModal from './AuthModal';
import Toast from './Toast';
import { useBills } from '../context/BillsContext';
import { useTheme } from '../context/ThemeContext';
import { loadProfile, addRecentScan } from '../utils/profileStorage';
import { parseInvoiceApi, recalculateInvoiceApi } from '../services/api';

export default function LandingRoute() {
  const navigate = useNavigate();
  const { addBill, latestBillId } = useBills();
  const { darkMode, toggleDarkMode } = useTheme();

  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(1);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scannedBillId, setScannedBillId] = useState(null);
  const [scannedItemCount, setScannedItemCount] = useState(4);
  const [error, setError] = useState(null);

  // Profile & Modals State
  const [profile, setProfile] = useState(loadProfile);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Route title accessibility: "TrueTax AI" on /
  useEffect(() => {
    document.title = 'TrueTax AI';
  }, []);

  // Listen for profile changes
  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(loadProfile());
    };
    window.addEventListener('truetax_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('truetax_profile_updated', handleProfileUpdate);
  }, []);

  // Toast Helpers with Undo Action Support
  const addToast = useCallback((message, type = 'success', title = '', action = null) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type, title, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, action ? 6000 : 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Record scan in Recent Scans log
  const logScanRecord = useCallback(
    (auditedInv) => {
      const hasMathDiscrepancy = Boolean(
        auditedInv.audit_alerts?.discrepancy_count > 0 ||
          auditedInv.active_items?.some((it) => it.has_math_error)
      );
      const finalTotal =
        auditedInv.summary?.final_payable_pakka_total ||
        auditedInv.totals?.final_payable_pakka_total ||
        auditedInv.active_items?.reduce((s, it) => s + (it.final_line_total_with_gst || 0), 0) ||
        0;

      addRecentScan({
        id: `scan-${Date.now()}`,
        invoice_id: auditedInv.invoice_id || `INV-${Date.now().toString().slice(-4)}`,
        merchant_name: auditedInv.merchant_name || profile.businessName || 'General Store',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        raw_date: auditedInv.raw_date_written || 'Today',
        category: auditedInv.detected_sector || profile.businessCategory || 'Grocery',
        total: finalTotal,
        status: hasMathDiscrepancy ? 'Mismatch' : 'Verified',
        status_note: hasMathDiscrepancy ? 'Math Discrepancy Audited' : 'Verified by GST Auditor',
        item_count: auditedInv.active_items?.length || 0,
        thumbnail: auditedInv.raw_image_base64 || auditedInv.enhanced_image_base64 || null,
        full_data: auditedInv,
      });
    },
    [profile]
  );

  // Handle Scan Image with 4-Step Stepper
  const handleScanImage = async (fileBlob, previewDataUrl, bypassCache) => {
    setIsScanning(true);
    setScanSuccess(false);
    setError(null);
    setScannedBillId(null);
    setScanStep(1); // 1: Shadow Removal

    const stepTimer1 = setTimeout(() => setScanStep(2), 250); // 2: OCR
    const stepTimer2 = setTimeout(() => setScanStep(3), 550); // 3: HSN Matching
    const stepTimer3 = setTimeout(() => setScanStep(4), 850); // 4: GST Audit

    try {
      const { data, isOfflineFallback, error: apiErr } = await parseInvoiceApi(
        fileBlob,
        false,
        bypassCache
      );

      const nextInvoice = {
        ...data,
        raw_image_base64: previewDataUrl || data.raw_image_base64,
        enhanced_image_base64: data.enhanced_image_base64 || previewDataUrl,
      };

      if (isOfflineFallback && apiErr) {
        addToast(
          `FastAPI offline (${apiErr}). Running local deterministic auditor.`,
          'warning',
          'Offline Fallback'
        );
      }

      // Live Recalculate
      let audited = nextInvoice;
      try {
        const res = await recalculateInvoiceApi(nextInvoice);
        if (res?.data) audited = res.data;
      } catch (calcErr) {
        console.warn('Recalculate offline, using parsed data:', calcErr);
      }

      // Add to context (persists to localStorage)
      addBill(audited);
      logScanRecord(audited);

      setScannedBillId(audited.invoice_id);
      setScannedItemCount(audited.active_items?.length || 4);
      setScanSuccess(true);
      addToast('Bill scanned and audited successfully!', 'success', 'Scan Complete');
      // NOTE: Do NOT auto-redirect! User sees success state and clicks "Open in Dashboard".
    } catch (err) {
      setError("Couldn't read this photo. Try again with better light.");
      setScanSuccess(false);
      addToast(`Failed to scan invoice: ${err.message}`, 'error', 'Scan Error');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsScanning(false);
    }
  };

  const handleResetScan = () => {
    setError(null);
    setScanSuccess(false);
    setScannedBillId(null);
  };

  const handleNavigateToDashboard = () => {
    if (scannedBillId) {
      navigate(`/dashboard/${scannedBillId}`);
    } else if (latestBillId) {
      navigate(`/dashboard/${latestBillId}`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <>
      <LandingPage
        onScanImage={handleScanImage}
        isScanning={isScanning}
        scanStep={scanStep}
        error={error}
        scanSuccess={scanSuccess}
        scannedItemCount={scannedItemCount}
        onViewDashboard={handleNavigateToDashboard}
        onResetScan={handleResetScan}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenHistory={() => setIsProfileModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => addToast('Logged out of TrueTax AI session.', 'info')}
      />

      {/* Global Modals & Notifications accessible from Landing Page */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
      />
      <ApiSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

