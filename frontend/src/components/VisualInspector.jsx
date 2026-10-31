import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  Sliders,
  Smartphone,
  UploadCloud,
  AlertCircle,
  Eye,
  Move,
} from 'lucide-react';

export default function VisualInspector({
  invoice,
  hoveredRowIndex = null,
  onScanImage,
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
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Download receipt image
  const handleDownloadImage = () => {
    const targetSrc = currentImageSrc || rawImage;
    if (!targetSrc) return;
    const a = document.createElement('a');
    a.href = targetSrc;
    a.download = `receipt-${invoice?.invoice_id || 'INV-2026'}-${viewMode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Re-capture handlers
  const handleFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (file && onScanImage) {
      const reader = new FileReader();
      reader.onload = () => {
        onScanImage(file, reader.result, true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Row indicator height overlay
  const totalItems = invoice?.active_items?.length || 1;
  const overlayTopPercent =
    hoveredRowIndex !== null
      ? Math.min(Math.max(16 + (hoveredRowIndex / totalItems) * 68, 12), 85)
      : null;

  return (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col transition-colors ${
        isFullscreen ? 'p-4 bg-slate-950 dark:bg-black fixed inset-0 z-50 rounded-none' : ''
      }`}
      role="region"
      aria-label="Receipt Image Viewer"
    >
      {/* Hidden inputs for Re-capture */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFilePicked}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilePicked}
        accept="image/*"
        className="hidden"
      />

      {/* Top Header Strip: Mode Selector & Action Icons */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="h-6 w-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
            <Eye className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Receipt Image
          </span>
          {hoveredRowIndex !== null && (
            <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded">
              Row #{hoveredRowIndex + 1}
            </span>
          )}
        </div>

        {/* View Mode Segmented Controls: Raw Photo | Shadow-Removed | Split */}
        <div
          className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-semibold"
          role="tablist"
          aria-label="Image view mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'raw'}
            onClick={() => setViewMode('raw')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'raw'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Raw Photo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'enhanced'}
            onClick={() => setViewMode('enhanced')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'enhanced'
                ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Shadow-Removed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'split'}
            onClick={() => setViewMode('split')}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Split View
          </button>
        </div>

        {/* Image Tools: Rotate 90, Zoom In, Out, Reset, Fullscreen, Download */}
        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={handleRotate90}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Rotate 90° clockwise"
            aria-label="Rotate image 90 degrees"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          {(zoomLevel !== 1 || rotation !== 0) && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer text-emerald-600 font-bold"
              title="Reset Zoom & Rotation"
              aria-label="Reset Zoom and Rotation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDownloadImage}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Download Image"
            aria-label="Download Image"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport Area */}
      <div
        className={`relative min-h-[380px] max-h-[580px] bg-slate-950 flex items-center justify-center overflow-hidden select-none border-b border-slate-200 dark:border-slate-800 ${
          zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Loading Indicator */}
        {(isScanning || !imageLoaded) && currentImageSrc && !imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20 space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-emerald-400">Loading receipt preview...</span>
          </div>
        )}

        {/* Error Fallback State */}
        {(imageError || !currentImageSrc) && (
          <div className="p-6 text-center space-y-3 max-w-sm">
            <div className="h-12 w-12 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Receipt Image Unavailable</p>
              <p className="text-xs text-slate-400 mt-1">
                Upload or capture a bill photo to view side-by-side with audited line items.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Re-capture</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5 text-slate-400" />
                <span>Browse</span>
              </button>
            </div>
          </div>
        )}

        {/* Image Display Modes */}
        {!imageError && currentImageSrc && (
          <>
            {/* RAW or Shadow-Removed Standard View */}
            {viewMode !== 'split' && (
              <div
                className="w-full h-full p-2 flex items-center justify-center transition-transform duration-75 ease-out"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={currentImageSrc}
                  alt={viewMode === 'raw' ? 'Raw Receipt' : 'Shadow-Removed Receipt'}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className="max-h-[520px] w-auto max-w-full object-contain rounded shadow-lg pointer-events-none"
                />

                {/* Filter Label Badge */}
                <div className="absolute top-3 left-3 pointer-events-none">
                  {viewMode === 'raw' ? (
                    <span className="bg-slate-900/90 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/40 shadow-xs">
                      RAW CAMERA PHOTO
                    </span>
                  ) : (
                    <span className="bg-emerald-950/90 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/40 shadow-xs">
                      SHADOW-REMOVED
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* SPLIT SLIDER VIEW */}
            {viewMode === 'split' && (
              <div
                className="relative w-full h-[460px] select-none overflow-hidden flex items-center justify-center bg-black"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px) rotate(${rotation}deg)`,
                }}
              >
                {/* Background Raw Image */}
                <img
                  src={rawImage || enhancedImage}
                  alt="Raw"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Foreground Shadow-Removed Image Clipped by Slider */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${splitSliderPos}%` }}
                >
                  <img
                    src={enhancedImage || rawImage}
                    alt="Enhanced"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{ width: '100%', maxWidth: 'none' }}
                  />
                  <div className="absolute top-3 left-3 bg-emerald-950/95 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/50">
                    SHADOW-REMOVED
                  </div>
                </div>

                <div className="absolute top-3 right-3 bg-slate-900/95 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/50">
                  RAW PHOTO
                </div>

                {/* Vertical Divider Line with handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize flex items-center justify-center shadow-2xl z-20"
                  style={{ left: `${splitSliderPos}%` }}
                >
                  <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-800 text-[10px]">
                    <Sliders className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Hidden slider range */}
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={splitSliderPos}
                  onChange={(e) => setSplitSliderPos(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-30"
                  aria-label="Split preview comparison slider"
                />
              </div>
            )}

            {/* Table Row Hover Highlight Overlay with Animated Outline Stroke */}
            {hoveredRowIndex !== null && overlayTopPercent !== null && (
              <div
                className="absolute left-6 right-6 rounded pointer-events-none transition-all duration-200 z-10 flex items-center justify-between px-3 py-1 shadow-md bg-emerald-400/15"
                style={{
                  top: `${overlayTopPercent}%`,
                  height: '42px',
                }}
              >
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <rect
                    x="1"
                    y="1"
                    width="99%"
                    height="94%"
                    rx="4"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    className="animate-stroke-march"
                  />
                </svg>
                <span className="relative z-10 text-[10px] font-mono font-bold text-white bg-slate-900/90 px-1.5 py-0.5 rounded shadow">
                  Row #{hoveredRowIndex + 1}
                </span>
                <span className="relative z-10 text-[10px] font-mono font-bold text-emerald-200 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  Active Line
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Move className="h-3 w-3 text-slate-400" />
          <span>Pan: drag when zoomed • Click Rotate to orient</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          {rotation > 0 && (
            <span className="text-slate-600 dark:text-slate-300 font-bold">
              {rotation}°
            </span>
          )}
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
            {Math.round(zoomLevel * 100)}% Zoom
          </span>
        </div>
      </div>
    </div>
  );
}
