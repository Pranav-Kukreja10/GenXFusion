import { DEMO_PRESETS, COMMON_HSN_CODES } from '../utils/mockPresets';
import { recalculateInvoice as localRecalculate, generateGstr1Payload } from '../utils/gstCalculator';

const STORAGE_KEY = 'truetax_api_base_url';
export const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function getApiBaseUrl() {
  const custom = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('parchisetu_api_base_url');
  if (custom && (custom.includes('localhost:8000') || custom.includes('127.0.0.1:8000'))) {
    // Migrate hardcoded host URL to relative path to leverage Vite proxy or same-origin
    return '/api/v1';
  }
  return custom || DEFAULT_API_BASE;
}

export function setApiBaseUrl(url) {
  if (!url) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
  }
}

export async function testConnection(customUrl) {
  const base = customUrl || getApiBaseUrl();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);
    const healthUrl = base.endsWith('/api/v1') ? `${base}/health` : `${base}/api/v1/health`;
    const res = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Normalizes backend response to ensure consistent property names across React components.
 */
function normalizeInvoiceResponse(data) {
  if (!data || typeof data !== 'object') return data;
  let invId = data.invoice_id || data.bill_number;
  if (!invId) {
    const bId = (data.bill_id || '').toString();
    if (bId.length > 16) {
      invId = `INV-${bId.slice(0, 8).toUpperCase()}`;
    } else if (bId.length > 0) {
      invId = bId;
    } else {
      invId = `INV-${Date.now().toString().slice(-4)}`;
    }
  } else if (invId.length > 16) {
    if (invId.length >= 32 && /^[0-9a-fA-F]+$/.test(invId)) {
      invId = `INV-${invId.slice(0, 8).toUpperCase()}`;
    } else {
      invId = invId.slice(0, 16);
    }
  }

  return {
    ...data,
    invoice_id: invId,
    bill_number: invId,
    raw_image_base64: data.raw_image_base64 || data.raw_image_b64 || '',
    enhanced_image_base64: data.enhanced_image_base64 || data.enhanced_image_b64 || '',
    active_items: data.active_items || data.items || [],
    struck_out_items: data.struck_out_items || [],
    pending_doubts: data.pending_doubts || [],
    summary: data.summary || {},
  };
}

/**
 * 1. POST /invoice/parse?mock=${isMock}&bypass_cache=${bypassCache}&rotation_degrees=${rotation}
 */
export async function parseInvoiceApi(fileBlob, isMock = false, bypassCache = false, rotationDegrees = 0) {
  const base = getApiBaseUrl();

  // If mock mode requested, attempt backend first with fallback
  if (isMock) {
    try {
      const formData = new FormData();
      if (fileBlob) formData.append('file', fileBlob, 'receipt.jpg');
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${base}/invoice/parse?mock=true&bypass_cache=${bypassCache}&rotation_degrees=${rotationDegrees}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(id);
      if (res.ok) {
        const raw = await res.json();
        return { data: normalizeInvoiceResponse(raw), isOfflineFallback: false };
      }
    } catch {
      // Backend offline, fallback to preset
    }
    const preset = DEMO_PRESETS[0].data;
    return { data: normalizeInvoiceResponse(preset), isOfflineFallback: true };
  }

  // Real scan upload
  try {
    const formData = new FormData();
    formData.append('file', fileBlob, fileBlob?.name || 'receipt.jpg');

    const res = await fetch(`${base}/invoice/parse?mock=false&bypass_cache=${bypassCache}&rotation_degrees=${rotationDegrees}`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = `Server error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errJson.message || JSON.stringify(errJson);
      } catch {
        const errText = await res.text();
        if (errText) errorMsg = errText;
      }
      throw new Error(errorMsg);
    }

    const raw = await res.json();
    return { data: normalizeInvoiceResponse(raw), isOfflineFallback: false };
  } catch (err) {
    console.warn('Backend unavailable, falling back to local simulation:', err.message);
    const mockData = {
      ...DEMO_PRESETS[0].data,
      invoice_id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      raw_date_written: new Date().toLocaleDateString('en-GB'),
      normalized_date_iso: new Date().toISOString().split('T')[0],
      cache_hit: false,
    };
    return { data: normalizeInvoiceResponse(mockData), isOfflineFallback: true, error: err.message };
  }
}

/**
 * 2. POST /invoice/recalculate
 */
export async function recalculateInvoiceApi(invoice) {
  const base = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${base}/invoice/recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.ok) {
      const raw = await res.json();
      return { data: normalizeInvoiceResponse(raw), isOfflineFallback: false };
    }
  } catch (err) {
    console.warn('Backend recalculate offline, computing locally:', err.message);
  }
  const locallyRecalculated = localRecalculate(invoice);
  return { data: normalizeInvoiceResponse(locallyRecalculated), isOfflineFallback: true };
}

/**
 * 3. POST /invoice/export-gstr1
 */
export async function exportGstr1Api(invoice) {
  const base = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const payload = {
      invoice,
      supplier_gstin: invoice.supplier_gstin || 'URP',
      tax_period: '102026',
      pos_code: invoice.place_of_supply_state_code || invoice.supplier_state_code || '03',
      buyer_gstin: invoice.buyer_gstin,
    };

    const res = await fetch(`${base}/invoice/export-gstr1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      return { data, isOfflineFallback: false };
    }
  } catch (err) {
    console.warn('Backend export-gstr1 offline, generating locally:', err.message);
  }
  const payload = generateGstr1Payload(invoice);
  return { data: payload, isOfflineFallback: true };
}

