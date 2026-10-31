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
  onTryDemo,
  scanResult,
  isDemo,
  onReplayAnimation,
  previewUrlOverride,
  onScanConversionDone,
}) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors selection:bg-zinc-200 selection:text-zinc-900 dark:selection:bg-zinc-800 dark:selection:text-zinc-100">
      {/* 1. Sticky Glassmorphic Top Bar */}
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

      {/* 2. Center Block: Breathable & Friendly */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-5 sm:px-6 py-10 sm:py-14 text-center my-auto">
        {/* Friendly Clear Headline */}
        <div className="mb-6 sm:mb-8 shrink-0 space-y-2.5">
          <h1 className="font-semibold text-[clamp(1.5rem,2.8vw,2.35rem)] text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight max-w-xl mx-auto">
            Turn any paper bill into a GST invoice.
          </h1>
          <p className="font-normal text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Snap a photo of your handwritten receipt. We read the items, check the math, and prepare a verified invoice.
          </p>
        </div>

        {/* 3. Refined Upload Card */}
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
            onTryDemo={onTryDemo}
            scanResult={scanResult}
            isDemo={isDemo}
            onReplayAnimation={onReplayAnimation}
            previewUrlOverride={previewUrlOverride}
            onScanConversionDone={onScanConversionDone}
          />
        </div>
      </main>
    </div>
  );
}
