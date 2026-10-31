import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { DEMO_PRESETS } from '../utils/mockPresets';

export default function LandingRoute() {
  const navigate = useNavigate();
  const { addBill, latestBillId } = useBills();
  const { darkMode, toggleDarkMode } = useTheme();

  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(1);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scannedBillId, setScannedBillId] = useState(null);
  const [scannedItemCount, setScannedItemCount] = useState(4);
  const [scanResult, setScanResult] = useState(null);
  const [isDemoScan, setIsDemoScan] = useState(false);
  const [previewUrlOverride, setPreviewUrlOverride] = useState(null);
  const [error, setError] = useState(null);

  const demoTimersRef = useRef([]);

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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      demoTimersRef.current.forEach(clearTimeout);
    };
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

  // Handle Scan Image with 4-Stage Stepper
  const handleScanImage = async (fileBlob, previewDataUrl, bypassCache) => {
    setIsDemoScan(false);
    setPreviewUrlOverride(previewDataUrl);
    setScanResult(null);
    setIsScanning(true);
    setScanSuccess(false);
    setError(null);
    setScannedBillId(null);
    setScanStep(1); // 1: Shadow Removal

    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [
      setTimeout(() => setScanStep(2), 700),
      setTimeout(() => setScanStep(3), 1400),
      setTimeout(() => setScanStep(4), 2100),
    ];

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

      setScanResult(audited);
      setScannedBillId(audited.invoice_id);
      setScannedItemCount(audited.active_items?.length || 4);
      setScanStep(4);
    } catch (err) {
      setError("Couldn't read this photo. Try again with better light.");
      setScanSuccess(false);
      addToast(`Failed to scan invoice: ${err.message}`, 'error', 'Scan Error');
    }
  };

  // Called when <ScanConversion /> finishes Stage 4 pakka seal
  const handleScanConversionDone = useCallback(() => {
    setIsScanning(false);
    setScanSuccess(true);
    addToast('Bill scanned and audited successfully!', 'success', 'Pakka Invoice Sealed');
  }, [addToast]);

  // "Try a demo bill" button handler
  const handleTryDemo = useCallback(() => {
    const demoSample = DEMO_PRESETS[0].data; // Sharma Kirana Store with mismatch & struck item
    setIsDemoScan(true);
    setError(null);
    setScanSuccess(false);
    setScanResult(demoSample);
    setPreviewUrlOverride(demoSample.raw_image_base64);
    setScannedBillId(demoSample.invoice_id);
    setScannedItemCount(demoSample.active_items?.length || 4);
    addBill(demoSample);
    logScanRecord(demoSample);

    setIsScanning(true);
    setScanStep(1);

    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [
      setTimeout(() => setScanStep(2), 700),
      setTimeout(() => setScanStep(3), 1400),
      setTimeout(() => setScanStep(4), 2100),
    ];
  }, [addBill, logScanRecord]);

  // Replay animation for presentations
  const handleReplayAnimation = useCallback(() => {
    setScanSuccess(false);
    setIsScanning(true);
    setScanStep(1);

    demoTimersRef.current.forEach(clearTimeout);
    demoTimersRef.current = [
      setTimeout(() => setScanStep(2), 700),
      setTimeout(() => setScanStep(3), 1400),
      setTimeout(() => setScanStep(4), 2100),
    ];
  }, []);

  const handleResetScan = () => {
    setError(null);
    setScanSuccess(false);
    setScannedBillId(null);
    setScanResult(null);
    setPreviewUrlOverride(null);
  };

  // Dashboard handoff with View Transitions API support
  const handleNavigateToDashboard = () => {
    const targetUrl = scannedBillId
      ? `/dashboard/${scannedBillId}`
      : latestBillId
      ? `/dashboard/${latestBillId}`
      : '/dashboard';

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        navigate(targetUrl);
      });
    } else {
      navigate(targetUrl);
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
        onTryDemo={handleTryDemo}
        scanResult={scanResult}
        isDemo={isDemoScan}
        onReplayAnimation={handleReplayAnimation}
        previewUrlOverride={previewUrlOverride}
        onScanConversionDone={handleScanConversionDone}
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
