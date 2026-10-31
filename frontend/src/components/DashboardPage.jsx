import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import Header from './Header';
import SummaryCards from './SummaryCards';
import AlertBar from './AlertBar';
import InvoiceDetailsStrip from './InvoiceDetailsStrip';
import VisualInspector from './VisualInspector';
import LedgerTable from './LedgerTable';
import ActionBar from './ActionBar';
import PakkaInvoiceModal from './PakkaInvoiceModal';
import Gstr1Modal from './Gstr1Modal';
import ApiSettingsModal from './ApiSettingsModal';
import HsnSearchModal from './HsnSearchModal';
import ProfileModal from './ProfileModal';
import Toast from './Toast';
import VerificationQueue from './VerificationQueue';
import { useBills } from '../context/BillsContext';
import { useTheme } from '../context/ThemeContext';
import { loadProfile, addRecentScan } from '../utils/profileStorage';
import {
  parseInvoiceApi,
  recalculateInvoiceApi,
  exportGstr1Api,
  testConnection,
  getNextInvoiceNumberApi,
} from '../services/api';
import { Eye, X } from 'lucide-react';

export default function DashboardPage() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { getBill, updateBill } = useBills();
  const { darkMode, toggleDarkMode } = useTheme();

  const currentInvoice = getBill(billId);

  // Local UI-only state (drawer, hovered row, modals)
  const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [backendStatus, setBackendStatus] = useState('offline');

  // Modals and Toasts
  const [profile, setProfile] = useState(loadProfile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPakkaModalOpen, setIsPakkaModalOpen] = useState(false);
  const [isGstr1ModalOpen, setIsGstr1ModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHsnSearchOpen, setIsHsnSearchOpen] = useState(false);
  const [hsnSearchRowIndex, setHsnSearchRowIndex] = useState(null);
  const [gstr1Data, setGstr1Data] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Update document.title per route specification: "Audit · INV-xxxx · TrueTax AI"
  useEffect(() => {
    const id = currentInvoice?.invoice_id || billId;
    if (id) {
      document.title = `Audit · ${id} · TrueTax AI`;
    }
  }, [currentInvoice?.invoice_id, billId]);

  // Backend connection status check
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

  // Recalculate helper with immediate context & localStorage sync
  const triggerRecalculate = useCallback(
    async (nextInvoice) => {
      setIsRecalculating(true);
      updateBill(nextInvoice);
      try {
        const { data } = await recalculateInvoiceApi(nextInvoice);
        updateBill(data);
        return data;
      } catch (err) {
        console.error('Recalculate error:', err);
        return nextInvoice;
      } finally {
        setIsRecalculating(false);
      }
    },
    [updateBill]
  );

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

  // Handle re-scanning image inside Visual Inspector
  const handleScanImage = async (fileBlob, previewDataUrl, bypassCache) => {
    setIsScanning(true);
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
      addToast('Bill scanned and audited successfully!', 'success', 'Scan Complete');
    } catch (err) {
      addToast(`Failed to scan invoice: ${err.message}`, 'error', 'Scan Error');
    } finally {
      setIsScanning(false);
    }
  };

  // Edit Line Item Field
  const handleItemChange = async (index, field, value) => {
    if (!currentInvoice?.active_items) return;
    const updatedItems = [...currentInvoice.active_items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    const nextInvoice = {
      ...currentInvoice,
      active_items: updatedItems,
    };

    await triggerRecalculate(nextInvoice);
  };

  // Fix Single Row Math Error
  const handleFixSingleMathError = async (index) => {
    if (!currentInvoice?.active_items) return;
    const updatedItems = [...currentInvoice.active_items];
    const item = updatedItems[index];
    const auditedVal =
      item.audited_line_total ?? Number(item.quantity || 0) * Number(item.unit_price || 0);

    updatedItems[index] = {
      ...item,
      written_line_total: auditedVal,
      has_math_error: false,
      math_discrepancy: 0,
    };

    const nextInvoice = {
      ...currentInvoice,
      active_items: updatedItems,
    };

    await triggerRecalculate(nextInvoice);
    addToast(`Applied audited total ₹${auditedVal} to row #${index + 1}!`, 'success');
  };

  // Auto-Fix All Math Errors
  const handleFixAllMathErrors = async () => {
    if (!currentInvoice?.active_items) return;
    const updatedItems = currentInvoice.active_items.map((item) => {
      const auditedVal =
        item.audited_line_total ?? Number(item.quantity || 0) * Number(item.unit_price || 0);
      return {
        ...item,
        written_line_total: auditedVal,
        has_math_error: false,
        math_discrepancy: 0,
      };
    });

    const nextInvoice = {
      ...currentInvoice,
      active_items: updatedItems,
    };

    await triggerRecalculate(nextInvoice);
    addToast('All arithmetic discrepancies fixed to audited values!', 'success');
  };

  // Restore Struck-out Item
  const handleRestoreStruckItem = async (struckIndex) => {
    const struckList = [...(currentInvoice.struck_out_items || [])];
    const [restored] = struckList.splice(struckIndex, 1);

    const newItem = {
      line_number: (currentInvoice.active_items || []).length + 1,
      raw_text_on_paper: restored.raw_text_on_paper || restored.raw_text || 'Restored Item',
      product_name_normalized: (restored.raw_text_on_paper || restored.raw_text || 'Restored Item')
        .replace(/-\s*\d+.*$/, '')
        .trim(),
      item_sector: currentInvoice.detected_sector || profile.businessCategory || 'GROCERY',
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
      ...currentInvoice,
      active_items: [...(currentInvoice.active_items || []), newItem],
      struck_out_items: struckList,
    };

    await triggerRecalculate(nextInvoice);
    addToast(
      `Restored '${restored.raw_text_on_paper || restored.raw_text}' to active ledger`,
      'info'
    );
  };

  // Add New Manual Item
  const handleAddItem = async () => {
    const newItem = {
      line_number: (currentInvoice.active_items || []).length + 1,
      row_id: (currentInvoice.active_items || []).length + 1,
      raw_text_on_paper: 'Manual Item Entry',
      raw_text: 'Manual Item Entry',
      product_name_normalized: 'New Item',
      item_sector: currentInvoice.detected_sector || profile.businessCategory || 'GROCERY',
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
      ...currentInvoice,
      active_items: [...(currentInvoice.active_items || []), newItem],
    };

    await triggerRecalculate(nextInvoice);
    addToast('Added new line item to ledger', 'info');
  };

  // Delete Line Item with Undo Toast
  const handleDeleteItem = async (index) => {
    if (!currentInvoice?.active_items) return;
    const deletedItem = currentInvoice.active_items[index];
    const updated = [...currentInvoice.active_items];
    updated.splice(index, 1);

    const nextInvoice = {
      ...currentInvoice,
      active_items: updated,
    };

    await triggerRecalculate(nextInvoice);

    const itemName = deletedItem.product_name_normalized || deletedItem.raw_text_on_paper || 'Item';
    addToast(`Removed "${itemName}"`, 'info', '', {
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
    });
  };

  // Invoice Details Strip change
  const handleInvoiceChange = (newDetails) => {
    updateBill(newDetails);
    triggerRecalculate(newDetails);
  };

  // Toggle Line Item Strike-Out (pen scratch / cancelled line)
  const handleToggleStrikeOut = async (index) => {
    if (!currentInvoice?.active_items) return;
    const updated = [...currentInvoice.active_items];
    const item = updated[index];
    const isStruck = !Boolean(item.is_struck_out || item.struck_out);
    updated[index] = {
      ...item,
      is_struck_out: isStruck,
      struck_out: isStruck,
    };
    const nextInv = {
      ...currentInvoice,
      active_items: updated,
    };
    await triggerRecalculate(nextInv);
    addToast(isStruck ? 'Line item struck out and excluded from tax.' : 'Line item restored.', 'info');
  };

  // 1-Click Verification Queue Doubt Resolvers
  const handleAllocateLumpsum = async (doubt) => {
    if (!currentInvoice) return;
    const items = currentInvoice.active_items || [];
    const unpriced = items.filter((it) => !it.unit_price || it.unit_price === 0);
    const targetAmt = doubt?.target_amount || currentInvoice.summary?.written_grand_total || 0;
    if (unpriced.length > 0 && targetAmt > 0) {
      const share = targetAmt / unpriced.length;
      const updated = items.map((it) => {
        if (!it.unit_price || it.unit_price === 0) {
          const q = it.quantity || 1;
          return {
            ...it,
            unit_price: parseFloat((share / q).toFixed(2)),
            written_line_total: parseFloat(share.toFixed(2)),
          };
        }
        return it;
      });
      const nextInv = {
        ...currentInvoice,
        active_items: updated,
        pending_doubts: (currentInvoice.pending_doubts || []).filter(
          (d) => d.code !== 'UNALLOCATED_LUMPSUM_TOTAL'
        ),
      };
      await triggerRecalculate(nextInv);
      addToast(`Allocated ₹${targetAmt.toFixed(2)} evenly across unpriced lines.`, 'success');
    }
  };

  const handleAssignNextInvoiceNumber = async () => {
    if (!currentInvoice) return;
    try {
      const suppKey = currentInvoice.supplier_gstin || 'DEFAULT';
      const { data } = await getNextInvoiceNumberApi(suppKey, currentInvoice.financial_year);
      if (data?.next_invoice_number) {
        const nextInv = {
          ...currentInvoice,
          invoice_id: data.next_invoice_number,
          bill_number: data.next_invoice_number,
          financial_year: data.financial_year || currentInvoice.financial_year,
          pending_doubts: (currentInvoice.pending_doubts || []).filter(
            (d) => d.code !== 'DUPLICATE_FY_INVOICE_NUMBER' && d.code !== 'MISSING_INVOICE_NUMBER'
          ),
        };
        await triggerRecalculate(nextInv);
        addToast(`Assigned next invoice #${data.next_invoice_number}`, 'success');
      }
    } catch (err) {
      console.error('Failed to get next invoice number:', err);
    }
  };

  const handleDismissDoubt = (code) => {
    if (!currentInvoice) return;
    const nextInv = {
      ...currentInvoice,
      pending_doubts: (currentInvoice.pending_doubts || []).filter((d) => d.code !== code),
    };
    updateBill(nextInv);
  };

  // Open HSN Search Modal
  const handleOpenHsnSearch = (rowIndex) => {
    setHsnSearchRowIndex(rowIndex);
    setIsHsnSearchOpen(true);
  };

  // Select HSN from Modal
  const handleSelectHsn = async (rowIndex, hsnObj) => {
    if (rowIndex === null || !currentInvoice.active_items) return;
    const updated = [...currentInvoice.active_items];
    updated[rowIndex] = {
      ...updated[rowIndex],
      hsn_code: hsnObj.hsn,
      category_description: hsnObj.description,
      hsn_description: hsnObj.description,
      gst_rate: hsnObj.rate,
    };
    const nextInvoice = { ...currentInvoice, active_items: updated };
    await triggerRecalculate(nextInvoice);
    addToast(`Assigned HSN ${hsnObj.hsn} (${hsnObj.rate}% GST)`, 'success');
  };

  // Export GSTR-1 Payload
  const handleExportGstr1 = async () => {
    const { data } = await exportGstr1Api(currentInvoice);
    setGstr1Data(data);
    setIsGstr1ModalOpen(true);
  };

  // If the billId does not exist, redirect to /dashboard (which routes to latest bill)
  if (!currentInvoice) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] dark:bg-[#0B0E14] text-[#111827] dark:text-[#F3F4F6] transition-colors">
      {/* Top Navigation & Command Header with TrueTax AI Branding & Open Bills Switcher */}
      <Header
        invoice={currentInvoice}
        onLoadPreset={(preset) => navigate(`/dashboard/${preset.data.invoice_id}`)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenHistory={() => setIsProfileModalOpen(true)}
        onLogout={() => addToast('Logged out of TrueTax AI session.', 'info')}
        isRecalculating={isRecalculating}
        backendStatus={backendStatus}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onScanNewBill={() => navigate('/')}
      />

      {/* Main Workspace: Full Split-Screen Audit Dashboard */}
      <main className="flex-1 w-full flex flex-col justify-start">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-4 transition-all duration-500 animate-fadeIn">
          {/* 1. Live Summary KPI Cards */}
          <SummaryCards invoice={currentInvoice} />

          {/* 2. Review Alert Bar */}
          <AlertBar
            invoice={currentInvoice}
            onFixAll={handleFixAllMathErrors}
            onRestoreStruckItem={handleRestoreStruckItem}
          />

          {/* 2.5 Structured Verification Queue for Pending Doubts */}
          <VerificationQueue
            doubts={currentInvoice?.pending_doubts || []}
            onAllocateLumpsum={handleAllocateLumpsum}
            onAcceptAuditedTotal={handleFixAllMathErrors}
            onAssignNextInvoiceNumber={handleAssignNextInvoiceNumber}
            onDismissDoubt={handleDismissDoubt}
          />

          {/* 3. Invoice Details Strip */}
          <InvoiceDetailsStrip
            invoice={currentInvoice}
            onInvoiceChange={handleInvoiceChange}
          />

          {/* 4. Split-Screen Workspace: Visual Inspector + Ledger Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (about 35%): Visual Inspector */}
            <div className="hidden lg:block lg:col-span-5 sticky top-20">
              <VisualInspector
                invoice={currentInvoice}
                hoveredRowIndex={hoveredRowIndex}
                onScanImage={handleScanImage}
                isScanning={isScanning}
              />
            </div>

            {/* Right Column (about 65%): Interactive Line-Item GST Ledger Table */}
            <div className="col-span-1 lg:col-span-7">
              <LedgerTable
                invoice={currentInvoice}
                onItemChange={handleItemChange}
                onFixSingleMathError={handleFixSingleMathError}
                onOpenHsnSearch={handleOpenHsnSearch}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
                onToggleStrikeOut={handleToggleStrikeOut}
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
              invoice={currentInvoice}
              hoveredRowIndex={hoveredRowIndex}
              onScanImage={handleScanImage}
              isScanning={isScanning}
              onCloseDrawer={() => setIsMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      <ActionBar
        invoice={currentInvoice}
        onExportGstr1={handleExportGstr1}
        onPreviewInvoice={() => setIsPakkaModalOpen(true)}
        onGenerateInvoice={() => setIsPakkaModalOpen(true)}
        isRecalculating={isRecalculating}
      />

      {/* Footer */}
      <footer className="border-t border-[#E5E0D8] dark:border-zinc-800/80 bg-white dark:bg-[#12151C] py-3 px-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>
          <strong>TrueTax AI</strong> • Problem #25 Vernacular OCR to GST Tax Invoice • ClearTax &amp; Razorpay FinTech Architecture
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
        invoice={currentInvoice}
        onExportGstr1={handleExportGstr1}
      />

      <Gstr1Modal
        isOpen={isGstr1ModalOpen}
        onClose={() => setIsGstr1ModalOpen(false)}
        gstr1Data={gstr1Data}
        invoiceId={currentInvoice?.invoice_id}
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
          hsnSearchRowIndex !== null && currentInvoice?.active_items
            ? currentInvoice.active_items[hsnSearchRowIndex]?.hsn_code
            : null
        }
        onSelectHsn={handleSelectHsn}
      />
    </div>
  );
}
