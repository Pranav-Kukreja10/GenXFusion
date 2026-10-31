import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode } from 'lucide-react';

export default function Gstr1Modal({
  isOpen,
  onClose,
  gstr1Data,
  invoiceId,
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('full'); // 'full' | 'hsn' | 'b2cs'

  if (!isOpen || !gstr1Data) return null;

  const jsonString = JSON.stringify(gstr1Data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${invoiceId || 'INV'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="px-4 py-3 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center">
              <FileCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                GSTR-1 Portal JSON Payload
              </h3>
              <p className="text-[11px] text-zinc-400">
                GST Offline Tool &amp; GSTN Portal Schema v3.1 Compliant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action & Tab Bar */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'full' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'
              }`}
            >
              Full JSON
            </button>
            <button
              onClick={() => setActiveTab('hsn')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'hsn' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'
              }`}
            >
              HSN Summary
            </button>
            <button
              onClick={() => setActiveTab('b2cs')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'b2cs' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500'
              }`}
            >
              B2CS Consumers
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg font-medium shadow-xs transition-all text-xs cursor-pointer active:scale-[0.98]"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .json</span>
            </button>
          </div>
        </div>

        {/* JSON Code Display */}
        <div className="p-4 flex-1 overflow-y-auto bg-zinc-950 font-mono text-xs text-zinc-200">
          <pre className="overflow-x-auto whitespace-pre leading-relaxed">
            {activeTab === 'full' && jsonString}
            {activeTab === 'hsn' && JSON.stringify(gstr1Data.hsn || gstr1Data.hsn_summary || {}, null, 2)}
            {activeTab === 'b2cs' && JSON.stringify(gstr1Data.b2cs || {}, null, 2)}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>Schema: GSTN-GSTR1-v3.1</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
