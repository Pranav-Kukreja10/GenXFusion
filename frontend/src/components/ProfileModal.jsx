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
  CheckCircle2,
  AlertCircle,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E0D8] dark:border-zinc-800 flex items-center justify-between bg-[#FAF8F5] dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                Business & Tax Profile
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure your GST credentials & default parsing preferences
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Full Name */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <User className="h-3.5 w-3.5 text-emerald-600" /> Full Name
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Building className="h-3.5 w-3.5 text-emerald-600" /> Business / Store Name
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="e.g. Sharma Kirana & General Store"
              className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* GSTIN with Live Validation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-emerald-600" /> GSTIN (15-Character Tax ID)
              </label>
              {gstinStatus.isValid ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Valid GSTIN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                  <AlertCircle className="h-3 w-3" /> Invalid Format
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
              className={`w-full font-mono uppercase rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold transition-all focus:outline-hidden ${
                gstinStatus.isValid
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500 focus:ring-2 focus:ring-emerald-600'
                  : 'bg-red-50/50 dark:bg-red-950/20 border border-red-400 focus:ring-2 focus:ring-red-500'
              }`}
            />
            {!gstinStatus.isValid && (
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                {gstinStatus.message}
              </p>
            )}
          </div>

          {/* Business Category & Preferred Language Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Tag className="h-3.5 w-3.5 text-emerald-600" /> Business Category
              </label>
              <select
                value={formData.businessCategory}
                onChange={(e) => handleChange('businessCategory', e.target.value)}
                className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600 cursor-pointer"
              >
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Languages className="h-3.5 w-3.5 text-emerald-600" /> Preferred Bill Language
              </label>
              <select
                value={formData.billLanguage}
                onChange={(e) => handleChange('billLanguage', e.target.value)}
                className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600 cursor-pointer"
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
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-emerald-600" /> Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Mail className="h-3.5 w-3.5 text-emerald-600" /> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="store@domain.in"
                className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Footer Save Action */}
          <div className="pt-3 border-t border-[#E5E0D8] dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!gstinStatus.isValid}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
