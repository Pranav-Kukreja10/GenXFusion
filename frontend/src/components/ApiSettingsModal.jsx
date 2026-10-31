import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, testConnection, DEFAULT_API_BASE } from '../services/api';

export default function ApiSettingsModal({
  isOpen,
  onClose,
  onSave,
}) {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const ok = await testConnection(url);
    setTesting(false);
    if (ok) {
      setTestResult({ success: true, message: 'Backend reachable! /health returned 200 OK.' });
    } else {
      setTestResult({
        success: false,
        message: 'Could not connect. Ensure FastAPI backend is running, or continue with local simulation.'
      });
    }
  };

  const handleSave = () => {
    setApiBaseUrl(url);
    if (onSave) onSave(url);
    onClose();
  };

  const handleReset = () => {
    setUrl(DEFAULT_API_BASE);
    setApiBaseUrl(DEFAULT_API_BASE);
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#12151C] rounded-xl shadow-2xl max-w-md w-full border border-[#E5E0D8] dark:border-zinc-800 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 dark:bg-zinc-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-tight">
              Backend API Configuration
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              FastAPI Base URL (`VITE_API_BASE_URL`):
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://localhost:8000/api/v1"
              className="w-full bg-[#FAF8F5] dark:bg-zinc-850 dark:bg-zinc-800/80 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Default: <code className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{DEFAULT_API_BASE}</code>
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <span className="text-[11px] leading-tight">{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
              >
                {testing && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>Test</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-bold shadow-xs transition-colors"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
