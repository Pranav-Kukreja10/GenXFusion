import { DEMO_PRESETS, COMMON_HSN_CODES } from '../utils/mockPresets';
import { recalculateInvoice as localRecalculate, generateGstr1Payload } from '../utils/gstCalculator';

const STORAGE_KEY = 'parchisetu_api_base_url';
export const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export function getApiBaseUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_API_BASE;
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
    const res = await fetch(`${base}/health`, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 1. POST /invoice/parse?mock=${isMock}&bypass_cache=${bypassCache}
 */
export async function parseInvoiceApi(fileBlob, isMock = false, bypassCache = false) {
  const base = getApiBaseUrl();

  // If mock mode requested, we can still attempt backend if online or use rich preset
  if (isMock) {
    try {
      const formData = new FormData();
      if (fileBlob) formData.append('file', fileBlob, 'receipt.jpg');
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${base}/invoice/parse?mock=true&bypass_cache=${bypassCache}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(id);
      if (res.ok) {
        const data = await res.json();
        return { data, isOfflineFallback: false };
      }
    } catch {
      // Backend offline, fallback to preset
    }
    // Return high-fidelity mock preset
    const preset = DEMO_PRESETS[0].data;
    return { data: preset, isOfflineFallback: true };
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
      const errText = await res.text();
      throw new Error(`Server returned error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return { data, isOfflineFallback: false };
  } catch (err) {
    console.warn('Backend unavailable, falling back to local simulation:', err.message);
    // If backend is not running yet during demo, gracefully simulate OCR response
    const mockData = {
      ...DEMO_PRESETS[0].data,
      invoice_id: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      raw_date_written: new Date().toLocaleDateString('en-GB'),
      normalized_date_iso: new Date().toISOString().split('T')[0],
      cache_hit: false,
    };
    return { data: mockData, isOfflineFallback: true, error: err.message };
  }
}

/**
 * 2. POST /invoice/recalculate
 */
export async function recalculateInvoiceApi(invoice) {
  const base = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${base}/invoice/recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      return { data, isOfflineFallback: false };
    }
  } catch {
    // Backend offline: compute locally
  }
  const locallyRecalculated = localRecalculate(invoice);
  return { data: locallyRecalculated, isOfflineFallback: true };
}

/**
 * 3. POST /invoice/export-gstr1
 */
export async function exportGstr1Api(invoice) {
  const base = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${base}/invoice/export-gstr1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      return { data, isOfflineFallback: false };
    }
  } catch {
    // Backend offline: generate official GSTR-1 payload locally
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
    const id = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${base}/hsn/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    clearTimeout(id);

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Backend offline: search local dataset
  }

  return COMMON_HSN_CODES.filter(
    (item) =>
      item.hsn.includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q)
  );
}

