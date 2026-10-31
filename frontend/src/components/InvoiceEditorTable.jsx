import React from 'react';
import {
  Wrench,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  FileCheck,
  Check,
} from 'lucide-react';
import { formatINR } from '../utils/numberToWords';

const UQC_OPTIONS = [
  'PCS', 'KGS', 'BOX', 'MTR', 'BAG', 'CAN', 'LTR', 'SET', 'ROL', 'BTL', 'NOS', 'OTH'
];

const GST_SLABS = [0, 5, 12, 18, 28];

export default function InvoiceEditorTable({
  invoice,
  onItemChange,
  onFixSingleMathError,
  onOpenHsnSearch,
  onAddItem,
  onDeleteItem,
}) {
  const activeItems = invoice?.active_items || [];

  return (
    <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden flex flex-col transition-colors">
      
      {/* Table Title Bar */}
      <div className="p-3.5 border-b border-[#E5E0D8] dark:border-zinc-800 bg-[#FAF8F5] dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            Audited GST Ledger & Line Items
          </h2>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-200/80 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-medium">
            {activeItems.length} items
          </span>
        </div>

        <button
          type="button"
          onClick={onAddItem}
          className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-[#F8F6F2] dark:bg-zinc-900/80 border-b border-[#E5E0D8] dark:border-zinc-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[210px]">Vernacular OCR & Normalized Goods</th>
              <th className="py-2.5 px-3 w-32">Qty & Unit</th>
              <th className="py-2.5 px-3 min-w-[160px]">Rate & Math</th>
              <th className="py-2.5 px-3 min-w-[200px]">HSN & Tax Slab</th>
              <th className="py-2.5 px-3 w-28 text-right">Row Total</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E0D8] dark:divide-zinc-800/80 text-xs">
            {activeItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  No line items found. Snap a receipt or choose a demo preset above.
                </td>
              </tr>
            ) : (
              activeItems.map((item, index) => {
                const isError = item.has_math_error;
                return (
                  <tr
                    key={item.line_number || index}
                    className={`transition-colors ${
                      isError
                        ? 'bg-red-50/70 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                        : 'hover:bg-slate-50/70 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Line Number */}
                    <td className="py-3 px-3 text-center font-mono text-slate-400 dark:text-slate-500 text-xs align-top">
                      {item.line_number || index + 1}
                    </td>

                    {/* Vernacular Source & Normalized Description */}
                    <td className="py-3 px-3 align-top space-y-1">
                      {/* Vernacular Source Badge */}
                      {item.raw_text_on_paper && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50 px-2 py-0.5 rounded font-semibold truncate max-w-[260px]">
                            📝 &quot;{item.raw_text_on_paper}&quot;
                          </span>
                        </div>
                      )}

                      {/* Normalized Editable Product Name */}
                      <input
                        type="text"
                        value={item.product_name_normalized || ''}
                        onChange={(e) =>
                          onItemChange(index, 'product_name_normalized', e.target.value)
                        }
                        placeholder="Product Name"
                        className="w-full font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-emerald-600 focus:bg-white dark:focus:bg-zinc-800 rounded px-1 py-0.5 transition-colors focus:outline-hidden"
                      />

                      {item.item_sector && (
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold block">
                          {item.item_sector}
                        </span>
                      )}
                    </td>

                    {/* Quantity & Unit UQC */}
                    <td className="py-3 px-3 align-top space-y-1">
                      {item.raw_quantity && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          Raw: <span className="text-slate-800 dark:text-slate-200 font-medium">{item.raw_quantity}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity ?? 1}
                          onChange={(e) =>
                            onItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded px-1.5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-600 text-right"
                        />

                        <select
                          value={item.unit_uqc || 'PCS'}
                          onChange={(e) => onItemChange(index, 'unit_uqc', e.target.value)}
                          className="bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded px-1.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                        >
                          {UQC_OPTIONS.map((u) => (
                            <option key={u} value={u} className="dark:bg-zinc-900">
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Rate & Math Verification */}
                    <td className="py-3 px-3 align-top space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-mono text-xs">₹</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.unit_price ?? 0}
                          onChange={(e) =>
                            onItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded px-1.5 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-600 text-right"
                        />
                      </div>

                      {/* Math Discrepancy Box */}
                      {isError ? (
                        <div className="bg-red-100/90 dark:bg-red-950/60 border border-red-300 dark:border-red-900 text-red-900 dark:text-red-300 rounded-md p-1.5 text-[10px] space-y-1">
                          <div className="flex items-center gap-1 font-bold">
                            <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
                            <span>Paper ₹{item.written_line_total} ≠ ₹{item.audited_line_total}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onFixSingleMathError(index)}
                            className="w-full bg-red-600 hover:bg-red-700 text-white rounded px-2 py-0.5 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Wrench className="h-2.5 w-2.5" />
                            <span>Fix to ₹{item.audited_line_total}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>₹{item.audited_line_total} audited</span>
                        </div>
                      )}
                    </td>

                    {/* HSN Code & Dynamic Tax Slab */}
                    <td className="py-3 px-3 align-top space-y-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onOpenHsnSearch(index)}
                          className="inline-flex items-center gap-1 bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 text-white px-2 py-0.5 rounded font-mono text-[11px] font-bold shadow-2xs"
                          title="Search HSN Master"
                        >
                          <span>HSN {item.hsn_code || '9999'}</span>
                          <Search className="h-2.5 w-2.5 text-slate-400" />
                        </button>

                        <select
                          value={item.gst_rate ?? 5}
                          onChange={(e) =>
                            onItemChange(index, 'gst_rate', parseFloat(e.target.value))
                          }
                          className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 rounded px-1.5 py-0.5 text-[11px] font-bold focus:outline-hidden"
                        >
                          {GST_SLABS.map((rate) => (
                            <option key={rate} value={rate} className="dark:bg-zinc-900">
                              {rate}% GST
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Alternatives Dropdown */}
                      {item.hsn_alternatives && item.hsn_alternatives.length > 0 && (
                        <select
                          onChange={(e) => {
                            const alt = item.hsn_alternatives.find(
                              (a) => a.hsn_code === e.target.value
                            );
                            if (alt) {
                              onItemChange(index, 'hsn_code', alt.hsn_code);
                              onItemChange(index, 'gst_rate', alt.gst_rate);
                              if (alt.description) {
                                onItemChange(index, 'hsn_description', alt.description);
                              }
                            }
                          }}
                          className="w-full bg-[#FAF8F5] dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 rounded px-1 py-0.5 text-[10px] font-medium"
                        >
                          <option value="">🔄 Alternative HSN Slabs ({item.hsn_alternatives.length})...</option>
                          {item.hsn_alternatives.map((alt, aIdx) => (
                            <option key={aIdx} value={alt.hsn_code} className="dark:bg-zinc-900">
                              HSN {alt.hsn_code}: {alt.description} ({alt.gst_rate}%)
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Dynamic Rule Note */}
                      {item.tax_rule_note && (
                        <div className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900 text-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                          <FileCheck className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[200px]">{item.tax_rule_note}</span>
                        </div>
                      )}
                    </td>

                    {/* Final Row Total with GST */}
                    <td className="py-3 px-3 align-top text-right space-y-0.5">
                      <div className="font-mono-numbers font-bold text-slate-900 dark:text-white text-sm">
                        {formatINR(item.final_line_total_with_gst)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        Taxable: ₹{item.audited_line_total}
                      </div>
                      <div className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400">
                        +₹{(item.cgst_amount + item.sgst_amount).toFixed(2)} GST
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-2 align-top text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteItem(index)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded transition-colors"
                        title="Delete line item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
