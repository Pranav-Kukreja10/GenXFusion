import React from 'react';
import TopBar from './TopBar';
import UploadCard from './UploadCard';

export default function LandingPage({
  onScanImage,
  isScanning,
  scanStep,
  error,
  scanSuccess,
  scannedItemCount,
  onViewDashboard,
  onResetScan,
  darkMode,
  onToggleDarkMode,
  onOpenProfile,
  onOpenSettings,
  onOpenHistory,
  onOpenAuth,
  onLogout,
}) {
  return (
    <div className="h-dvh max-h-dvh w-full overflow-hidden flex flex-col justify-between bg-[#FAF8F5] dark:bg-[#0B0E14] text-[#0F172A] dark:text-[#E5E7EB] transition-colors selection:bg-[#D1FAE5] selection:text-[#059669]">
      {/* 1. Slim Top Bar */}
      <TopBar
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
        onOpenHistory={onOpenHistory}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        onViewDashboard={onViewDashboard}
      />

      {/* 2. Center Block: Single Viewport Fit (No Scroll) */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 text-center my-auto min-h-0">
        {/* Headline & Subtitle Block */}
        <div className="mb-3 sm:mb-5 shrink-0">
          <h1 className="font-extrabold text-[clamp(1.35rem,2.5vw,2.25rem)] text-[#0F172A] dark:text-white tracking-tight leading-tight mb-1.5 sm:mb-2 max-w-xl mx-auto">
            Scan a handwritten bill. Get a GST-ready invoice.
          </h1>
          <p className="font-normal text-[clamp(0.8125rem,1.2vw,1.05rem)] text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto leading-snug">
            Upload a photo of a kacha bill. We read it, fix the math and apply the right GST.
          </p>
        </div>

        {/* 3. Upload Card with all Interactive States + "View Dashboard →" button */}
        <div className="w-full shrink-0">
          <UploadCard
            onScanImage={onScanImage}
            isScanning={isScanning}
            scanStep={scanStep}
            error={error}
            scanSuccess={scanSuccess}
            scannedItemCount={scannedItemCount}
            onViewDashboard={onViewDashboard}
            onResetScan={onResetScan}
          />
        </div>
      </main>

      {/* 4. Tiny Compliant Footer Line */}
      <footer className="w-full py-2 sm:py-2.5 shrink-0 border-t border-[#E7E2DA] dark:border-[#232B3A] bg-transparent text-center z-10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
          <p className="font-normal text-[clamp(0.65rem,0.8vw,0.75rem)] text-[#64748B] dark:text-[#94A3B8] tracking-wide">
            GSTN Schema v3.1 compliant · Your bills stay on your device
          </p>
        </div>
      </footer>
    </div>
  );
}

