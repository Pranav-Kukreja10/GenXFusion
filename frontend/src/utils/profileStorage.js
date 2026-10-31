/**
 * frontend/src/utils/profileStorage.js
 * LocalStorage Persistence and Validation Helpers for TrueTax AI Profiles & Recent Scans
 */

export const DEFAULT_PROFILE = {
  fullName: '',
  businessName: '',
  gstin: '',
  businessCategory: 'General Store',
  phone: '',
  email: '',
  billLanguage: 'Auto-detect',
};

export const BUSINESS_CATEGORIES = [
  'Grocery',
  'Pharmacy',
  'Electronics',
  'Apparel',
  'Hardware',
  'Restaurant',
  'Other',
];

export const BILL_LANGUAGES = [
  'Auto-detect',
  'Hindi',
  'Punjabi',
  'Gujarati',
  'Marathi',
  'Tamil',
  'English',
];

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(gstin) {
  if (!gstin || typeof gstin !== 'string') {
    return { isValid: false, message: 'GSTIN is required (15 characters)' };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return {
      isValid: false,
      message: `Must be exactly 15 characters (currently ${clean.length})`,
    };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return {
      isValid: false,
      message: 'Invalid GSTIN format (e.g., 03AABCU9603R1ZM)',
    };
  }
  return { isValid: true, message: 'Valid Indian GSTIN', formatted: clean };
}

export function maskGstin(gstin) {
  if (!gstin || gstin.length < 15) return gstin || 'Not Registered';
  const clean = gstin.trim().toUpperCase();
  // Format: 03AA****1ZM
  return `${clean.slice(0, 4)}****${clean.slice(11)}`;
}

export function getInitials(name) {
  if (!name) return 'TT';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem('truetax_profile') || localStorage.getItem('parchisetu_profile');
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    const parsed = JSON.parse(raw);
    if (
      parsed.fullName === 'Rajesh Sharma' ||
      parsed.businessName === 'Sharma Kirana & General Store' ||
      parsed.email === 'rajesh.sharma@sharmakiranastore.in'
    ) {
      localStorage.removeItem('truetax_profile');
      localStorage.removeItem('parchisetu_profile');
      return DEFAULT_PROFILE;
    }
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch (err) {
    console.warn('Error reading profile from localStorage:', err);
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem('truetax_profile', JSON.stringify(profile));
    window.dispatchEvent(new Event('truetax_profile_updated'));
  } catch (err) {
    console.error('Error saving profile to localStorage:', err);
  }
}

// ============================================================================
// Recent Scans Storage
// ============================================================================

export const SEED_RECENT_SCANS = [
  {
    id: 'scan-1',
    invoice_id: 'INV-2026-8841',
    merchant_name: 'Sharma Kirana Store',
    date: '31 Oct 2026',
    raw_date: '31/10/26',
    category: 'Grocery',
    total: 806.30,
    status: 'Mismatch', // Caught math error
    status_note: '₹10 Shopkeeper Math Error Fixed',
    item_count: 4,
    thumbnail: null,
  },
  {
    id: 'scan-2',
    invoice_id: 'INV-2026-9104',
    merchant_name: 'Punjab Cloth House',
    date: '31 Oct 2026',
    raw_date: '31/10/26',
    category: 'Apparel',
    total: 4840.50,
    status: 'Verified',
    status_note: '₹1,000 Threshold Slab Auto-Upgraded',
    item_count: 4,
    thumbnail: null,
  },
  {
    id: 'scan-3',
    invoice_id: 'INV-2026-9482',
    merchant_name: 'Gupta Hardware & Sanitary',
    date: '30 Oct 2026',
    raw_date: '30/10/26',
    category: 'Hardware',
    total: 1553.00,
    status: 'Verified',
    status_note: '28% GST & Asian Paints Verified',
    item_count: 3,
    thumbnail: null,
  },
];

export function loadRecentScans() {
  try {
    const raw = localStorage.getItem('truetax_recent_scans');
    if (!raw) {
      localStorage.setItem('truetax_recent_scans', JSON.stringify(SEED_RECENT_SCANS));
      return SEED_RECENT_SCANS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_RECENT_SCANS;
  } catch (err) {
    console.warn('Error reading recent scans from localStorage:', err);
    return SEED_RECENT_SCANS;
  }
}

export function addRecentScan(scanRecord) {
  try {
    const current = loadRecentScans();
    const filtered = current.filter((s) => s.invoice_id !== scanRecord.invoice_id);
    const updated = [scanRecord, ...filtered].slice(0, 5); // Keep last 5
    localStorage.setItem('truetax_recent_scans', JSON.stringify(updated));
    window.dispatchEvent(new Event('truetax_scans_updated'));
    return updated;
  } catch (err) {
    console.error('Error adding recent scan:', err);
    return loadRecentScans();
  }
}

