import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    document.title = 'Page Not Found · TrueTax AI';
    const h1 = document.querySelector('h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors p-4">
      {/* Top minimal header */}
      <header className="max-w-4xl mx-auto w-full py-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100 group cursor-pointer"
          aria-label="TrueTax AI Home"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-xs">
            <ShieldCheck className="h-4.5 w-4.5 stroke-[2.2]" />
          </div>
          <span className="font-semibold text-sm tracking-tight">
            TrueTax <span className="font-mono text-zinc-400">AI</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={toggleDarkMode}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors cursor-pointer"
        >
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>

      {/* Center 404 card */}
      <main className="max-w-md w-full mx-auto my-auto text-center p-6 sm:p-8 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-700">
          <FileQuestion className="h-6 w-6 stroke-[1.8]" />
        </div>

        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-medium">
            Error 404
          </span>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mt-1">
            Bill or Page Not Found
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
            The requested invoice ledger could not be located. It may have expired or been moved.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Scan Bill</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
