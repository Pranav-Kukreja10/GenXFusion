import React, { useState } from 'react';
import { X, Server, RefreshCw, RotateCcw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
              Server Connection
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Server Address
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://localhost:8000/api/v1"
              className="w-full h-9 bg-zinc-50/50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-all"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Defaults to `http://localhost:8000/api/v1` for local Python Vision Engine.
            </p>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
              }`}
            >
              {testResult.success ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
              )}
              <span className="font-medium leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                {testing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Server className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span>Test Server</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium rounded-lg shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
