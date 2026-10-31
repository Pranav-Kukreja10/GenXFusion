import React, { useMemo } from 'react';
import {
  User,
  Hash,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

const STATES = [
  { code: '07', name: '07 - Delhi' },
  { code: '03', name: '03 - Punjab' },
  { code: '06', name: '06 - Haryana' },
  { code: '08', name: '08 - Rajasthan' },
  { code: '09', name: '09 - Uttar Pradesh' },
  { code: '27', name: '27 - Maharashtra' },
  { code: '24', name: '24 - Gujarat' },
  { code: '19', name: '19 - West Bengal' },
  { code: '33', name: '33 - Tamil Nadu' },
  { code: '29', name: '29 - Karnataka' },
];

export default function InvoiceDetailsStrip({ invoice, onInvoiceChange }) {
  const buyerGstin = invoice?.buyer_gstin || '';
  
  // 15-character GSTIN validation with visual tick or error
  const gstinStatus = useMemo(() => {
    if (!buyerGstin) {
      return { isValid: true, isUnregistered: true, message: 'Unregistered B2C Buyer' };
    }
    const clean = buyerGstin.trim().toUpperCase();
    if (clean.length === 15) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (gstinRegex.test(clean)) {
        return { isValid: true, isUnregistered: false, message: '15-char Valid GSTIN' };
      }
    }
    return { isValid: false, isUnregistered: false, message: `15 chars required (${clean.length}/15)` };
  }, [buyerGstin]);

  const handleFieldChange = (field, value) => {
    if (!invoice || !onInvoiceChange) return;
    onInvoiceChange({
      ...invoice,
      [field]: value,
    });
  };

  const currentPos = invoice?.pos || invoice?.buyer_state_code || '07';

  return (
    <div
      className="bg-white dark:bg-[#131822] border border-[#E7E2DA] dark:border-[#232B3A] rounded-2xl p-3 sm:p-4 shadow-xs text-xs space-y-2 transition-colors"
      role="region"
      aria-label="Invoice Identification & Buyer Metadata"
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-[#E7E2DA]/80 dark:border-zinc-800">
        <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>Invoice Details Strip</span>
        </span>
        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
          GSTN Schema v3.1 Compliant
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
        {/* 1. Buyer Name */}
        <div>
          <label
            htmlFor="buyer-name-input"
            className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1"
          >
            <User className="h-3 w-3 text-slate-400" /> Buyer Name
          </label>
          <input
            id="buyer-name-input"
            type="text"
            value={invoice?.buyer_name ?? 'Sharma Kirana & General Store'}
            onChange={(e) => handleFieldChange('buyer_name', e.target.value)}
            placeholder="Buyer / Store Name"
            className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-xs transition-all"
          />
        </div>

        {/* 2. Buyer GSTIN (15-character validation with tick or error) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="buyer-gstin-input"
              className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"
            >
              <Hash className="h-3 w-3 text-slate-400" /> Buyer GSTIN
            </label>
            {buyerGstin ? (
              gstinStatus.isValid ? (
                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" /> Valid
                </span>
              ) : (
                <span className="text-[9px] font-bold text-red-600 dark:text-red-400 inline-flex items-center gap-0.5 animate-pulse">
                  <AlertCircle className="h-2.5 w-2.5" /> 15-char error
                </span>
              )
            ) : (
              <span className="text-[9px] font-medium text-slate-400">Optional (B2C)</span>
            )}
          </div>
          <div className="relative">
            <input
              id="buyer-gstin-input"
              type="text"
              maxLength={15}
              value={buyerGstin}
              onChange={(e) => handleFieldChange('buyer_gstin', e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
              placeholder="e.g. 07AAAAA0000A1Z5"
              className={`w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border rounded-lg px-2.5 py-1.5 font-mono uppercase font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 text-xs transition-all ${
                !buyerGstin
                  ? 'border-[#D5CEC3] dark:border-zinc-700 focus:ring-emerald-600'
                  : gstinStatus.isValid
                  ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 focus:ring-emerald-600 text-emerald-900 dark:text-emerald-200'
                  : 'border-red-400 bg-red-50/20 dark:bg-red-950/20 focus:ring-red-500 text-red-900 dark:text-red-200'
              }`}
            />
            {buyerGstin && gstinStatus.isValid && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* 3. Place of Supply */}
        <div>
          <label
            htmlFor="pos-select"
            className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1"
          >
            <MapPin className="h-3 w-3 text-slate-400" /> Place of Supply
          </label>
          <select
            id="pos-select"
            value={currentPos}
            onChange={(e) => {
              handleFieldChange('pos', e.target.value);
              handleFieldChange('buyer_state_code', e.target.value);
            }}
            className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-xs cursor-pointer"
          >
            {STATES.map((st) => (
              <option key={st.code} value={st.code}>
                {st.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Invoice No. */}
        <div>
          <label
            htmlFor="invoice-no-input"
            className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1"
          >
            <Hash className="h-3 w-3 text-slate-400" /> Invoice No.
          </label>
          <input
            id="invoice-no-input"
            type="text"
            value={invoice?.invoice_id || 'INV-2026-2260'}
            onChange={(e) => handleFieldChange('invoice_id', e.target.value)}
            className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-xs"
          />
        </div>

        {/* 5. Invoice Date */}
        <div>
          <label
            htmlFor="invoice-date-input"
            className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1"
          >
            <Calendar className="h-3 w-3 text-slate-400" /> Invoice Date
          </label>
          <input
            id="invoice-date-input"
            type="date"
            value={invoice?.normalized_date_iso || '2026-10-31'}
            onChange={(e) => handleFieldChange('normalized_date_iso', e.target.value)}
            className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
