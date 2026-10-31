import React, { useState, useEffect } from 'react';
import {
  Store,
  User,
  Hash,
  MapPin,
  FileText,
  RotateCw,
  Percent,
} from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { STATE_OPTIONS } from '../utils/indianStates';
import { validateGstinApi, getNextInvoiceNumberApi } from '../services/api';

/**
 * Sleek, unified Invoice Details & Party Compliance Grid.
 * One unified card container divided by subtle 1px internal hairlines.
 * High-contrast monochrome design system with precision financial typography.
 */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

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
        .then((res) => {
          const val = res?.data || res;
          if (active) setSupplierValidation(val);
        })
        .catch(() => {
          if (active) {
            setSupplierValidation({
              is_valid: GSTIN_REGEX.test(supplierGstin),
              isValid: GSTIN_REGEX.test(supplierGstin),
              error_reason: GSTIN_REGEX.test(supplierGstin) ? '' : 'Invalid format',
            });
          }
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
        .then((res) => {
          const val = res?.data || res;
          if (active) setBuyerValidation(val);
        })
        .catch(() => {
          if (active) {
            setBuyerValidation({
              is_valid: GSTIN_REGEX.test(buyerGstin),
              isValid: GSTIN_REGEX.test(buyerGstin),
              error_reason: GSTIN_REGEX.test(buyerGstin) ? '' : 'Invalid format',
            });
          }
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
      className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden transition-colors"
      role="region"
      aria-label="Bill and Party Details"
    >
      {/* Top Header Bar */}
      <div className="px-5 sm:px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Bill &amp; Party Details
          </h2>
          {invoice?.financial_year && (
            <span className="text-xs text-zinc-400 font-mono">
              · FY {invoice.financial_year}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{isInterState ? 'Inter-State' : 'Within State'}</span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>{invoice?.supply_type_b2b === 'B2B' ? 'B2B Business' : 'Retail Customer'}</span>
        </div>
      </div>

      {/* Unified 4-Column Container with Internal Hairlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 lg:divide-x divide-zinc-100 dark:divide-zinc-800">
        
        {/* Column 1: Supplier / Store Details */}
        <div className="p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-zinc-400" />
              <span>Your Store Details</span>
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Store Name
            </label>
            <input
              type="text"
              value={invoice?.store_name_guess || invoice?.merchant_name || ''}
              onChange={(e) => {
                handleFieldChange('merchant_name', e.target.value);
                handleFieldChange('store_name_guess', e.target.value);
              }}
              placeholder="Your Store Name"
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                GSTIN (Tax ID)
              </label>
              {!supplierGstin ? (
                <span className="text-[11px] text-zinc-400">Unregistered</span>
              ) : supplierGstin.length < 15 ? (
                <span className="text-[11px] text-zinc-400 font-mono">{15 - supplierGstin.length} chars left</span>
              ) : isValidatingSupplier ? (
                <span className="text-[11px] text-zinc-400 font-mono">Verifying...</span>
              ) : supplierValidation?.is_valid || supplierValidation?.isValid || GSTIN_REGEX.test(supplierGstin) ? (
                <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Verified
                </span>
              ) : (
                <span className="text-[11px] font-mono text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {supplierValidation?.error_reason || 'Invalid Format'}
                </span>
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
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm font-mono uppercase text-zinc-900 dark:text-zinc-100 tabular-nums focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Store Address &amp; Contact
            </label>
            <input
              type="text"
              value={invoice?.store_address || invoice?.supplier_phone || ''}
              onChange={(e) => handleFieldChange('store_address', e.target.value)}
              placeholder="Address / Phone (Optional)"
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
            />
          </div>
        </div>

        {/* Column 2: Buyer / Customer Details */}
        <div className="p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              <span>Customer Details</span>
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Customer Name
            </label>
            <input
              type="text"
              value={invoice?.customer_name || invoice?.buyer_name || ''}
              onChange={(e) => {
                handleFieldChange('customer_name', e.target.value);
                handleFieldChange('buyer_name', e.target.value);
              }}
              placeholder="Cash Customer / Business Name"
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Customer GSTIN (Optional)
              </label>
              {!buyerGstin ? (
                <span className="text-[11px] text-zinc-400">Retail Sale</span>
              ) : buyerGstin.length < 15 ? (
                <span className="text-[11px] text-zinc-400 font-mono">{15 - buyerGstin.length} chars left</span>
              ) : isValidatingBuyer ? (
                <span className="text-[11px] text-zinc-400 font-mono">Verifying...</span>
              ) : buyerValidation?.is_valid || buyerValidation?.isValid || GSTIN_REGEX.test(buyerGstin) ? (
                <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  B2B Valid
                </span>
              ) : (
                <span className="text-[11px] font-mono text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {buyerValidation?.error_reason || 'Invalid Format'}
                </span>
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
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm font-mono uppercase text-zinc-900 dark:text-zinc-100 tabular-nums focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
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
              icon={<MapPin className="h-3.5 w-3.5 text-zinc-400" />}
              ariaLabel="Select Place of Supply state"
            />
          </div>
        </div>

        {/* Column 3: Invoice Identifier & Date */}
        <div className="p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-zinc-400" />
              <span>Invoice Number &amp; Date</span>
            </span>
            <button
              type="button"
              onClick={handleGenerateNextNumber}
              disabled={isGeneratingNext}
              className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCw className={`h-3 w-3 ${isGeneratingNext ? 'animate-spin' : ''}`} />
              <span>Next #</span>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Invoice Number
              </label>
              <span className={`text-[11px] font-mono ${
                (invoice?.invoice_id || '').length > 16
                  ? 'text-red-600 font-semibold'
                  : 'text-zinc-400'
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
                className={`w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border ${
                  (invoice?.invoice_id || '').length > 16
                    ? 'border-red-500'
                    : 'border-zinc-200 dark:border-zinc-700'
                } text-sm font-mono text-zinc-900 dark:text-zinc-100 tabular-nums focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none`}
              />
              {(invoice?.invoice_id || '').length > 16 && (
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = (invoice.invoice_id || '').slice(0, 16);
                    handleFieldChange('invoice_id', trimmed);
                    handleFieldChange('bill_number', trimmed);
                  }}
                  className="absolute right-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 transition cursor-pointer"
                >
                  Trim
                </button>
              )}
            </div>
            {(invoice?.invoice_id || '').length > 16 && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">
                Invoice numbers cannot exceed 16 characters.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Invoice Date
            </label>
            <input
              type="date"
              value={invoice?.normalized_date_iso || ''}
              onChange={(e) => {
                handleFieldChange('normalized_date_iso', e.target.value);
                handleFieldChange('raw_date_written', e.target.value);
              }}
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Trade Category
            </label>
            <input
              type="text"
              readOnly
              value={invoice?.detected_sector || 'GENERAL'}
              className="w-full h-10 px-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed font-mono"
            />
          </div>
        </div>

        {/* Column 4: Calculation Mode & Extra Charges */}
        <div className="p-5 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-zinc-400" />
              <span>Tax Settings</span>
            </span>
          </div>

          {/* Segmented Sliding Pill Toggle */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Pricing Method
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl h-10 items-center">
              <button
                type="button"
                onClick={() => handleFieldChange('is_tax_inclusive', false)}
                className={`h-8 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  !isTaxInclusive
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Tax Added
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('is_tax_inclusive', true)}
                className={`h-8 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isTaxInclusive
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Tax Included
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Extra Charges (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={invoice?.extra_charges ?? 0}
                onChange={(e) => handleFieldChange('extra_charges', parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100 tabular-nums focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Discount (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={invoice?.discount_amount ?? 0}
                onChange={(e) => handleFieldChange('discount_amount', parseFloat(e.target.value) || 0)}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-900 dark:text-zinc-100 tabular-nums focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-900 dark:focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/5 transition-all outline-none"
              />
            </div>
          </div>

          <div className="pt-0.5">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight block">
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
