import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  FolderOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import ScanProgress from './ScanProgress';
import { compressImage } from '../utils/compressor';

export default function UploadCard({
  onScanImage,
  isScanning = false,
  scanStep = 1,
  error = null,
  scanSuccess = false,
  scannedItemCount = 4,
  onViewDashboard,
  onResetScan,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Automatically start scanning when file is added
  const handleProcessFile = async (file) => {
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1280, 0.75);
      setPreviewUrl(compressed.dataUrl);
      if (onScanImage) {
        onScanImage(compressed.file, compressed.dataUrl);
      }
    } catch (err) {
      console.warn('Fallback to uncompressed FileReader:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result);
        if (onScanImage) {
          onScanImage(file, reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleRetry = () => {
    if (onResetScan) onResetScan();
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-[640px] mx-auto flex flex-col items-center">
      {/* Hidden Native File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Upload Dropzone Card (~640px Max Width) */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full rounded-2xl p-5 sm:p-7 transition-all duration-200 relative border-2 border-dashed ${
          error
            ? 'border-red-500 bg-red-50/20 dark:bg-red-950/15'
            : scanSuccess
            ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm'
            : isDragOver
            ? 'border-[#059669] dark:border-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 scale-[1.01] shadow-md'
            : isScanning
            ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/15 shadow-sm'
            : 'border-[#059669] dark:border-emerald-500/80 bg-white dark:bg-[#131822] bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-700 dark:hover:border-emerald-400 shadow-sm'
        }`}
        style={{
          boxShadow:
            '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* =================================================================== */}
        {/* STATE 1: SCANNING STATE (Thumbnail, Progress bar, 4 Steps)           */}
        {/* =================================================================== */}
        {isScanning ? (
          <ScanProgress scanStep={scanStep} previewUrl={previewUrl} />
        ) : error ? (
          /* =================================================================== */
          /* STATE 2: ERROR STATE                                               */
          /* =================================================================== */
          <div className="flex flex-col items-center py-4 text-center space-y-3 animate-fadeIn">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center ring-4 ring-red-50 dark:ring-red-900/20">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-[clamp(0.95rem,1.4vw,1.15rem)]">
                Couldn't read this photo. Try again with better light.
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-sm mx-auto">
                {typeof error === 'string' && error.length < 120 ? error : 'Please ensure bill handwriting is clear, flat, and well illuminated.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer mt-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
          </div>
        ) : scanSuccess ? (
          /* =================================================================== */
          /* STATE 3: SUCCESS STATE                                             */
          /* =================================================================== */
          <div className="flex flex-col items-center py-4 text-center space-y-3 animate-fadeIn">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#059669] dark:text-emerald-400 flex items-center justify-center ring-4 ring-emerald-50 dark:ring-emerald-900/20 shadow-inner">
              <CheckCircle2 className="h-8 w-8 stroke-[2.3]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-[clamp(1rem,1.5vw,1.25rem)]">
                Bill scanned: {scannedItemCount} items found
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                Math audited and GST tax slabs verified
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onViewDashboard}
                className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <span>Open in Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 border border-[#E7E2DA] dark:border-[#232B3A] bg-white dark:bg-[#131822] text-slate-700 dark:text-slate-300 hover:text-emerald-600 font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
              >
                <span>Scan Another</span>
              </button>
            </div>
          </div>
        ) : (
          /* =================================================================== */
          /* STATE 4: IDLE & DRAG-OVER STATE                                     */
          /* =================================================================== */
          <div className="flex flex-col items-center text-center">
            {/* Cloud Upload Icon in Emerald Circle */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[#059669] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-emerald-50 dark:ring-emerald-900/20 transition-transform duration-200 ${
                isDragOver ? 'scale-110 -translate-y-1' : 'group-hover:scale-105'
              }`}
            >
              <UploadCloud className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            {/* Prompt Text */}
            <h2 className="font-semibold text-slate-900 dark:text-white mb-1 text-[clamp(0.95rem,1.4vw,1.15rem)]">
              {isDragOver ? 'Drop your bill photo right here' : 'Drag & drop your bill photo here'}
            </h2>
            <p className="text-[clamp(0.7rem,0.9vw,0.8rem)] text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase mb-5">
              JPG, PNG, WEBP
            </p>

            {/* Two Action Buttons: Camera (Solid) & Browse File (Outlined) */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="bg-[#059669] hover:bg-[#047857] text-white font-semibold text-[clamp(0.8125rem,1vw,0.9375rem)] px-5 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <Camera className="h-4 w-4" />
                <span>Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white dark:bg-[#131822] border border-[#059669] dark:border-emerald-500 text-[#059669] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-[clamp(0.8125rem,1vw,0.9375rem)] px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all duration-150 cursor-pointer active:scale-95 shadow-2xs"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Browse File</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Under the Card: Prominent Full-Width Button "View Dashboard →" */}
      <div className="w-full mt-3 sm:mt-3.5">
        <button
          type="button"
          onClick={onViewDashboard}
          className="w-full bg-[#1E293B] hover:bg-[#0F172A] dark:bg-[#131822] dark:hover:bg-[#1B2230] text-white border border-transparent dark:border-[#232B3A] font-semibold text-[clamp(0.8125rem,1vw,0.9375rem)] py-3 sm:py-3.5 px-6 rounded-xl shadow-md transition-all duration-150 flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.99]"
        >
          <span>View Dashboard</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-150" />
        </button>
      </div>
    </div>
  );
}
