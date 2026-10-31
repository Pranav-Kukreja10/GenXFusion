import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  AlertCircle,
  Eye,
} from 'lucide-react';

export default function VisualInspector({
  invoice,
  hoveredRowIndex = null,
  onScanImage: _onScanImage,
  isScanning = false,
  onCloseDrawer: _onCloseDrawer = null,
}) {
  const [viewMode, setViewMode] = useState('enhanced'); // 'enhanced' | 'raw' | 'split'
  const [splitSliderPos, setSplitSliderPos] = useState(50);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef(null);

  // Images resolution with fallback support
  const rawImage =
    invoice?.raw_image_base64 ||
    invoice?.raw_image_b64 ||
    invoice?.raw_image ||
    null;

  const enhancedImage =
    invoice?.enhanced_image_base64 ||
    invoice?.enhanced_image_b64 ||
    invoice?.enhanced_image ||
    rawImage;

  // Active image to display based on viewMode
  const currentImageSrc = viewMode === 'raw' ? rawImage : enhancedImage;

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(Number((z + 0.25).toFixed(2)), 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate90 = () => {
    setRotation((r) => (r + 90) % 360);
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPanPosition({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleDownloadImage = () => {
    if (!currentImageSrc) return;
    const a = document.createElement('a');
    a.href = currentImageSrc;
    a.download = `receipt-${invoice?.invoice_id || 'scan'}-${viewMode}.jpg`;
    a.click();
  };

  return (
    <div
      ref={containerRef}
      className={`bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col transition-all duration-200 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
      role="region"
      aria-label="Physical Bill Receipt Photo"
    >
      {/* 1. Header Toolbar Strip with Glassmorphism */}
      <div className="px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between gap-2">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-zinc-500 shrink-0" />
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Receipt Photo
          </span>
        </div>

        {/* View Mode Segmented Pill Bar */}
        <div
          className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-medium"
          role="tablist"
          aria-label="Image view mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'raw'}
            onClick={() => setViewMode('raw')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
              viewMode === 'raw'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Original
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'enhanced'}
            onClick={() => setViewMode('enhanced')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
              viewMode === 'enhanced'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-medium'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Cleaned
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'split'}
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
              viewMode === 'split'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-medium'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Compare
          </button>
        </div>

        {/* Image Tools: Rotate 90, Zoom In, Out, Reset, Fullscreen, Download */}
        <div className="flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400">
          <button
            type="button"
            onClick={handleRotate90}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Rotate 90° clockwise"
            aria-label="Rotate image 90 degrees"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          {(zoomLevel !== 1 || rotation !== 0) && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-900 dark:text-zinc-100 font-semibold"
              title="Reset Zoom & Rotation"
              aria-label="Reset Zoom and Rotation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadImage}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Download Image"
            aria-label="Download Image"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className={`relative min-h-[380px] max-h-[560px] bg-zinc-900/5 dark:bg-zinc-950 flex items-center justify-center overflow-hidden select-none ${
          zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Loading Indicator */}
        {(isScanning || !imageLoaded) && currentImageSrc && !imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xs z-20 space-y-2">
            <div className="h-6 w-6 rounded-full border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">Loading preview...</span>
          </div>
        )}

        {/* Error Fallback State */}
        {(imageError || !currentImageSrc) && (
          <div className="p-6 text-center space-y-3 max-w-sm">
            <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-700">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Receipt Image Unavailable</p>
              <p className="text-xs text-zinc-400 mt-1">
                Upload or capture a bill photo to view side-by-side with audited line items.
              </p>
            </div>
          </div>
        )}

        {/* View Mode: Split Comparison */}
        {currentImageSrc && !imageError && viewMode === 'split' && (
          <div className="relative w-full h-full min-h-[380px] flex items-center justify-center overflow-hidden">
            {/* Base Enhanced Image */}
            <img
              src={enhancedImage}
              alt="Enhanced shadow removed bill"
              className="absolute max-w-full max-h-[540px] object-contain transition-transform duration-100"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
              }}
            />

            {/* Clipped Raw Image on Left */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center"
              style={{ clipPath: `inset(0 ${100 - splitSliderPos}% 0 0)` }}
            >
              <img
                src={rawImage}
                alt="Raw handwritten bill"
                className="max-w-full max-h-[540px] object-contain"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                }}
              />
            </div>

            {/* Split Divider Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-zinc-900 dark:bg-zinc-100 z-10 pointer-events-none"
              style={{ left: `${splitSliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-md text-[10px] font-mono">
                ↔
              </div>
            </div>

            {/* Split Slider Range */}
            <input
              type="range"
              min="5"
              max="95"
              value={splitSliderPos}
              onChange={(e) => setSplitSliderPos(Number(e.target.value))}
              className="absolute inset-x-4 bottom-3 z-20 opacity-40 hover:opacity-100 transition-opacity cursor-ew-resize accent-zinc-900 dark:accent-zinc-100"
              aria-label="Split slider between raw and enhanced photo"
            />
          </div>
        )}

        {/* View Mode: Single Image (Enhanced or Raw) */}
        {currentImageSrc && !imageError && viewMode !== 'split' && (
          <img
            src={currentImageSrc}
            alt={viewMode === 'raw' ? 'Original paper receipt' : 'Cleaned receipt photo'}
            onLoad={() => {
              setImageLoaded(true);
              setImageError(false);
            }}
            onError={() => {
              setImageLoaded(true);
              setImageError(true);
            }}
            className="max-w-full max-h-[540px] object-contain transition-transform duration-100"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
            }}
          />
        )}

        {/* Hovered Row Sync Callout */}
        {hoveredRowIndex !== null && (
          <div className="absolute bottom-3 left-3 z-20 bg-zinc-900/90 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded-md border border-zinc-700 shadow-xs">
            Viewing Line Item #{hoveredRowIndex + 1}
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs font-mono text-zinc-400">
        <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
        <span>Enhanced Photo</span>
      </div>
    </div>
  );
}