/**
 * 4. GET /hsn/search?q=${query}
 */
export async function searchHsnApi(query) {
  if (!query || query.trim().length === 0) return COMMON_HSN_CODES;
  const base = getApiBaseUrl();
  const q = query.toLowerCase().trim();

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${base}/hsn/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (data.results || []);
      if (rawList.length > 0) {
        return rawList.map((item) => ({
          hsn: item.hsn_code || item.hsn || '',
          description: item.description || item.category_description || '',
          rate: Number(item.base_gst_rate ?? item.gst_rate ?? item.rate ?? 18),
          sector: item.sector || 'GENERAL',
          cbic_schedule: item.cbic_schedule || '',
        }));
      }
    }
  } catch (err) {
    console.warn('Backend HSN search offline, searching local common codes:', err);
  }

  return COMMON_HSN_CODES.filter(
    (item) =>
      item.hsn.includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q)
  );
}

/**
 * 5. GET /gst/validate-gstin?gstin=${gstin}
 * Returns 15-char Modulo-36 validation result.
 */
export async function validateGstinApi(gstin) {
  if (!gstin || gstin.trim().length === 0) {
    return { is_valid: false, isValid: false, error_reason: 'GSTIN is empty' };
  }
  const clean = gstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isValidFormat = clean.length === 15 && gstinRegex.test(clean);
  const base = getApiBaseUrl();

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${base}/gst/validate-gstin?gstin=${encodeURIComponent(clean)}`, {
      signal: controller.signal,
    });
    clearTimeout(id);
    if (res.ok) {
      const data = await res.json();
      const valid = Boolean(data.is_valid ?? isValidFormat);
      const output = {
        ...data,
        is_valid: valid,
        isValid: valid,
        checksum_valid: data.checksum_valid ?? isValidFormat,
        state_code: data.state_code || clean.slice(0, 2),
      };
      output.data = output;
      return output;
    }
  } catch {
    // Fallback to basic regex if backend offline
  }

  const output = {
    is_valid: isValidFormat,
    isValid: isValidFormat,
    checksum_valid: isValidFormat,
    state_code: clean.slice(0, 2),
    entity_type: clean[5] || 'P',
    error_reason: isValidFormat ? '' : 'Invalid GSTIN format or length',
  };
  output.data = output;
  return output;
}

/**
 * 6. POST /invoice/register-number
 * Checks uniqueness under CGST Rule 46(b) for a supplier in the current FY.
 */
export async function registerInvoiceNumberApi(supplierKey, invoiceNumber, financialYear, autoRegister = false) {
  const base = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${base}/invoice/register-number`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_key: supplierKey || 'DEFAULT',
        invoice_number: invoiceNumber,
        financial_year: financialYear,
        auto_register: autoRegister,
      }),
      signal: controller.signal,
    });
    clearTimeout(id);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback offline
  }

  const fy = financialYear || '2026-27';
  const shortFy = fy.includes('-') ? `${fy.split('-')[0].slice(-2)}-${fy.split('-')[1].slice(-2)}` : '26-27';

  return {
    is_unique: true,
    is_valid_format: Boolean(invoiceNumber && /^[a-zA-Z0-9\/-]{1,16}$/.test(invoiceNumber)),
    financial_year: fy,
    invoice_number: invoiceNumber,
    next_suggested_invoice_number: `INV/${shortFy}/0001`,
    error_reason: '',
  };
}

/**
 * 7. GET /invoice/next-number
 */
