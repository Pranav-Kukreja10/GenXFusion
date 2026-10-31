import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

/**
 * Custom accessible dropdown component replacing native OS <select>.
 * Supports keyboard navigation, search filtering, custom icons, and mobile-friendly touch targets (min 42px).
 */
export default function CustomDropdown({
  value,
  options = [],
  onChange,
  placeholder = 'Select option...',
  icon = null,
  searchable = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  disabled = false,
  ariaLabel = 'Dropdown selection',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to { value, label, subtitle, badge }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value ?? opt.code ?? opt.hsn_code ?? opt.hsn ?? opt.label,
        label: opt.label ?? opt.name ?? opt.description ?? String(opt.value),
        subtitle: opt.subtitle ?? opt.category_description ?? null,
        badge: opt.badge ?? (opt.rate !== undefined ? `${opt.rate}%` : null),
      };
    }
    return { value: opt, label: String(opt), subtitle: null, badge: null };
  });

  // Filter options by search query
  const filteredOptions = searchable && searchQuery
    ? normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(opt.value).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : normalizedOptions;

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value).toLowerCase() === String(value).toLowerCase()
  );

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelect = (optValue) => {
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`w-full min-h-[42px] px-3 py-2 bg-white dark:bg-zinc-800 border border-[#D5CEC3] dark:border-zinc-700 rounded-lg flex items-center justify-between gap-2 text-[15px] font-medium text-slate-900 dark:text-slate-100 shadow-2xs hover:border-slate-400 dark:hover:border-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate text-left flex-1 min-w-0">
          {icon && <span className="text-slate-500 dark:text-slate-400 shrink-0">{icon}</span>}
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto bg-white dark:bg-[#181D27] border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl py-1.5 focus:outline-hidden animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
          style={{ minWidth: '100%' }}
        >
          {/* Optional Search Filter */}
          {searchable && (
            <div className="sticky top-0 z-10 px-2 py-1.5 bg-white dark:bg-[#181D27] border-b border-slate-100 dark:border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to filter..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
              No matching options
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value).toLowerCase() === String(value).toLowerCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={`${opt.value}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 text-[14px] flex items-center justify-between gap-2 cursor-pointer transition-colors duration-150 min-h-[38px] ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex flex-col truncate">
                    <span className="truncate">{opt.label}</span>
                    {opt.subtitle && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {opt.subtitle}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {opt.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 font-bold">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

