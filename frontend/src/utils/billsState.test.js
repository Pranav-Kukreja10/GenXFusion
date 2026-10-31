import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PRESETS } from './mockPresets.js';

describe('Bills State & Routing Logic Helper Tests', () => {
  it('correctly loads fallback presets when storage is empty', () => {
    const fallbackBills = DEMO_PRESETS.map((p) => p.data);
    assert.equal(fallbackBills.length, 3);
    assert.equal(fallbackBills[0].invoice_id, 'INV-2026-2260');
  });

  it('safely handles corrupt or unparseable JSON from storage', () => {
    let result;
    const corruptString = '{ "bad_json": [ incomplete...';
    try {
      result = JSON.parse(corruptString);
    } catch {
      result = DEMO_PRESETS.map((p) => p.data);
    }
    assert.ok(Array.isArray(result));
    assert.equal(result[0].invoice_id, 'INV-2026-2260');
  });

  it('adding a newly scanned bill creates an independent entry without leaking previous edits', () => {
    const existingBills = DEMO_PRESETS.map((p) => ({ ...p.data }));
    // Modify existing bill
    existingBills[0].active_items[0].quantity = 99;

    // Scan a new bill
    const newScannedBill = {
      invoice_id: 'INV-NEW-SCAN-01',
      merchant_name: 'Metro Cash & Carry',
      active_items: [
        {
          row_id: 1,
          quantity: 2,
          unit_price: 50,
          written_line_total: 100,
        },
      ],
    };

    // Prepend new bill
    const updatedBills = [newScannedBill, ...existingBills];

    assert.equal(updatedBills.length, 4);
    assert.equal(updatedBills[0].invoice_id, 'INV-NEW-SCAN-01');
    // Ensure previous bill preserved its independent edits
    assert.equal(updatedBills[1].active_items[0].quantity, 99);
    // Ensure new bill is clean
    assert.equal(updatedBills[0].active_items[0].quantity, 2);
  });

  it('retrieves bill by ID case-insensitively', () => {
    const bills = DEMO_PRESETS.map((p) => p.data);
    const target = 'inv-2026-2260';
    const found = bills.find((b) => b.invoice_id.toLowerCase() === target.toLowerCase());

    assert.ok(found);
    assert.equal(found.invoice_id, 'INV-2026-2260');
    assert.equal(found.merchant_name, 'Sharma Kirana & General Store');
  });

  it('returns null/undefined when searching for an invalid bill ID', () => {
    const bills = DEMO_PRESETS.map((p) => p.data);
    const target = 'INV-INVALID-9999';
    const found = bills.find((b) => b.invoice_id === target);

    assert.equal(found, undefined);
  });
});

