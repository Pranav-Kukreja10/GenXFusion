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
  const headlineWords = [
    'Scan',
    'a',
    'handwritten',
    'bill.',
    'Get',
    'a',
    'GST-ready',
    'invoice.',
  ];

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors selection:bg-zinc-200 selection:text-zinc-900 dark:selection:bg-zinc-800 dark:selection:text-zinc-100 relative">
      {/* Ambient Background: Subtle gradient blobs */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-0"
        aria-hidden="true"
      >
        <div className="absolute -top-24 -left-20 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-zinc-300/15 dark:bg-zinc-700/10 blur-3xl animate-blob-drift-1" />
        <div className="absolute top-1/3 -right-24 w-72 sm:w-88 h-72 sm:h-88 rounded-full bg-zinc-400/10 dark:bg-zinc-800/10 blur-3xl animate-blob-drift-2" />
        <div className="hidden sm:block absolute -bottom-16 left-1/3 w-80 h-80 rounded-full bg-zinc-300/10 dark:bg-zinc-700/10 blur-3xl animate-blob-drift-3" />
      </div>

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
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-5 sm:px-6 py-10 sm:py-14 text-center my-auto z-10">
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
        <div
          className="w-full shrink-0 animate-word-fade-up"
          style={{ animationDelay: '200ms' }}
        >
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
      {/* 4. Tiny Compliant Footer Line */}
      <footer className="w-full py-3 shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-transparent text-center z-10">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
          <p className="font-normal text-xs text-zinc-500 dark:text-zinc-400">
            GSTN Schema v3.1 compliant · Local device verification
          </p>
        </div>
      </footer>
    </div>
  );
}
