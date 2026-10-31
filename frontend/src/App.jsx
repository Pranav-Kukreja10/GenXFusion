import React, { useState, useEffect, useCallback } from 'react';
import HeaderCommandBar from './components/HeaderCommandBar';
import ScannerDropzone from './components/ScannerDropzone';
import InvoiceEditorTable from './components/InvoiceEditorTable';
import AuditAlertsCard from './components/AuditAlertsCard';
import PakkaInvoiceModal from './components/PakkaInvoiceModal';
import Gstr1Modal from './components/Gstr1Modal';
import ApiSettingsModal from './components/ApiSettingsModal';
import HsnSearchModal from './components/HsnSearchModal';
import { DEMO_PRESETS } from './utils/mockPresets';
import {
  parseInvoiceApi,
  recalculateInvoiceApi,
  exportGstr1Api,
  testConnection,
} from './services/api';
import { Download, Printer, ShieldCheck } from 'lucide-react';

export default function App() {
  const [invoice, setInvoice] = useState(DEMO_PRESETS[0].data);
  const [isScanning, setIsScanning] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('offline');

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

  // Modals state
  const [isPakkaModalOpen, setIsPakkaModalOpen] = useState(false);
  const [isGstr1ModalOpen, setIsGstr1ModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHsnSearchOpen, setIsHsnSearchOpen] = useState(false);
  const [hsnSearchRowIndex, setHsnSearchRowIndex] = useState(null);
  const [gstr1Data, setGstr1Data] = useState(null);

  // Check backend health
  useEffect(() => {
    async function checkHealth() {
      const ok = await testConnection();
      setBackendStatus(ok ? 'online' : 'offline');
    }
    checkHealth();
  }, []);

  // Recalculate helper
  const triggerRecalculate = useCallback(async (currentInvoice) => {
    setIsRecalculating(true);
    try {
      const { data } = await recalculateInvoiceApi(currentInvoice);
      setInvoice(data);
    } catch (err) {
      console.error('Recalculate error:', err);
    } finally {
      setIsRecalculating(false);
    }
  }, []);

  // 1. Handle File / Photo Scan
  const handleScanImage = async (fileBlob, previewDataUrl, bypassCache) => {
    setIsScanning(true);
    setError(null);
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
        setError(
          `FastAPI backend offline (${apiErr}). Running local deterministic auditor.`
        );
      }

      await triggerRecalculate(nextInvoice);
    } catch (err) {
      setError(`Failed to scan invoice: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // 2. Load Demo Preset
  const handleLoadPreset = async (preset) => {
    setError(null);
    await triggerRecalculate(preset.data);
  };

  // 3. Edit Line Item Field
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

  // 4. Fix Single Row Math Error
  const handleFixSingleMathError = async (index) => {
    if (!invoice?.active_items) return;
    const updatedItems = [...invoice.active_items];
    const item = updatedItems[index];
    updatedItems[index] = {
      ...item,
      written_line_total: item.audited_line_total,
      has_math_error: false,
      math_discrepancy: 0,
    };

    const nextInvoice = {
      ...invoice,
      active_items: updatedItems,
    };

    await triggerRecalculate(nextInvoice);
  };

  // 5. Auto-Fix All Math Errors
  const handleFixAllMathErrors = async () => {
    if (!invoice?.active_items) return;
    const updatedItems = invoice.active_items.map((item) => ({
      ...item,
      written_line_total: item.audited_line_total,
      has_math_error: false,
      math_discrepancy: 0,
    }));

    const nextInvoice = {
      ...invoice,
      active_items: updatedItems,
    };

    await triggerRecalculate(nextInvoice);
  };

  // 6. Restore Struck-out Item
  const handleRestoreStruckItem = async (struckIndex) => {
    const struckList = [...(invoice.struck_out_items || [])];
    const [restored] = struckList.splice(struckIndex, 1);

    const newItem = {
      line_number: (invoice.active_items || []).length + 1,
      raw_text_on_paper: restored.raw_text_on_paper,
      product_name_normalized: restored.raw_text_on_paper.replace(/-\s*\d+.*$/, '').trim(),
      item_sector: invoice.detected_sector || 'GROCERY',
      raw_quantity: '1 piece',
      quantity: 1.0,
      unit_uqc: 'PCS',
      unit_price: 90.0,
      written_line_total: 90.0,
      audited_line_total: 90.0,
      has_math_error: false,
      math_discrepancy: 0.0,
      hsn_code: '1101',
      hsn_description: 'Restored from Struck-out Item',
      gst_rate: 5.0,
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      cgst_amount: 2.25,
      sgst_amount: 2.25,
      final_line_total_with_gst: 94.5,
      confidence_score: 0.88,
    };

    const nextInvoice = {
      ...invoice,
      active_items: [...(invoice.active_items || []), newItem],
      struck_out_items: struckList,
    };

    await triggerRecalculate(nextInvoice);
  };

  // 7. Add New Manual Item
  const handleAddItem = async () => {
    const newItem = {
      line_number: (invoice.active_items || []).length + 1,
      raw_text_on_paper: 'Manual Item Entry',
      product_name_normalized: 'New Item',
      item_sector: invoice.detected_sector || 'GROCERY',
      raw_quantity: '1 nag',
      quantity: 1.0,
      unit_uqc: 'PCS',
      unit_price: 100.0,
      written_line_total: 100.0,
      audited_line_total: 100.0,
      has_math_error: false,
      math_discrepancy: 0.0,
      hsn_code: '9999',
      hsn_description: 'General Supply',
      gst_rate: 5.0,
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      cgst_amount: 2.5,
      sgst_amount: 2.5,
      final_line_total_with_gst: 105.0,
      confidence_score: 1.0,
    };

    const nextInvoice = {
      ...invoice,
      active_items: [...(invoice.active_items || []), newItem],
    };

    await triggerRecalculate(nextInvoice);
  };

  // 8. Delete Line Item
  const handleDeleteItem = async (index) => {
    const updated = [...(invoice.active_items || [])];
    updated.splice(index, 1);
    const nextInvoice = {
      ...invoice,
      active_items: updated,
    };
    await triggerRecalculate(nextInvoice);
  };

  // 9. Open HSN Search Modal
  const handleOpenHsnSearch = (rowIndex) => {
    setHsnSearchRowIndex(rowIndex);
    setIsHsnSearchOpen(true);
  };

  // 10. Select HSN from Modal
  const handleSelectHsn = async (rowIndex, hsnObj) => {
    if (rowIndex === null || !invoice.active_items) return;
    const updated = [...invoice.active_items];
    updated[rowIndex] = {
      ...updated[rowIndex],
      hsn_code: hsnObj.hsn,
      hsn_description: hsnObj.description,
      gst_rate: hsnObj.rate,
    };
    const nextInvoice = { ...invoice, active_items: updated };
    await triggerRecalculate(nextInvoice);
  };

  // 11. Export GSTR-1 Payload
  const handleExportGstr1 = async () => {
    const { data } = await exportGstr1Api(invoice);
    setGstr1Data(data);
    setIsGstr1ModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] dark:bg-[#0B0E14] text-[#111827] dark:text-[#F3F4F6] transition-colors">
      {/* Top Command Bar */}
      <HeaderCommandBar
        invoice={invoice}
        onLoadPreset={handleLoadPreset}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isRecalculating={isRecalculating}
        backendStatus={backendStatus}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Workspace Grid — Spacious Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column (35% Width): Visual Inspector & Metadata */}
          <section className="lg:col-span-4 h-full">
            <ScannerDropzone
              invoice={invoice}
              onInvoiceChange={setInvoice}
              onScanImage={handleScanImage}
              isScanning={isScanning}
              error={error}
            />
          </section>

          {/* Right Column (65% Width): KPI Cards, Alerts & Ledger */}
          <section className="lg:col-span-8 space-y-4">
            
            {/* KPI Cards & Discrepancy Alerts */}
            <AuditAlertsCard
              invoice={invoice}
              onFixAllMathErrors={handleFixAllMathErrors}
              onRestoreStruckItem={handleRestoreStruckItem}
            />

            {/* Interactive Line-Item GST Ledger */}
            <InvoiceEditorTable
              invoice={invoice}
              onItemChange={handleItemChange}
              onFixSingleMathError={handleFixSingleMathError}
              onOpenHsnSearch={handleOpenHsnSearch}
              onAddItem={handleAddItem}
              onDeleteItem={handleDeleteItem}
            />

            {/* Bottom Export Bar */}
            <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Deterministic GST Auditor: Compliant with GSTN Portal Schema v3.1</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportGstr1}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Download GSTR-1 JSON</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPakkaModalOpen(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Pakka Tax Invoice</span>
                </button>
              </div>
            </div>

          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E0D8] dark:border-zinc-800/80 bg-white dark:bg-[#12151C] py-3 px-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>
          <strong>ParchiSetu AI</strong> • Problem #25 Vernacular OCR to Pakka GST Formatter • ClearTax & Razorpay FinTech Architecture
        </p>
      </footer>

      {/* Modals */}
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
