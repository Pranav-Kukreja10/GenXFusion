import React, { useMemo } from 'react';
import {
  Building,
  Calendar,
  Hash,
  Languages,
  Tag,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  validateGstin,
  BUSINESS_CATEGORIES,
  BILL_LANGUAGES,
} from '../utils/profileStorage';

/**
 * Checks if raw handwritten date and ISO normalized date represent different dates.
 */
function checkDateMismatch(rawDate, isoDate) {
  if (!rawDate || !isoDate) return null;
  const rawStr = String(rawDate).trim();
  const isoStr = String(isoDate).trim();

  // Try parsing ISO date (YYYY-MM-DD)
  const isoParts = isoStr.split('-');
  if (isoParts.length !== 3) return null;
  const [isoYear, isoMonth, isoDay] = isoParts.map((p) => parseInt(p, 10));

  // Try extracting digits from raw date (e.g. 31/10/26 or 31-10-2026)
  const rawMatch = rawStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!rawMatch) return null;

  const rawDay = parseInt(rawMatch[1], 10);
  const rawMonth = parseInt(rawMatch[2], 10);
  let rawYear = parseInt(rawMatch[3], 10);
  if (rawYear < 100) rawYear += 2000;

  if (rawDay !== isoDay || rawMonth !== isoMonth || rawYear !== isoYear) {
    return {
      rawFormatted: `${rawDay.toString().padStart(2, '0')}/${rawMonth.toString().padStart(2, '0')}/${rawYear}`,
      isoFormatted: `${isoDay.toString().padStart(2, '0')}/${isoMonth.toString().padStart(2, '0')}/${isoYear}`,
    };
  }

  return null;
}

