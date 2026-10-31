import React from 'react';
import {
  Plus,
  ListOrdered,
  FileQuestion,
} from 'lucide-react';
import LineItemRow from './LineItemRow';

export default function LedgerTable({
  invoice,
  onItemChange,
  onFixSingleMathError,
  onOpenHsnSearch,
  onAddItem,
  onDeleteItem,
  onToggleStrikeOut,
  hoveredRowIndex,
  setHoveredRowIndex,
  isRecalculating: _isRecalculating = false,
}) {
  const activeItems = invoice?.active_items || [];
  const buyerState = invoice?.pos || invoice?.buyer_state_code || '07';
  const sellerState = invoice?.seller_state_code || '07';
  const isInterState = buyerState !== sellerState;

  return (
    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col transition-colors">
      
      {/* =================================================================== */}
      {/* 1. Sticky Table Header Strip with Glassmorphism                     */}
      {/* =================================================================== */}
      <div className="sticky top-0 z-20 px-5 sm:px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold">
            <ListOrdered className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Itemized Bill
              </h2>
              <span className="text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-normal hidden sm:block">
              Click any item description, quantity, or price to edit
            </p>
          </div>
        </div>

        {/* "+ Add Item" Header Action Button */}
        <button
          type="button"
          onClick={onAddItem}
          className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium transition-all shadow-xs active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5"
          aria-label="Add new line item to bill"
        >
          <Plus className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600" />
          <span>Add Item</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 2. Empty State View                                                 */}
      {/* =================================================================== */}
      {activeItems.length === 0 ? (
        <div className="py-14 px-4 text-center space-y-3">
          <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-700">
            <FileQuestion className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
              No items in bill
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Scan a receipt photo or click below to add line items by hand.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 px-3.5 py-2 rounded-lg text-xs font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add First Item</span>
          </button>
        </div>
      ) : (
        /* =================================================================== */
        /* 3. Interactive Line-Item Table                                      */
        /* =================================================================== */
        <div className="w-full overflow-x-auto lg:overflow-x-visible">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                <th scope="col" className="py-2.5 px-2 text-center w-8">#</th>
                <th scope="col" className="py-2.5 px-2">Item Name</th>
                <th scope="col" className="py-2.5 px-2 w-32">Quantity</th>
                <th scope="col" className="py-2.5 px-2 w-28">Unit Price</th>
                <th scope="col" className="py-2.5 px-2 w-40">Tax Rate</th>
                <th scope="col" className="py-2.5 px-2 text-right w-24">Amount</th>
                <th scope="col" className="py-2.5 px-1 text-center w-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {activeItems.map((item, index) => (
                <LineItemRow
                  key={item.row_id || item.line_number || index}
                  item={item}
                  index={index}
                  onItemChange={onItemChange}
                  onFixError={onFixSingleMathError}
                  onDelete={onDeleteItem}
                  onOpenHsnSearch={onOpenHsnSearch}
                  onToggleStrikeOut={onToggleStrikeOut}
                  isHovered={hoveredRowIndex === index}
                  onHover={setHoveredRowIndex}
                  onLeaveHover={() => setHoveredRowIndex(null)}
                  isInterState={isInterState}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info Strip */}
      {activeItems.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>{activeItems.length} lines audited</span>
          <button
            type="button"
            onClick={onAddItem}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 font-medium cursor-pointer transition-colors"
          >
            + Add item
          </button>
        </div>
      )}
    </div>
  );
}
