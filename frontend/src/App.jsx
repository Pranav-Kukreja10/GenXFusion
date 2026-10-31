import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import SummaryCards from './components/SummaryCards';
import AlertBar from './components/AlertBar';
import InvoiceDetailsStrip from './components/InvoiceDetailsStrip';
import VisualInspector from './components/VisualInspector';
import LedgerTable from './components/LedgerTable';
import ActionBar from './components/ActionBar';
import PakkaInvoiceModal from './components/PakkaInvoiceModal';
import Gstr1Modal from './components/Gstr1Modal';
import ApiSettingsModal from './components/ApiSettingsModal';
import HsnSearchModal from './components/HsnSearchModal';
import ProfileModal from './components/ProfileModal';
import Toast from './components/Toast';
import { DEMO_PRESETS } from './utils/mockPresets';
import {
  loadProfile,
  addRecentScan,
} from './utils/profileStorage';
import {
  parseInvoiceApi,
  recalculateInvoiceApi,
  exportGstr1Api,
  testConnection,
} from './services/api';
import { Eye, X } from 'lucide-react';

export default function App() {
  // 2-Stage Progressive UI Flow State
  const [hasScannedInvoice, setHasScannedInvoice] = useState(false);
  const [scanStep, setScanStep] = useState(1); // 1: Shadow, 2: OCR, 3: HSN, 4: GST Audit
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const [invoice, setInvoice] = useState(DEMO_PRESETS[0].data);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('offline');

  // Profile & Toast States
  const [profile, setProfile] = useState(loadProfile());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Ref to Recent Scans section for scroll-to
  const recentScansRef = useRef(null);

  // Dark / Light Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('parchisetu_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('parchisetu_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('parchisetu_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Toast Notification Helpers with Undo Action Support
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

  // Modals state
  const [isPakkaModalOpen, setIsPakkaModalOpen] = useState(false);
  const [isGstr1ModalOpen, setIsGstr1ModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHsnSearchOpen, setIsHsnSearchOpen] = useState(false);
  const [hsnSearchRowIndex, setHsnSearchRowIndex] = useState(null);
  const [gstr1Data, setGstr1Data] = useState(null);

  // Check backend health on mount
  useEffect(() => {
    async function checkHealth() {
      const ok = await testConnection();
      setBackendStatus(ok ? 'online' : 'offline');
    }
    checkHealth();
  }, []);

  // Listen for profile changes
  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(loadProfile());
    };
    window.addEventListener('truetax_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('truetax_profile_updated', handleProfileUpdate);
  }, []);

  // Recalculate helper
  const triggerRecalculate = useCallback(async (currentInvoice) => {
    setIsRecalculating(true);
    try {
      const { data } = await recalculateInvoiceApi(currentInvoice);
      setInvoice(data);
      return data;
    } catch (err) {
      console.error('Recalculate error:', err);
      return currentInvoice;
    } finally {
      setIsRecalculating(false);
    }
  }, []);

  // Record scan in Recent Scans log
  const logScanRecord = (auditedInv) => {
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
  };

  // 1. Handle File / Photo Scan with 4-Step Stepper
  const handleScanImage = async (fileBlob, previewDataUrl, bypassCache) => {
    setIsScanning(true);
    setScanSuccess(false);
    setError(null);
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

      const audited = await triggerRecalculate(nextInvoice);
      logScanRecord(audited);
      setScanSuccess(true);
      setTimeout(() => {
        setHasScannedInvoice(true);
      }, 1000);
      addToast('Bill scanned and audited successfully!', 'success', 'Scan Complete');
    } catch (err) {
      setError(`Couldn't read this photo. Try again with better light.`);
      setScanSuccess(false);
      addToast(`Failed to scan invoice: ${err.message}`, 'error', 'Scan Error');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsScanning(false);
    }
  };

  // 2. Simulated Quick-Test Judge Demo Scan (4-step animation -> Stage 2)
  const _handleQuickDemoScan = async (preset) => {
    setIsScanning(true);
    setError(null);
    setScanStep(1); // 1: Shadow Removal

    await new Promise((r) => setTimeout(r, 180));
    setScanStep(2); // 2: OCR

    await new Promise((r) => setTimeout(r, 180));
    setScanStep(3); // 3: HSN Matching

    await new Promise((r) => setTimeout(r, 180));
    setScanStep(4); // 4: GST Audit

    await new Promise((r) => setTimeout(r, 180));

    setInvoice(preset.data);
    const audited = await triggerRecalculate(preset.data);
    logScanRecord(audited);
    setIsScanning(false);
    setHasScannedInvoice(true);
    addToast(`Loaded ${preset.title} demo invoice with live GST audit!`, 'success', 'Demo Slip Loaded');
  };

  // 3. Load Demo Preset from switcher
  const handleLoadPreset = async (preset) => {
    setError(null);
    setInvoice(preset.data);
    const audited = await triggerRecalculate(preset.data);
    logScanRecord(audited);
    setHasScannedInvoice(true);
    addToast(`Switched to ${preset.title}`, 'info');
  };

  // Load from Recent Scans card
  const _handleSelectRecentScan = async (scanRecord) => {
    if (scanRecord.full_data) {
      setInvoice(scanRecord.full_data);
      await triggerRecalculate(scanRecord.full_data);
    } else {
      // Find matching preset
      const match = DEMO_PRESETS.find((p) => p.data.invoice_id === scanRecord.invoice_id);
      if (match) {
        setInvoice(match.data);
        await triggerRecalculate(match.data);
      }
    }
    setHasScannedInvoice(true);
    addToast(`Loaded recent scan: ${scanRecord.invoice_id}`, 'info');
  };

  // 4. Edit Line Item Field
  const handleItemChange = async (index, field, value) => {
    if (!invoice?.active_items) return;
    const updatedItems = [...invoice.active_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    const nextInvoice = {
      ...invoice,
      active_items: updatedItems,
    };

    await triggerRecalculate(nextInvoice);
  };

  // 5. Fix Single Row Math Error
  const handleFixSingleMathError = async (index) => {
    if (!invoice?.active_items) return;
    const updatedItems = [...invoice.active_items];
    const item = updatedItems[index];
    const auditedVal = item.audited_line_total ?? (Number(item.quantity || 0) * Number(item.unit_price || 0));
    
    updatedItems[index] = {
      ...item,
      written_line_total: auditedVal,
      has_math_error: false,
      math_discrepancy: 0,
    };

    const nextInvoice = {
      ...invoice,
      active_items: updatedItems,
    };

    await triggerRecalculate(nextInvoice);
    addToast(`Applied audited total ₹${auditedVal} to row #${index + 1}!`, 'success');
  };

  // 6. Auto-Fix All Math Errors
  const handleFixAllMathErrors = async () => {
    if (!invoice?.active_items) return;
    const updatedItems = invoice.active_items.map((item) => {
      const auditedVal = item.audited_line_total ?? (Number(item.quantity || 0) * Number(item.unit_price || 0));
      return {
        ...item,
        written_line_total: auditedVal,
        has_math_error: false,
        math_discrepancy: 0,
      };
    });

    const nextInvoice = {
      ...invoice,
      active_items: updatedItems,
    };

    await triggerRecalculate(nextInvoice);
    addToast('All arithmetic discrepancies fixed to audited values!', 'success');
  };

  // 7. Restore Struck-out Item
  const handleRestoreStruckItem = async (struckIndex) => {
    const struckList = [...(invoice.struck_out_items || [])];
    const [restored] = struckList.splice(struckIndex, 1);

    const newItem = {
      line_number: (invoice.active_items || []).length + 1,
      raw_text_on_paper: restored.raw_text_on_paper || restored.raw_text || 'Restored Item',
      product_name_normalized: (restored.raw_text_on_paper || restored.raw_text || 'Restored Item').replace(/-\s*\d+.*$/, '').trim(),
      item_sector: invoice.detected_sector || profile.businessCategory || 'GROCERY',
      raw_quantity: '1 piece',
      quantity: 1.0,
      unit_uqc: 'PCS',
      standard_uqc: 'PCS',
      unit_price: restored.written_line_total || 100.0,
      written_line_total: restored.written_line_total || 100.0,
      audited_line_total: restored.written_line_total || 100.0,
      has_math_error: false,
      math_discrepancy: 0.0,
      hsn_code: '1101',
      category_description: 'Restored Item',
      gst_rate: 5.0,
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      cgst_amount: Math.round((restored.written_line_total || 100.0) * 0.025 * 100) / 100,
      sgst_amount: Math.round((restored.written_line_total || 100.0) * 0.025 * 100) / 100,
      total_with_tax: Math.round((restored.written_line_total || 100.0) * 1.05 * 100) / 100,
      confidence: 0.95,
    };

    const nextInvoice = {
      ...invoice,
      active_items: [...(invoice.active_items || []), newItem],
      struck_out_items: struckList,
    };

    await triggerRecalculate(nextInvoice);
    addToast(`Restored '${restored.raw_text_on_paper || restored.raw_text}' to active ledger`, 'info');
  };

  // 8. Add New Manual Item
  const handleAddItem = async () => {
    const newItem = {
      line_number: (invoice.active_items || []).length + 1,
      row_id: (invoice.active_items || []).length + 1,
      raw_text_on_paper: 'Manual Item Entry',
      raw_text: 'Manual Item Entry',
      product_name_normalized: 'New Item',
      item_sector: invoice.detected_sector || profile.businessCategory || 'GROCERY',
      raw_quantity: '1 PCS',
      quantity: 1.0,
      unit_uqc: 'PCS',
      standard_uqc: 'PCS',
      unit_price: 100.0,
      written_line_total: 100.0,
      audited_line_total: 100.0,
      has_math_error: false,
      math_discrepancy: 0.0,
      hsn_code: '9999',
      category_description: 'General Supply',
      gst_rate: 5.0,
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      cgst_amount: 2.5,
      sgst_amount: 2.5,
      total_with_tax: 105.0,
      final_line_total_with_gst: 105.0,
      confidence: 1.0,
    };

    const nextInvoice = {
      ...invoice,
      active_items: [...(invoice.active_items || []), newItem],
    };

    await triggerRecalculate(nextInvoice);
    addToast('Added new line item to ledger', 'info');
  };

  // 9. Delete Line Item with Undo Toast
  const handleDeleteItem = async (index) => {
    if (!invoice?.active_items) return;
    const deletedItem = invoice.active_items[index];
    const updated = [...invoice.active_items];
    updated.splice(index, 1);
    
    const nextInvoice = {
      ...invoice,
      active_items: updated,
    };
    
    await triggerRecalculate(nextInvoice);

    const itemName = deletedItem.product_name_normalized || deletedItem.raw_text_on_paper || 'Item';
    addToast(
      `Removed "${itemName}"`,
      'info',
      '',
      {
        label: 'Undo',
        onClick: async () => {
          const restoredItems = [...(nextInvoice.active_items || [])];
          restoredItems.splice(index, 0, deletedItem);
          await triggerRecalculate({
            ...nextInvoice,
            active_items: restoredItems,
          });
          addToast(`Restored "${itemName}"`, 'success');
        },
      }
    );
  };

  // 10. Open HSN Search Modal
  const handleOpenHsnSearch = (rowIndex) => {
    setHsnSearchRowIndex(rowIndex);
    setIsHsnSearchOpen(true);
  };

  // 11. Select HSN from Modal
  const handleSelectHsn = async (rowIndex, hsnObj) => {
    if (rowIndex === null || !invoice.active_items) return;
    const updated = [...invoice.active_items];
    updated[rowIndex] = {
      ...updated[rowIndex],
      hsn_code: hsnObj.hsn,
      category_description: hsnObj.description,
      hsn_description: hsnObj.description,
      gst_rate: hsnObj.rate,
    };
    const nextInvoice = { ...invoice, active_items: updated };
    await triggerRecalculate(nextInvoice);
    addToast(`Assigned HSN ${hsnObj.hsn} (${hsnObj.rate}% GST)`, 'success');
  };

  // 12. Export GSTR-1 Payload
  const handleExportGstr1 = async () => {
    const { data } = await exportGstr1Api(invoice);
    setGstr1Data(data);
    setIsGstr1ModalOpen(true);
  };

  if (!hasScannedInvoice) {
    return (
      <>
        <LandingPage
          onScanImage={handleScanImage}
          isScanning={isScanning}
          scanStep={scanStep}
          error={error}
          scanSuccess={scanSuccess}
          scannedItemCount={invoice?.active_items?.length || 4}
          onViewDashboard={() => setHasScannedInvoice(true)}
          onResetScan={() => {
            setError(null);
            setScanSuccess(false);
          }}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenHistory={() => setIsProfileModalOpen(true)}
          onLogout={() => addToast('Logged out of TrueTax AI session.', 'info')}
        />

        {/* Global Modals & Notifications accessible from Landing Page */}
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

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] dark:bg-[#0B0E14] text-[#111827] dark:text-[#F3F4F6] transition-colors">
      {/* Top Navigation & Command Header with TrueTax AI Branding & Open Bills Switcher */}
      <Header
        invoice={invoice}
        onLoadPreset={handleLoadPreset}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenHistory={() => {
          if (!hasScannedInvoice && recentScansRef.current) {
            recentScansRef.current.scrollIntoView({ behavior: 'smooth' });
          } else {
            setHasScannedInvoice(false);
          }
        }}
        onLogout={() => {
          addToast('Logged out of TrueTax AI session.', 'info');
        }}
        isRecalculating={isRecalculating}
        backendStatus={backendStatus}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        hasScannedInvoice={hasScannedInvoice}
        onScanNewBill={() => setHasScannedInvoice(false)}
      />

      {/* Main Workspace: Full Split-Screen Audit Dashboard */}
      <main className="flex-1 w-full flex flex-col justify-start">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-4 transition-all duration-500 animate-fadeIn">
            {/* 1. Live Summary KPI Cards (Handwritten Total, Taxable Value, GST Collected, Final Total Hero Card) */}
            <SummaryCards invoice={invoice} />

            {/* 2. Review Alert Bar (Math discrepancies, Fix all, Dynamic rules, Struck-out items) */}
            <AlertBar
              invoice={invoice}
              onFixAll={handleFixAllMathErrors}
              onRestoreStruckItem={handleRestoreStruckItem}
            />

            {/* 3. Invoice Details Strip (Buyer Name, Buyer GSTIN, POS, Invoice No, Date) */}
            <InvoiceDetailsStrip
              invoice={invoice}
              onInvoiceChange={setInvoice}
            />

            {/* 4. Split-Screen Workspace: Visual Inspector + Ledger Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (about 35% ~ col-span-5): Visual Inspector (Desktop sticky, Mobile drawer) */}
              <div className="hidden lg:block lg:col-span-5 sticky top-20">
                <VisualInspector
                  invoice={invoice}
                  hoveredRowIndex={hoveredRowIndex}
                  onScanImage={handleScanImage}
                  isScanning={isScanning}
                />
              </div>

              {/* Right Column (about 65% ~ col-span-7): Interactive Line-Item GST Ledger Table */}
              <div className="col-span-1 lg:col-span-7">
                <LedgerTable
                  invoice={invoice}
                  onItemChange={handleItemChange}
                  onFixSingleMathError={handleFixSingleMathError}
                  onOpenHsnSearch={handleOpenHsnSearch}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                  hoveredRowIndex={hoveredRowIndex}
                  setHoveredRowIndex={setHoveredRowIndex}
                  isRecalculating={isRecalculating}
                />
              </div>
            </div>
          </div>
      </main>

      {/* Floating Action Button (FAB) for Mobile: Opens Slide-Up Visual Inspector Drawer */}
      <button
        type="button"
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full px-4 py-3 shadow-xl flex items-center gap-2 text-xs font-black cursor-pointer border border-emerald-400/40"
        aria-label="Open Visual Inspector Receipt Drawer"
      >
        <Eye className="h-4 w-4" />
        <span>Inspect Bill (OpenCV)</span>
      </button>

      {/* Mobile Slide-Up Drawer for Visual Inspector */}
      {isMobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-label="Visual Inspector Drawer"
        >
          <div className="bg-white dark:bg-[#131822] rounded-t-3xl max-h-[90vh] overflow-y-auto p-4 border-t border-[#E7E2DA] dark:border-zinc-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E2DA] dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Eye className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Visual Inspector (OpenCV CLAHE)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <VisualInspector
              invoice={invoice}
              hoveredRowIndex={hoveredRowIndex}
              onScanImage={handleScanImage}
              isScanning={isScanning}
              onCloseDrawer={() => setIsMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar (Stage 2) */}
      <ActionBar
        invoice={invoice}
        onExportGstr1={handleExportGstr1}
        onPreviewInvoice={() => setIsPakkaModalOpen(true)}
        onGenerateInvoice={() => setIsPakkaModalOpen(true)}
        isRecalculating={isRecalculating}
      />

      {/* Footer */}
      <footer className="border-t border-[#E5E0D8] dark:border-zinc-800/80 bg-white dark:bg-[#12151C] py-3 px-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>
          <strong>TrueTax AI</strong> • Problem #25 Vernacular OCR to GST Tax Invoice • ClearTax & Razorpay FinTech Architecture
        </p>
      </footer>

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSaved={(newProf) => {
          setProfile(newProf);
          addToast('Profile & tax credentials saved successfully!', 'success');
        }}
      />

      <PakkaInvoiceModal
        isOpen={isPakkaModalOpen}
        onClose={() => setIsPakkaModalOpen(false)}
        invoice={invoice}
        onExportGstr1={handleExportGstr1}
      />

      <Gstr1Modal
        isOpen={isGstr1ModalOpen}
        onClose={() => setIsGstr1ModalOpen(false)}
        gstr1Data={gstr1Data}
        invoiceId={invoice?.invoice_id}
      />

      <ApiSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={() => testConnection().then((ok) => setBackendStatus(ok ? 'online' : 'offline'))}
      />

      <HsnSearchModal
        isOpen={isHsnSearchOpen}
        onClose={() => setIsHsnSearchOpen(false)}
        rowIndex={hsnSearchRowIndex}
        currentHsn={
          hsnSearchRowIndex !== null && invoice?.active_items
            ? invoice.active_items[hsnSearchRowIndex]?.hsn_code
            : null
        }
        onSelectHsn={handleSelectHsn}
      />
    </div>
  );
}
