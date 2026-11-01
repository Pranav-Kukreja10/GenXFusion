import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Hash,
  Phone,
  Mail,
  Languages,
  Tag,
  Save,
} from 'lucide-react';
import {
  loadProfile,
  saveProfile,
  validateGstin,
  BUSINESS_CATEGORIES,
  BILL_LANGUAGES,
} from '../utils/profileStorage';

export default function ProfileModal({ isOpen, onClose, onSaved }) {
  const [formData, setFormData] = useState(() => loadProfile());
  const [gstinStatus, setGstinStatus] = useState(() => validateGstin(loadProfile().gstin));

  const prevOpenRef = React.useRef(isOpen);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      const current = loadProfile();
      setFormData(current);
      setGstinStatus(validateGstin(current.gstin));
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    const next = { ...formData, [field]: value };
    setFormData(next);
    if (field === 'gstin') {
      setGstinStatus(validateGstin(value));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveProfile(formData);
    if (onSaved) {
      onSaved(formData);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center">
              <User className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Business &amp; Tax Profile
              </h2>
              <p className="text-[11px] text-zinc-400">
                Your store details for printed invoices &amp; bills
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {/* Full Name */}
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-zinc-400" /> Full Name
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="e.g. Sandeep Goyal"
              className="w-full h-9 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
              <Building className="h-3.5 w-3.5 text-zinc-400" /> Business / Store Name
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="e.g. TrueTax Enterprises"
              className="w-full h-9 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
            />
          </div>

          {/* GSTIN with Live Validation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-zinc-400" /> GSTIN (15-Character Tax ID)
              </label>
              {gstinStatus.isValid ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-700 dark:text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Valid GSTIN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-600 dark:text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Invalid Format
                </span>
              )}
            </div>
            <input
              type="text"
              required
              maxLength={15}
              value={formData.gstin}
              onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
              placeholder="e.g. 03AABCU9603R1ZM"
              className={`w-full h-9 font-mono uppercase rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 tabular-nums transition-all focus:outline-none border ${
                gstinStatus.isValid
                  ? 'border-zinc-200 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-300'
                  : 'border-red-400 dark:border-red-800 focus:border-red-500'
              }`}
            />
            {!gstinStatus.isValid && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                {gstinStatus.message}
              </p>
            )}
          </div>

          {/* Business Category & Preferred Language Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                <Tag className="h-3.5 w-3.5 text-zinc-400" /> Business Category
              </label>
              <select
                value={formData.businessCategory}
                onChange={(e) => handleChange('businessCategory', e.target.value)}
                className="w-full h-9 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 cursor-pointer"
              >
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                <Languages className="h-3.5 w-3.5 text-zinc-400" /> Preferred Bill Language
              </label>
              <select
                value={formData.billLanguage}
                onChange={(e) => handleChange('billLanguage', e.target.value)}
                className="w-full h-9 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 cursor-pointer"
              >
                {BILL_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-zinc-400" /> Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full h-9 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                <Mail className="h-3.5 w-3.5 text-zinc-400" /> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="store@domain.in"
                className="w-full h-9 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
              />
            </div>
          </div>

          {/* Footer Save Action */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!gstinStatus.isValid}
              className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium px-4 py-1.5 rounded-lg text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
