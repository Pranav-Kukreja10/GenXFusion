---
name: audit-cards-pakka-invoice
description: Use for Teammate 4 tasks: frontend/src/components/AuditAlertsCard.jsx, frontend/src/components/PakkaInvoiceModal.jsx, and printable Tally/ClearTax GST invoice views.
---

<LANE_4_CONSTRAINTS>
1. STRICT FILE OWNERSHIP: Only edit `frontend/src/components/AuditAlertsCard.jsx` and `frontend/src/components/PakkaInvoiceModal.jsx`.
2. ANTI-SLOP AUDIT CARDS (3 HIGH-CONTRAST BANNERS):
   - Crimson Alert (`#DC2626`): "Shopkeeper Math Error Caught" showing `Written Total` vs `Actual (Qty × Rate)` with a 1-click "Apply Audited Math" button.
   - Amber Alert (`#D97706`): "Dynamic GST Threshold Triggered" highlighting items where the ₹1,000 Apparel/Footwear rule or Loose-vs-Packed rule changed the tax slab.
   - Slate Muted Card (`#64748B`): "Struck-Out / Cut Items Excluded from GST" listing crossed-out kacha bill rows safely ignored.
3. PRINTABLE PAKKA GST TAX INVOICE + GSTR-1 DOWNLOAD:
   - Build a crisp, black-and-white print-ready (`@media print`) Indian Tax Invoice with Supplier/Buyer GSTIN, 4-digit HSN Tax Summary Table (Taxable Value + CGST + SGST = Total Tax), Amount in Indian Words (*Rupees Two Thousand Four Hundred Only*), UPI QR code, and a "Download Official GSTR-1 JSON" button.
</LANE_4_CONSTRAINTS>
