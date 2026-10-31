import { DEMO_PRESETS, COMMON_HSN_CODES } from '../utils/mockPresets';
import { recalculateInvoice as localRecalculate, generateGstr1Payload } from '../utils/gstCalculator';

const STORAGE_KEY = 'parchisetu_api_base_url';
export const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function getApiBaseUrl() {
  const custom = localStorage.getItem(STORAGE_KEY);
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
  return {
    ...data,
    invoice_id: data.invoice_id || data.bill_id || data.bill_number || `INV-${Date.now().toString().slice(-4)}`,
    raw_image_base64: data.raw_image_base64 || data.raw_image_b64 || '',
    enhanced_image_base64: data.enhanced_image_base64 || data.enhanced_image_b64 || '',
    active_items: data.active_items || data.items || [],
    summary: data.summary || {},
  };
}

/**
 * 1. POST /invoice/parse?mock=${isMock}&bypass_cache=${bypassCache}
 */
export async function parseInvoiceApi(fileBlob, isMock = false, bypassCache = false) {
  const base = getApiBaseUrl();

  // If mock mode requested, attempt backend first with fallback
  if (isMock) {
    try {
      const formData = new FormData();
      if (fileBlob) formData.append('file', fileBlob, 'receipt.jpg');
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${base}/invoice/parse?mock=true&bypass_cache=${bypassCache}`, {
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

    const res = await fetch(`${base}/invoice/parse?mock=false&bypass_cache=${bypassCache}`, {
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
        return rawList.map(item => ({
          hsn: item.hsn_code || item.hsn || '',
          description: item.description || item.category_description || '',
          rate: Number(item.base_gst_rate ?? item.gst_rate ?? item.rate ?? 18),
          sector: item.sector || 'GENERAL',
          cbic_schedule: item.cbic_schedule || '',
        }));
      }
    }
  } catch (err) {
    console.warn('Backend HSN search offline, searching local common codes:', err.message);
  }

  return COMMON_HSN_CODES.filter(
    (item) =>
      item.hsn.includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q)
  );
}
