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
    <div className="h-dvh max-h-dvh w-full overflow-hidden flex flex-col justify-between bg-[#FAF8F5] dark:bg-[#0B0E14] text-[#0F172A] dark:text-[#E5E7EB] transition-colors selection:bg-[#D1FAE5] selection:text-[#059669] relative">
      {/* 1. Ambient Background: Emerald gradient blobs drifting slowly (<0.15 opacity, pointer-events none) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none z-0"
        aria-hidden="true"
      >
        <div className="absolute -top-24 -left-20 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/8 blur-3xl animate-blob-drift-1" />
        <div className="absolute top-1/3 -right-24 w-72 sm:w-88 h-72 sm:h-88 rounded-full bg-teal-500/10 dark:bg-teal-500/8 blur-3xl animate-blob-drift-2" />
        <div className="hidden sm:block absolute -bottom-16 left-1/3 w-80 h-80 rounded-full bg-emerald-600/8 dark:bg-emerald-600/5 blur-3xl animate-blob-drift-3" />
      </div>

      {/* 2. Slim Top Bar */}
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

      {/* 3. Center Block: Single Viewport Fit (No Scroll) */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full px-4 text-center my-auto min-h-0 z-10">
        {/* Headline & Subtitle Block with Staggered Entrance */}
        <div className="mb-3 sm:mb-5 shrink-0">
          <h1 className="font-extrabold text-[clamp(1.35rem,2.5vw,2.25rem)] text-[#0F172A] dark:text-white tracking-tight leading-tight mb-1.5 sm:mb-2 max-w-xl mx-auto flex flex-wrap justify-center gap-x-1.5">
            {headlineWords.map((word, idx) => (
              <span
                key={idx}
                className="inline-block animate-word-fade-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {word}
              </span>
            ))}
          </h1>
          <p
            className="font-normal text-[clamp(0.8125rem,1.2vw,1.05rem)] text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto leading-snug animate-word-fade-up"
            style={{ animationDelay: '520ms' }}
          >
            Upload a photo of a kacha bill. We read it, fix the math and apply the right GST.
          </p>
        </div>

        {/* 4. Upload Card with all Interactive States + "View Dashboard →" button */}
        <div
          className="w-full shrink-0 animate-word-fade-up"
          style={{ animationDelay: '680ms' }}
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

      {/* 5. Tiny Compliant Footer Line + Staggered Trust Chips */}
      <footer className="w-full py-2 sm:py-2.5 shrink-0 border-t border-[#E7E2DA] dark:border-[#232B3A] bg-transparent text-center z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center gap-1.5">
          {/* Trust Chips with Staggered Fade-In */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className="text-[10px] sm:text-[11px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-full animate-word-fade-up shadow-2xs"
              style={{ animationDelay: '850ms' }}
            >
              Hindi · Punjabi · Gujarati
            </span>
            <span
              className="text-[10px] sm:text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-full animate-word-fade-up shadow-2xs"
              style={{ animationDelay: '950ms' }}
            >
              GST slabs
            </span>
            <span
              className="text-[10px] sm:text-[11px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300/60 dark:border-emerald-800/60 px-2 py-0.5 rounded-full animate-word-fade-up shadow-2xs"
              style={{ animationDelay: '1050ms' }}
            >
              GSTR-1 ready
            </span>
          </div>

          <p className="font-normal text-[clamp(0.65rem,0.8vw,0.75rem)] text-[#64748B] dark:text-[#94A3B8] tracking-wide">
            GSTN Schema v3.1 compliant · Your bills stay on your device
          </p>
        </div>
      </footer>
    </div>
  );
}
