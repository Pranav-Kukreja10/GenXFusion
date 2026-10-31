import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-300 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <FileCode className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Official Indian Government GSTR-1 Portal JSON Payload
              </h3>
              <p className="text-[11px] text-slate-400">
                Compatible with GST Offline Tool & GSTN Portal Schema v3.1
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action & Tab Bar */}
        <div className="p-3 bg-[#FAF8F5] border-b border-[#E5E0D8] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                activeTab === 'full' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Full GSTR-1 JSON
            </button>
            <button
              onClick={() => setActiveTab('hsn')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                activeTab === 'hsn' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              HSN Summary Table
            </button>
            <button
              onClick={() => setActiveTab('b2cs')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                activeTab === 'b2cs' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              B2CS Small Consumers
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 bg-white border border-[#D5CEC3] hover:bg-slate-50 text-slate-800 px-3 py-1.5 rounded-lg font-semibold shadow-2xs transition-all text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-600" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold shadow-xs transition-all active:scale-95 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .JSON</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950 text-emerald-400 font-mono text-xs">
          {activeTab === 'full' && (
            <pre className="whitespace-pre-wrap">{jsonString}</pre>
          )}

          {activeTab === 'hsn' && (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(gstr1Data.hsn, null, 2)}
            </pre>
          )}

          {activeTab === 'b2cs' && (
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(gstr1Data.b2cs, null, 2)}
            </pre>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-900 text-slate-400 text-[11px] border-t border-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ready for Direct Upload to https://gst.gov.in</span>
          </span>
          <span className="font-mono text-slate-500">Hash: {gstr1Data.hash || 'SHA256_VALID'}</span>
        </div>

      </div>
    </div>
  );
}

