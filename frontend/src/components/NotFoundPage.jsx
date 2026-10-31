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
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF8F5] dark:bg-[#0B0E14] text-[#0F172A] dark:text-[#E5E7EB] transition-colors p-4">
      {/* Top minimal header */}
      <header className="max-w-4xl mx-auto w-full py-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-slate-900 dark:text-white group cursor-pointer"
          aria-label="TrueTax AI Home"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="h-5 w-5 stroke-[2.3]" />
          </div>
          <span className="font-extrabold text-base tracking-tight">
            TrueTax <span className="text-emerald-700 dark:text-emerald-500">AI</span>
          </span>
        </Link>

        <button
          type="button"
          onClick={toggleDarkMode}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg border border-[#E7E2DA] dark:border-zinc-800 bg-white dark:bg-[#131822]"
        >
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>

      {/* Center 404 card */}
      <main className="max-w-md w-full mx-auto my-auto text-center p-6 sm:p-8 bg-white dark:bg-[#131822] border border-[#E7E2DA] dark:border-[#232B3A] rounded-3xl shadow-md space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner ring-4 ring-amber-50 dark:ring-amber-900/20">
          <FileQuestion className="h-8 w-8 stroke-[2.2]" />
        </div>

        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded">
            404 Error
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight outline-hidden">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            The requested invoice audit or page URL does not exist or may have been removed.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Back to home</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 border border-[#E7E2DA] dark:border-[#232B3A] bg-[#FAF8F5] dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </main>

      {/* Tiny Footer */}
      <footer className="text-center text-xs text-slate-400 dark:text-slate-500 py-3">
        GSTN Schema v3.1 compliant · TrueTax AI (#25)
      </footer>
    </div>
  );
}