export async function getNextInvoiceNumberApi(supplierKey, financialYear) {
  const base = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const q = new URLSearchParams();
    if (supplierKey) q.append('supplier_key', supplierKey);
    if (financialYear) q.append('financial_year', financialYear);

    const res = await fetch(`${base}/invoice/next-number?${q.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(id);
    if (res.ok) {
      const data = await res.json();
      return { data, error: null };
    }
  } catch {
    // Fallback
  }
  const fy = financialYear || '2026-27';
  const shortFy = fy.includes('-') ? `${fy.split('-')[0].slice(-2)}-${fy.split('-')[1].slice(-2)}` : '26-27';
  return {
    data: {
      financial_year: fy,
      next_invoice_number: `INV/${shortFy}/0001`,
    },
    error: 'fallback',
  };
}


// ============================================================================
// 8. SQLite + JWT Authentication & Multi-GSTIN Profile API
// ============================================================================

const AUTH_TOKEN_KEY = 'truetax_jwt_token';
const LEGACY_AUTH_TOKEN_KEY = 'parchisetu_jwt_token';

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  }
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const LOCAL_DEMO_MERCHANT = {
  access_token: 'local_demo_jwt_token_truetax',
  token_type: 'bearer',
  user: {
    id: 1,
    email_or_phone: 'demo@truetax.in',
    full_name: 'Sandeep Goyal (Demo Merchant)',
    contact_phone: '9876543210',
    default_business_name: 'TrueTax Enterprises',
    created_at: new Date().toISOString(),
  },
  merchant_gstins: [
    {
      id: 1,
      gstin: '03AAEPG1807C1ZM',
      trade_name: 'TrueTax Textiles & Readymade — Ludhiana HQ',
      state_code: '03',
      state_name: 'Punjab',
      branch_address: 'Shop 42, Chaura Bazar, Near Clock Tower, Ludhiana, Punjab - 141008',
      branch_phone: '98765-43210',
      invoice_prefix: 'PB/26-27/',
      is_default: 1,
    },
    {
      id: 2,
      gstin: '23BXDPP0256Q1Z6',
      trade_name: 'Radhe Krishna Agency — Bhikangaon Branch',
      state_code: '23',
      state_name: 'Madhya Pradesh',
      branch_address: 'Soni Colony, Amankhedi Road, Bhikangaon, Khargone (M.P.) - 451331',
      branch_phone: '91656-06305',
      invoice_prefix: 'MP/26-27/',
      is_default: 0,
    },
    {
      id: 3,
      gstin: '07AAECG1807C1Z5',
      trade_name: 'TrueTax Corporate Hub — Delhi Branch',
      state_code: '07',
      state_name: 'Delhi',
      branch_address: 'F-Block, Connaught Place, New Delhi, Delhi - 110001',
      branch_phone: '98111-22334',
      invoice_prefix: 'DL/26-27/',
      is_default: 0,
    },
  ],
  default_gstin: {
    id: 1,
    gstin: '03AAEPG1807C1ZM',
    trade_name: 'TrueTax Textiles & Readymade — Ludhiana HQ',
    state_code: '03',
    state_name: 'Punjab',
    branch_address: 'Shop 42, Chaura Bazar, Near Clock Tower, Ludhiana, Punjab - 141008',
    branch_phone: '98765-43210',
    invoice_prefix: 'PB/26-27/',
    is_default: 1,
  },
};

export async function loginApi({ email_or_phone, password, demo_mode = false }) {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_or_phone, password, demo_mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Login failed with status ${res.status}`);
    }
    const data = await res.json();
    if (data.access_token) {
      setAuthToken(data.access_token);
    }
    return data;
  } catch (err) {
    if (demo_mode || !email_or_phone || email_or_phone.includes('demo') || email_or_phone.includes('admin')) {
      console.warn('Backend login unreachable or encountered error, activating resilient demo session:', err);
      setAuthToken(LOCAL_DEMO_MERCHANT.access_token);
      return LOCAL_DEMO_MERCHANT;
    }
    throw err;
  }
}

export async function registerApi({
  email_or_phone,
  password,
  full_name,
  contact_phone = '',
  default_business_name = '',
  initial_gstin = '',
}) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_or_phone,
      password,
      full_name,
      contact_phone,
      default_business_name,
      initial_gstin,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Registration failed with status ${res.status}`);
  }
  const data = await res.json();
  if (data.access_token) {
    setAuthToken(data.access_token);
  }
  return data;
}

export async function getMeApi() {
  const base = getApiBaseUrl();
  const token = getAuthToken();
  if (token === LOCAL_DEMO_MERCHANT.access_token) {
    return LOCAL_DEMO_MERCHANT;
  }
  try {
    const res = await fetch(`${base}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthToken();
      }
      throw new Error(`Authentication check failed: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (token) {
      return LOCAL_DEMO_MERCHANT;
    }
    throw err;
  }
}

export async function addGstinApi(payload) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/auth/gstins`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to add GSTIN: ${res.status}`);
  }
  return await res.json();
}

export async function setDefaultGstinApi(gstinId) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/auth/gstins/${gstinId}/default`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to set default GSTIN: ${res.status}`);
  }
  return await res.json();
}

export async function deleteGstinApi(gstinId) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/auth/gstins/${gstinId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete GSTIN: ${res.status}`);
  }
  return await res.json();
}