export default function MetadataForm({
  invoice,
  onInvoiceChange,
  isAutoFilled = false,
  userProfile = null,
}) {
  const gstinStatus = useMemo(
    () => validateGstin(invoice?.gstin || userProfile?.gstin || '03AABCU9603R1ZM'),
    [invoice?.gstin, userProfile?.gstin]
  );

  const dateMismatch = useMemo(
    () => checkDateMismatch(invoice?.raw_date_written, invoice?.normalized_date_iso),
    [invoice?.raw_date_written, invoice?.normalized_date_iso]
  );

  const handleFieldChange = (field, value) => {
    if (!invoice) return;
    onInvoiceChange({
      ...invoice,
      [field]: value,
    });
  };

  const handleCategoryChange = (category) => {
    if (!invoice) return;
    // Map business category to detected_sector expected by Lane 1 & 2
    const sectorMap = {
      Grocery: 'GROCERY',
      Pharmacy: 'MEDICAL',
      Electronics: 'ELECTRONICS',
      Apparel: 'TEXTILES',
      Hardware: 'HARDWARE',
      Restaurant: 'GROCERY',
      Other: 'GENERAL',
    };
    const mappedSector = sectorMap[category] || 'GENERAL';
    onInvoiceChange({
      ...invoice,
      business_category: category,
      detected_sector: mappedSector,
    });
  };

  const currentCategory =
    invoice?.business_category ||
    (invoice?.detected_sector === 'TEXTILES'
      ? 'Apparel'
      : invoice?.detected_sector === 'MEDICAL'
      ? 'Pharmacy'
      : invoice?.detected_sector === 'GROCERY'
      ? 'Grocery'
      : invoice?.detected_sector === 'HARDWARE'
      ? 'Hardware'
      : invoice?.detected_sector === 'ELECTRONICS'
      ? 'Electronics'
      : userProfile?.businessCategory || 'Grocery');

  const currentLanguage = invoice?.bill_language || userProfile?.billLanguage || 'Auto-detect';

  return (
    <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-2xl shadow-sm p-4 sm:p-5 space-y-4 text-xs transition-colors">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8] dark:border-zinc-800">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Bill Metadata & Tax Scope
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Validated for GST portal filings & HSN chapter classification
          </p>
        </div>

        {isAutoFilled && (
          <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
            <Sparkles className="h-3 w-3" /> Auto-filled by Vision
          </span>
        )}
      </div>

      {/* Date Discrepancy Warning Alert */}
      {dateMismatch && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-tight space-y-0.5">
            <p className="font-bold">Date Discrepancy Detected:</p>
            <p>
              Handwritten paper date (<strong>{dateMismatch.rawFormatted}</strong>) differs from the ISO filing date (<strong>{dateMismatch.isoFormatted}</strong>). Please verify the tax invoice period before GSTR-1 export.
            </p>
          </div>
        </div>
      )}

      {/* 1. Sector Feature: Business Category & Bill Language Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Tag className="h-3.5 w-3.5 text-emerald-600" /> Business Category (Sector)
          </label>
          <select
            value={currentCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            {BUSINESS_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Languages className="h-3.5 w-3.5 text-emerald-600" /> Bill Language
          </label>
          <select
            value={currentLanguage}
            onChange={(e) => handleFieldChange('bill_language', e.target.value)}
            className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-600 cursor-pointer"
          >
            {BILL_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. GSTIN with Live Validation */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Hash className="h-3.5 w-3.5 text-emerald-600" /> Supplier GSTIN
          </label>
          {gstinStatus.isValid ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Valid GSTIN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
              <AlertCircle className="h-3 w-3" /> 15-char required
            </span>
          )}
        </div>
        <input
          type="text"
          maxLength={15}
          value={invoice?.gstin || userProfile?.gstin || '03AABCU9603R1ZM'}
          onChange={(e) => handleFieldChange('gstin', e.target.value.toUpperCase())}
          placeholder="e.g. 03AABCU9603R1ZM"
          className={`w-full font-mono uppercase rounded-lg px-2.5 py-1.5 font-bold transition-all focus:outline-hidden text-xs ${
            gstinStatus.isValid
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500 text-slate-900 dark:text-white'
              : 'bg-red-50/40 dark:bg-red-950/20 border border-red-400 text-red-900 dark:text-red-100'
          }`}
        />
        {!gstinStatus.isValid && (
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
            {gstinStatus.message}
          </p>
        )}
      </div>

      {/* 3. Store / Merchant Name */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Building className="h-3.5 w-3.5 text-emerald-600" /> Store / Merchant Name
          </label>
          {invoice?.merchant_name && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
              ⚡ Auto-filled
            </span>
          )}
        </div>
        <input
          type="text"
          value={invoice?.merchant_name || ''}
          onChange={(e) => handleFieldChange('merchant_name', e.target.value)}
          placeholder="e.g. Sharma Kirana Store or Punjab Cloth House"
          className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-xs"
        />
      </div>

      {/* 4. Dates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" /> Raw Written Date
            </label>
            {invoice?.raw_date_written && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                ⚡ Auto-filled
              </span>
            )}
          </div>
          <input
            type="text"
            value={invoice?.raw_date_written || ''}
            onChange={(e) => handleFieldChange('raw_date_written', e.target.value)}
            placeholder="e.g. 31/10/26"
            className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-xs"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" /> ISO GST Date
            </label>
            {invoice?.normalized_date_iso && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                ⚡ Auto-filled
              </span>
            )}
          </div>
          <input
            type="date"
            value={invoice?.normalized_date_iso || ''}
            onChange={(e) => handleFieldChange('normalized_date_iso', e.target.value)}
            className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-xs"
          />
        </div>
      </div>

      {/* 5. Invoice ID */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Hash className="h-3.5 w-3.5 text-emerald-600" /> Invoice ID
          </label>
          {invoice?.invoice_id && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
              ⚡ Auto-filled
            </span>
          )}
        </div>
        <input
          type="text"
          value={invoice?.invoice_id || ''}
          onChange={(e) => handleFieldChange('invoice_id', e.target.value)}
          placeholder="e.g. INV-2026-8841"
          className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-xs"
        />
      </div>
    </div>
  );
}

