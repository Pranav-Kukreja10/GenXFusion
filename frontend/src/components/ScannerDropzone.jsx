import React, { useState, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  Layers,
  FileText,
  Sliders,
  AlertCircle,
  Smartphone,
} from 'lucide-react';
import UploadCard from './UploadCard';
import MetadataForm from './MetadataForm';
import { compressImage } from '../utils/compressor';

export default function ScannerDropzone({
  invoice,
  onInvoiceChange,
  onScanImage,
  isScanning,
  error,
  hasScannedInvoice = true,
  scanStep = 1,
  onTriggerScan,
  userProfile = null,
}) {
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'metadata'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(invoice?.raw_image_base64 || null);
  const [compressionStats, setCompressionStats] = useState(null);
  const [bypassCache, setBypassCache] = useState(false);
  const [viewMode, setViewMode] = useState('enhanced'); // 'enhanced' | 'raw' | 'split'
  const [splitSliderPos, setSplitSliderPos] = useState(50);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelected = (file, dataUrl, stats) => {
    setSelectedFile(file);
    setPreviewUrl(dataUrl);
    setCompressionStats(stats);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCompressionStats(null);
  };

  const handleTriggerScan = (forceBypass) => {
    if (!previewUrl && !selectedFile) {
      if (onTriggerScan) onTriggerScan(forceBypass);
      return;
    }
    onScanImage(selectedFile, previewUrl, forceBypass);
  };

  const handleStage2QuickUpload = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1280, 0.72);
      onScanImage(compressed.file, compressed.dataUrl, bypassCache);
    } catch {
      onScanImage(file, null, bypassCache);
    }
  };

  const rawImage = invoice?.raw_image_base64 || previewUrl;
  const enhancedImage = invoice?.enhanced_image_base64 || rawImage;

  // =========================================================================
  // STAGE 1: Centered Upload Card & Metadata Form
  // =========================================================================
  if (!hasScannedInvoice) {
    return (
      <div className="space-y-4">
        {/* Upload Card with Rotate, Crop & Remove, and Scan Stepper */}
        <UploadCard
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          onFileSelected={handleFileSelected}
          onClearFile={handleClearFile}
          isScanning={isScanning}
          scanStep={scanStep}
          onTriggerScan={handleTriggerScan}
          bypassCache={bypassCache}
          onToggleBypassCache={setBypassCache}
          compressionStats={compressionStats}
        />

        {/* Bill Metadata Form */}
        <MetadataForm
          invoice={invoice}
          onInvoiceChange={onInvoiceChange}
          isAutoFilled={Boolean(invoice?.merchant_name && invoice?.raw_date_written)}
          userProfile={userProfile}
        />
      </div>
    );
  }

  // =========================================================================
  // STAGE 2: Left-Panel Visual Inspector & Metadata Card
  // =========================================================================
  return (
    <div className="bg-white dark:bg-[#12151C] border border-[#E5E0D8] dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-colors">
      {/* Hidden File Inputs for quick in-dashboard re-capture */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files && handleStage2QuickUpload(e.target.files[0])}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => e.target.files && handleStage2QuickUpload(e.target.files[0])}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Panel Tab Header */}
      <div className="p-2 border-b border-[#E5E0D8] dark:border-zinc-800 bg-[#FAF8F5] dark:bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
        {/* Quick Re-scan Strip */}
        <div className="flex items-center justify-between bg-[#FAF8F5] dark:bg-zinc-900/60 p-2 rounded-lg border border-[#E5E0D8] dark:border-zinc-800">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Re-capture receipt:
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isScanning}
              className="inline-flex items-center gap-1 bg-[#059669] hover:bg-[#047857] text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Smartphone className="h-3 w-3" />
              <span>Camera</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="inline-flex items-center gap-1 bg-white dark:bg-zinc-800 border border-[#D5CEC3] dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="h-3 w-3 text-slate-500" />
              <span>Browse</span>
            </button>
          </div>
        </div>

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
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
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
                className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Edit Metadata →
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Embedded Metadata Form */}
        {activeTab === 'metadata' && (
          <div className="space-y-3">
            <MetadataForm
              invoice={invoice}
              onInvoiceChange={onInvoiceChange}
              isAutoFilled={true}
              userProfile={userProfile}
            />
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className="w-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              ← Back to Image Visualizer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
