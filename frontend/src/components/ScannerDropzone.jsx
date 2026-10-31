import React, { useState, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  Layers,
  FileText,
  Calendar,
  Building,
  Hash,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { compressImage } from '../utils/compressor';

export default function ScannerDropzone({
  invoice,
  onInvoiceChange,
  onScanImage,
  isScanning,
  error,
}) {
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'metadata'
  const [isDragging, setIsDragging] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);
  const [viewMode, setViewMode] = useState('enhanced'); // 'enhanced' | 'raw' | 'split'
  const [splitSliderPos, setSplitSliderPos] = useState(50);
  const [bypassCache, setBypassCache] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleProcessFile = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1280, 0.72);
      setCompressionStats({
        originalFormatted: compressed.originalFormatted,
        compressedFormatted: compressed.compressedFormatted,
        savingsPercent: compressed.savingsPercent,
      });
      onScanImage(compressed.file, compressed.dataUrl, bypassCache);
    } catch (err) {
      console.error('Image compression error:', err);
      onScanImage(file, null, bypassCache);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleMetadataChange = (field, val) => {
    if (!invoice) return;
    onInvoiceChange({
      ...invoice,
      [field]: val,
    });
  };

  const rawImage = invoice?.raw_image_base64 || invoice?.enhanced_image_base64;
  const enhancedImage = invoice?.enhanced_image_base64 || rawImage;

  return (
    <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-xl shadow-2xs overflow-hidden flex flex-col transition-colors">
      
      {/* Panel Tab Header */}
      <div className="p-2 border-b border-[#E5E0D8] dark:border-zinc-800 bg-[#FAF8F5] dark:bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'visual'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Visual Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metadata')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'metadata'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span>Metadata</span>
            {invoice?.merchant_name && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            )}
          </button>
        </div>

        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 px-1">
          {invoice?.invoice_id || 'NO_ID'}
        </span>
      </div>

      <div className="p-4 space-y-4">
        
        {/* Sleek Capture / Upload Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border border-dashed rounded-xl p-3 text-center transition-all ${
            isDragging
              ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-[#D5CEC3] dark:border-zinc-700 bg-[#FCFBF9] dark:bg-zinc-900/30 hover:border-emerald-500'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-[#D5CEC3] dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
            >
              <UploadCloud className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>Browse File</span>
            </button>
          </div>

          {/* Low-End 4G Compression Banner */}
          {compressionStats && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-medium animate-fadeIn">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                Compressed <strong>{compressionStats.originalFormatted}</strong> →{' '}
                <strong>{compressionStats.compressedFormatted}</strong> ({compressionStats.savingsPercent}% saved)
              </span>
            </div>
          )}

          {/* Quick Cache Bypass Checkbox */}
          <div className="mt-2 text-center">
            <label className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bypassCache}
                onChange={(e) => setBypassCache(e.target.checked)}
                className="rounded border-slate-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 h-3 w-3"
              />
              <span>Force Re-scan (Bypass Cache)</span>
            </label>
          </div>
        </div>

        {/* Scan Progress Status */}
        {isScanning && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Gemini Vision & OpenCV Preprocessing...</span>
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-2.5 flex items-start gap-2 text-red-800 dark:text-red-300 text-xs">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-tight">{error}</p>
          </div>
        )}

        {/* Tab 1: Visual Inspector (CLAHE & Raw Photo) */}
        {activeTab === 'visual' && (
          <div className="space-y-2">
            
            {/* View Mode Switcher */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Image Filter:
              </span>
              <div className="flex items-center gap-1 bg-[#F3EFEA] dark:bg-zinc-800 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    viewMode === 'raw'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Raw Photo
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('enhanced')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    viewMode === 'enhanced'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  OpenCV CLAHE
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                    viewMode === 'split'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Split
                </button>
              </div>
            </div>

            {/* Image Preview Box */}
            <div className="relative min-h-[300px] max-h-[420px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
              {viewMode === 'raw' && (
                <div className="w-full h-full p-2 flex items-center justify-center">
                  {rawImage ? (
                    <img
                      src={rawImage}
                      alt="Raw Receipt"
                      className="max-h-[400px] w-auto object-contain rounded"
                    />
                  ) : (
                    <p className="text-xs text-slate-500">No image uploaded</p>
                  )}
                  <div className="absolute top-2 left-2 bg-slate-900/90 text-amber-300 text-[9px] font-mono px-2 py-0.5 rounded">
                    RAW PHOTO
                  </div>
                </div>
              )}

              {viewMode === 'enhanced' && (
                <div className="w-full h-full p-2 flex items-center justify-center">
                  {enhancedImage ? (
                    <img
                      src={enhancedImage}
                      alt="OpenCV CLAHE"
                      className="max-h-[400px] w-auto object-contain rounded"
                    />
                  ) : (
                    <p className="text-xs text-slate-500">No enhanced image</p>
                  )}
                  <div className="absolute top-2 left-2 bg-emerald-950/90 text-emerald-300 text-[9px] font-mono px-2 py-0.5 rounded border border-emerald-700/50">
                    OPENCV CLAHE ENHANCED
                  </div>
                </div>
              )}

              {viewMode === 'split' && (
                <div className="relative w-full h-[320px] select-none overflow-hidden flex items-center justify-center bg-black">
                  <img
                    src={rawImage}
                    alt="Raw"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${splitSliderPos}%` }}
                  >
                    <img
                      src={enhancedImage}
                      alt="Enhanced"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      style={{ width: '100%', maxWidth: 'none' }}
                    />
                    <div className="absolute top-2 left-2 bg-emerald-900/90 text-emerald-200 text-[9px] font-mono px-1.5 py-0.5 rounded">
                      CLAHE
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-slate-900/90 text-amber-300 text-[9px] font-mono px-1.5 py-0.5 rounded">
                    RAW
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize flex items-center justify-center shadow-lg"
                    style={{ left: `${splitSliderPos}%` }}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-slate-800 text-[9px]">
                      <Sliders className="h-3 w-3" />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={splitSliderPos}
                    onChange={(e) => setSplitSliderPos(Number(e.target.value))}
                    className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10"
                  />
                </div>
              )}
            </div>

            {/* Quick Metadata Summary Strip */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1">
              <span className="truncate max-w-[200px] font-semibold text-slate-700 dark:text-slate-300">
                {invoice?.merchant_name || 'No Store Name'}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('metadata')}
                className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
              >
                Edit Metadata →
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Metadata Form */}
        {activeTab === 'metadata' && (
          <div className="space-y-3 animate-fadeIn text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                <Building className="h-3 w-3" /> Store / Merchant Name:
              </label>
              <input
                type="text"
                value={invoice?.merchant_name || ''}
                onChange={(e) => handleMetadataChange('merchant_name', e.target.value)}
                placeholder="Merchant Name"
                className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" /> Raw Written Date:
                </label>
                <input
                  type="text"
                  value={invoice?.raw_date_written || ''}
                  onChange={(e) => handleMetadataChange('raw_date_written', e.target.value)}
                  placeholder="e.g. 31/10/26"
                  className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2 py-1.5 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Calendar className="h-3 w-3" /> ISO GST Date:
                </label>
                <input
                  type="date"
                  value={invoice?.normalized_date_iso || ''}
                  onChange={(e) => handleMetadataChange('normalized_date_iso', e.target.value)}
                  className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2 py-1.5 font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                <Hash className="h-3 w-3" /> Invoice ID:
              </label>
              <input
                type="text"
                value={invoice?.invoice_id || ''}
                onChange={(e) => handleMetadataChange('invoice_id', e.target.value)}
                placeholder="e.g. INV-2026-8841"
                className="w-full bg-[#FAF8F5] dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className="w-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 py-1.5 rounded-lg text-xs font-semibold transition-colors mt-2"
            >
              ← Back to Image Visualizer
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
