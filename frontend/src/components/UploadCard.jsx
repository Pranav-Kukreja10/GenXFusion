import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  FolderOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import ScanConversion from './ScanConversion';
import { useScanStages } from '../hooks/useScanStages';
import { compressImage } from '../utils/compressor';

/**
 * UploadCard Component
 * 
 * Houses the bill dropzone and converts to <ScanConversion /> during active scanning.
 * Enhanced with 3D desktop cursor tilt, gentle cloud float, and marching dashed border.
 */
export default function UploadCard({
  onScanImage,
  isScanning = false,
  scanStep = 1,
  error = null,
  scanSuccess = false,
  scannedItemCount = 4,
  onViewDashboard,
  onResetScan,
  onTryDemo = null,
  scanResult = null,
  isDemo = false,
  onReplayAnimation = null,
  previewUrlOverride = null,
  onScanConversionDone = null,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tiltStyle, setTiltStyle] = useState({});

  const cardRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Hook driving the 4 conversion stages with minimum durations & pipeline sync
  const {
    stage,
    progress,
    skip: handleSkip,
    reset: handleResetStages,
    prefersReducedMotion,
  } = useScanStages({
    isActive: isScanning,
    backendStep: scanStep,
    backendDone: Boolean(scanResult),
    isError: Boolean(error),
    onDone: onScanConversionDone,
    isDemo: isDemo,
  });

  // Desktop 3D Card Tilt towards cursor (max 3deg, disabled on touch and reduced motion)
  const handleMouseMoveTilt = (e) => {
    if (prefersReducedMotion || isScanning) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const maxTilt = 3;
    const rotateY = (x / (rect.width / 2)) * maxTilt;
    const rotateX = -(y / (rect.height / 2)) * maxTilt;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`,
      transition: 'transform 80ms ease-out',
    });
  };

  const handleMouseLeaveTilt = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
      transition: 'transform 250ms ease-out',
    });
  };

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
    handleResetStages();
    if (onResetScan) onResetScan();
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const activePreview = previewUrlOverride || previewUrl;

  return (
    <div className="w-full max-w-[620px] mx-auto flex flex-col items-center">
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

      {/* Main Upload Dropzone Card with Desktop Tilt */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMoveTilt}
        onMouseLeave={handleMouseLeaveTilt}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full rounded-2xl p-7 sm:p-10 transition-all duration-200 relative border ${
          error
            ? 'border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20'
            : scanSuccess
            ? 'border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-xs'
            : isDragOver
            ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-md scale-[1.005]'
            : isScanning
            ? 'border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-xs'
            : 'border-zinc-200/90 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md hover:border-zinc-400 dark:hover:border-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
        }`}
        style={{
          boxShadow:
            '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
          ...tiltStyle,
        }}
      >
        {/* =================================================================== */}
        {/* STATE 1: SCANNING ANIMATION (ScanConversion Component)              */}
        {/* =================================================================== */}
        {isScanning ? (
          <ScanConversion
            imageUrl={activePreview}
            stage={stage}
            progress={progress}
            result={scanResult}
            onDone={onScanConversionDone}
            error={error}
            onRetry={handleRetry}
            onSkip={handleSkip}
            isDemo={isDemo}
            prefersReducedMotion={prefersReducedMotion}
          />
        ) : error ? (
          /* =================================================================== */
          /* STATE 2: ERROR STATE                                               */
          /* =================================================================== */
          <div className="flex flex-col items-center py-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800">
              <AlertCircle className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">
                Couldn&apos;t read this photo. Try again with better light.
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1 max-w-sm mx-auto">
                {typeof error === 'string' && error.length < 120
                  ? error
                  : 'Please ensure bill handwriting is clear, flat, and well illuminated.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="btn-tactile inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs px-3.5 py-2 rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        ) : scanSuccess ? (
          /* =================================================================== */
          /* STATE 3: SUCCESS STATE                                             */
          /* =================================================================== */
          <div className="flex flex-col items-center py-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <CheckCircle2 className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                Bill scanned: {scannedItemCount} items found
              </h3>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Math audited and GST tax slabs verified
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onViewDashboard}
                className="btn-tactile inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm px-4 py-2 rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <span>Open in Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="btn-tactile inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 font-medium text-xs sm:text-sm px-4 py-2 rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <span>Scan Another</span>
              </button>
            </div>

            {/* Replay animation link for presentations */}
            {onReplayAnimation && (
              <button
                type="button"
                onClick={onReplayAnimation}
                className="btn-tactile p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Replay animation</span>
              </button>
            )}
          </div>
        ) : (
          /* =================================================================== */
          /* STATE 4: IDLE & DRAG-OVER STATE (Gentle floating cloud icon)        */
          /* =================================================================== */
          <div className="flex flex-col items-center text-center">
            {/* Upload Icon in circle */}
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 mb-4 ${
                isDragActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 scale-110'
                  : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 group-hover:scale-105'
              }`}
            >
              <UploadCloud className="h-6 w-6 stroke-[1.8]" />
            </div>

            {/* Prompt Text */}
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1 text-sm sm:text-base">
              {isDragOver ? 'Drop bill photo here' : 'Drag and drop your bill photo here'}
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6">
              Supports clear JPG, PNG, or WEBP photos
            </p>

            {/* Two Action Buttons: Camera (Solid Obsidian) & Browse File (Hairline Outline) */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="btn-tactile bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm px-4 py-2 rounded-lg shadow-xs flex items-center gap-2 transition-all duration-150 cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-tactile bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-xs sm:text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-150 cursor-pointer shadow-xs"
              >
                <FolderOpen className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Choose File</span>
              </button>
            </div>

            {/* Secondary Action: Try a demo bill */}
            {onTryDemo && (
              <button
                type="button"
                onClick={onTryDemo}
                className="btn-tactile text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium underline underline-offset-2 transition-colors mt-5 cursor-pointer"
              >
                Try with a sample bill
              </button>
            )}
          </div>
        )}
      </div>

      {/* Understated Secondary Action: "Go to Dashboard" */}
      <div className="mt-4">
        <button
          type="button"
          onClick={onViewDashboard}
          className="btn-tactile inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-3.5 py-1.5 rounded-lg border border-zinc-200/90 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all duration-150 shadow-xs active:scale-[0.98] cursor-pointer"
        >
          <span>Go to Invoice Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
