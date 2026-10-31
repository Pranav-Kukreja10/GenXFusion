import React, { useState } from 'react';
import {
  ShieldCheck,
  Cpu,
  Zap,
  Tag,
  Settings,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Database,
  SlidersHorizontal,
} from 'lucide-react';
import { DEMO_PRESETS } from '../utils/mockPresets';

export default function HeaderCommandBar({
  invoice,
  onLoadPreset,
  onOpenSettings,
  isRecalculating,
  backendStatus,
  darkMode,
  onToggleDarkMode,
}) {
  const [showTelemetry, setShowTelemetry] = useState(false);

  return (
    <header className="bg-white dark:bg-[#12151C] border-b border-[#E5E0D8] dark:border-zinc-800 sticky top-0 z-30 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 dark:bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  ParchiSetu <span className="text-emerald-700 dark:text-emerald-500 font-black">AI</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded">
                  #25
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Vernacular OCR & GST Command Center
              </p>
            </div>
          </div>

          {/* Center: Clean Preset Switcher (Minimalist Segmented Control) */}
          <div className="hidden md:flex items-center bg-[#F3EFEA] dark:bg-zinc-800/80 p-1 rounded-xl border border-[#E5E0D8] dark:border-zinc-700/60 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Demo:
            </span>
            {DEMO_PRESETS.map((preset) => {
              const isActive = invoice?.invoice_id === preset.data.invoice_id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onLoadPreset(preset)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{preset.title.split(' ')[0]}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-black/5 dark:bg-white/5 text-slate-500'
                  }`}>
                    {preset.tag.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Actions, Telemetry Dropdown & Theme Toggle */}
          <div className="flex items-center gap-2">
            
            {/* Recalculating indicator */}
            {isRecalculating && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" /> Recalculating...
              </span>
            )}

            {/* Compact System Status Button (Click to view full telemetry) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTelemetry(!showTelemetry)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E0D8] dark:border-zinc-800 bg-[#FAF8F5] dark:bg-zinc-900/80 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                title="System Telemetry"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold">{invoice?.detected_sector || 'READY'}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {/* Telemetry Popover Menu */}
              {showTelemetry && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E0D8] dark:border-zinc-800 shadow-xl p-3 space-y-2 z-40 text-xs animate-fadeIn">
                  <div className="font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <span>System Telemetry</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-medium">
                      ParchiSetu Engine v3.1
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Cpu className="h-3.5 w-3.5" /> Vision Pipeline:
                      </span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {invoice?.model_used || 'gemini-3.5-flash-lite'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Zap className="h-3.5 w-3.5" /> SHA-256 Cache:
                      </span>
                      <span className={`font-semibold ${invoice?.cache_hit ? 'text-amber-600' : 'text-slate-500'}`}>
                        {invoice?.cache_hit ? 'Hit (0 RPD, <50ms)' : 'Live Processed'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Tag className="h-3.5 w-3.5" /> Detected Sector:
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {invoice?.detected_sector || 'UNKNOWN'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Database className="h-3.5 w-3.5" /> Backend Connection:
                      </span>
                      <span className={`font-semibold ${backendStatus === 'online' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {backendStatus === 'online' ? 'Online' : 'Local Fallback'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Mode Switcher Button */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg border border-[#E5E0D8] dark:border-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Settings Gear Button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-lg border border-[#E5E0D8] dark:border-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="API Configuration"
            >
              <Settings className="h-4 w-4" />
            </button>

          </div>
        </div>

        {/* Mobile Preset Selector (Visible on small screens only) */}
        <div className="md:hidden py-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-1 overflow-x-auto text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Presets:</span>
          <div className="flex items-center gap-1 shrink-0">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onLoadPreset(preset)}
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  invoice?.invoice_id === preset.data.invoice_id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {preset.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

      </div>
    </header>
  );
}
