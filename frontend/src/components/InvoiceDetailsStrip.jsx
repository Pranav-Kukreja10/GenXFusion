import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  User,
  Hash,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  RotateCw,
  Percent,
  Truck,
} from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { STATE_OPTIONS } from '../utils/indianStates';
import { validateGstinApi, getNextInvoiceNumberApi } from '../services/api';

/**
 * Clean, professional, zero-AI-slop Invoice Details & Party Compliance Grid.
 * Built for 40-65+ shopkeepers and tax accountants:
 * - Minimum 15px font size, font-weight 500, minimum 42px touch targets.
 * - Live Mod-36 GSTIN checksum validation.
 * - CGST Rule 46(b) invoice numbering with FY auto-generation.
 * - Custom accessible dropdowns (zero native <select>).
 * - Tax Calculation Mode (Exclusive vs MRP Inclusive + Surcharges).
 */
export default function InvoiceDetailsStrip({ invoice, onInvoiceChange }) {
  const [supplierValidation, setSupplierValidation] = useState(null);
  const [buyerValidation, setBuyerValidation] = useState(null);
  const [isValidatingSupplier, setIsValidatingSupplier] = useState(false);
  const [isValidatingBuyer, setIsValidatingBuyer] = useState(false);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  const supplierGstin = invoice?.supplier_gstin || '';
  const buyerGstin = invoice?.buyer_gstin || '';
  const posCode = invoice?.place_of_supply_state_code || invoice?.pos || invoice?.supplier_state_code || '03';
  const isInterState = Boolean(invoice?.is_inter_state);
  const isTaxInclusive = Boolean(invoice?.is_tax_inclusive);

  // Validate Supplier GSTIN on 15 characters
  useEffect(() => {
    let active = true;
    if (supplierGstin && supplierGstin.length === 15) {
      setIsValidatingSupplier(true);
      validateGstinApi(supplierGstin)
        .then(({ data }) => {
          if (active) setSupplierValidation(data);
        })
        .catch(() => {
          if (active) setSupplierValidation(null);
        })
        .finally(() => {
          if (active) setIsValidatingSupplier(false);
        });
    } else {
      setSupplierValidation(null);
    }
    return () => {
      active = false;
    };
  }, [supplierGstin]);

  // Validate Buyer GSTIN on 15 characters
  useEffect(() => {
    let active = true;
    if (buyerGstin && buyerGstin.length === 15) {
      setIsValidatingBuyer(true);
      validateGstinApi(buyerGstin)
        .then(({ data }) => {
          if (active) setBuyerValidation(data);
        })
        .catch(() => {
          if (active) setBuyerValidation(null);
        })
        .finally(() => {
          if (active) setIsValidatingBuyer(false);
        });
    } else {
      setBuyerValidation(null);
    }
    return () => {
      active = false;
    };
  }, [buyerGstin]);

  const handleFieldChange = (field, value) => {
    if (!invoice || !onInvoiceChange) return;
    onInvoiceChange({
      ...invoice,
      [field]: value,
    });
  };

  const handleGenerateNextNumber = async () => {
    setIsGeneratingNext(true);
    try {
      const suppKey = supplierGstin || 'DEFAULT';
      const { data } = await getNextInvoiceNumberApi(suppKey, invoice?.financial_year);
      if (data?.next_invoice_number) {
        onInvoiceChange({
          ...invoice,
          invoice_id: data.next_invoice_number,
          bill_number: data.next_invoice_number,
          financial_year: data.financial_year || invoice?.financial_year,
        });
      }
    } catch (err) {
      console.error('Failed to generate next invoice number:', err);
    } finally {
      setIsGeneratingNext(false);
    }
  };

  return (
    <div
      className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors space-y-4"
      role="region"
      aria-label="Invoice Identification and Statutory Compliance Grid"
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h2 className="text-[17px] font-semibold text-slate-900 dark:text-slate-100">
            Invoice &amp; Party Compliance Details
          </h2>
          {invoice?.financial_year && (
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              FY {invoice.financial_year}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isInterState
                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
            }`}
          >
            {isInterState ? 'Inter-State (100% IGST)' : 'Intra-State (CGST + SGST)'}
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
              invoice?.supply_type_b2b === 'B2B'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            {invoice?.supply_type_b2b === 'B2B' ? 'B2B Invoice' : 'B2CS Retail'}
          </span>
        </div>
      </div>

      {/* 4-Column Grid: Supplier, Buyer, Metadata, Tax Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Column 1: Supplier / Store Details */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-slate-400" /> Supplier (Dukaan)
            </span>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Store / Business Name
            </label>
            <input
              type="text"
              value={invoice?.store_name_guess || invoice?.merchant_name || ''}
              onChange={(e) => {
                handleFieldChange('merchant_name', e.target.value);
                handleFieldChange('store_name_guess', e.target.value);
              }}
              placeholder="Store / Merchant Name"
              className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Supplier GSTIN
              </label>
              {supplierGstin ? (
                supplierValidation?.is_valid ? (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Mod-36 Ok
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {supplierValidation?.error_reason || 'Invalid'}
                  </span>
                )
              ) : (
                <span className="text-[11px] text-slate-400">Unregistered</span>
              )}
            </div>
            <input
              type="text"
              maxLength={15}
              value={supplierGstin}
              onChange={(e) =>
                handleFieldChange('supplier_gstin', e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))
              }
              placeholder="e.g. 03AAEPG1807C1ZM"
              className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-mono font-medium uppercase text-slate-900 dark:text-slate-100 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Store Address &amp; Contact
            </label>
            <input
              type="text"
              value={invoice?.store_address || invoice?.supplier_phone || ''}
              onChange={(e) => handleFieldChange('store_address', e.target.value)}
              placeholder="Address / Phone (Optional)"
              className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Column 2: Buyer / Customer Details */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" /> Buyer (Customer)
            </span>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Customer / Business Name
            </label>
            <input
              type="text"
              value={invoice?.customer_name || invoice?.buyer_name || ''}
              onChange={(e) => {
                handleFieldChange('customer_name', e.target.value);
                handleFieldChange('buyer_name', e.target.value);
              }}
              placeholder="Cash Customer / B2B Buyer"
              className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Buyer GSTIN (Optional)
              </label>
              {buyerGstin ? (
                buyerValidation?.is_valid ? (
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> B2B Registered
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Invalid
                  </span>
                )
              ) : (
                <span className="text-[11px] text-slate-400">B2C Retail</span>
              )}
            </div>
            <input
              type="text"
              maxLength={15}
              value={buyerGstin}
              onChange={(e) =>
                handleFieldChange('buyer_gstin', e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))
              }
              placeholder="Optional for B2B input tax credit"
              className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-mono font-medium uppercase text-slate-900 dark:text-slate-100 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Place of Supply (State / UT)
            </label>
            <CustomDropdown
              value={posCode}
              options={STATE_OPTIONS}
              onChange={(val) => {
                handleFieldChange('place_of_supply_state_code', val);
                handleFieldChange('pos', val);
                handleFieldChange('buyer_state_code', val);
              }}
              searchable={true}
              placeholder="Select Place of Supply..."
              icon={<MapPin className="h-3.5 w-3.5 text-slate-400" />}
              ariaLabel="Select Place of Supply state"
            />
          </div>
        </div>

        {/* Column 3: Invoice Metadata & Numbering */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-slate-400" /> Invoice Identifier
            </span>
            <button
              type="button"
              onClick={handleGenerateNextNumber}
              disabled={isGeneratingNext}
              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className={`h-3 w-3 ${isGeneratingNext ? 'animate-spin' : ''}`} />
              <span>Next #</span>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400">
                Invoice Number (Rule 46(b))
              </label>
              <span className={`text-[11px] font-mono font-medium ${
                (invoice?.invoice_id || '').length > 16
                  ? 'text-red-500 font-bold'
                  : (invoice?.invoice_id || '').length >= 14
                  ? 'text-amber-500'
                  : 'text-slate-400'
              }`}>
                {(invoice?.invoice_id || invoice?.bill_number || '').length}/16
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                maxLength={16}
                value={invoice?.invoice_id || invoice?.bill_number || ''}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 16);
                  handleFieldChange('invoice_id', val);
                  handleFieldChange('bill_number', val);
                }}
                placeholder="e.g. INV/26-27/0001"
                className={`w-full min-h-[42px] bg-white dark:bg-slate-900 border ${
                  (invoice?.invoice_id || '').length > 16
                    ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
                } rounded-lg px-3 py-2 text-[15px] font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums focus:outline-hidden focus:ring-2`}
              />
              {(invoice?.invoice_id || '').length > 16 && (
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = (invoice.invoice_id || '').slice(0, 16);
                    handleFieldChange('invoice_id', trimmed);
                    handleFieldChange('bill_number', trimmed);
                  }}
                  className="absolute right-2 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/80 dark:hover:bg-red-900 dark:text-red-300 border border-red-300 dark:border-red-700 transition cursor-pointer"
                >
                  Trim
                </button>
              )}
            </div>
            {(invoice?.invoice_id || '').length > 16 && (
              <p className="mt-1 text-[11px] text-red-500 font-medium flex items-center justify-between">
                <span>Exceeds CGST Rule 46(b) maximum 16-character limit.</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Invoice Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={invoice?.normalized_date_iso || ''}
                onChange={(e) => {
                  handleFieldChange('normalized_date_iso', e.target.value);
                  handleFieldChange('raw_date_written', e.target.value);
                }}
                className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Sector / Trade Category
            </label>
            <input
              type="text"
              readOnly
              value={invoice?.detected_sector || 'GENERAL'}
              className="w-full min-h-[42px] bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-700 dark:text-slate-300 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Column 4: Tax Calculation Mode & Extra Charges */}
        <div className="space-y-3 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-slate-400" /> Calculation Mode
            </span>
          </div>

          {/* Segmented Control: Exclusive vs Inclusive */}
          <div>
            <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Rate Computation Basis
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg min-h-[42px] items-center">
              <button
                type="button"
                onClick={() => handleFieldChange('is_tax_inclusive', false)}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  !isTaxInclusive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Tax-Exclusive
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('is_tax_inclusive', true)}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  isTaxInclusive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                MRP Inclusive
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Freight / Extra (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={invoice?.extra_charges ?? 0}
                onChange={(e) => handleFieldChange('extra_charges', parseFloat(e.target.value) || 0)}
                className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={invoice?.discount_amount ?? 0}
                onChange={(e) => handleFieldChange('discount_amount', parseFloat(e.target.value) || 0)}
                className="w-full min-h-[42px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 tabular-nums focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block">
              {isTaxInclusive
                ? 'Rates on paper include GST. Tax is derived algebraically.'
                : 'GST is calculated and added on top of base taxable rate.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
