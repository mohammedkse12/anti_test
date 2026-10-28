import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HiMagnifyingGlass, HiXMark } from 'react-icons/hi2';

/**
 * SearchBar component
 * Debounced search input (300ms) with RTL-aware icon placement and clear button.
 * Props:
 *  - onSearch: (query: string) => void
 *  - placeholder: string (optional, defaults to t('nav.search_placeholder'))
 *  - initialValue: string (optional)
 *  - debounceMs: number (optional, default 300)
 *  - className: string (extra styles)
 *  - autoFocus: boolean (optional)
 */
const SearchBar = memo(function SearchBar({
  onSearch,
  placeholder,
  initialValue = '',
  debounceMs = 300,
  className = '',
  autoFocus = false,
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const isFirstRender = useRef(true);
  const debounceTimerRef = useRef(null);

  // Sync external initialValue if it changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Debounced effect for invoking onSearch
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (typeof onSearch === 'function') {
        onSearch(value.trim());
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, debounceMs, onSearch]);

  const handleChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setValue('');
    if (typeof onSearch === 'function') {
      onSearch('');
    }
  }, [onSearch]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (typeof onSearch === 'function') {
        onSearch(value.trim());
      }
    },
    [value, onSearch]
  );

  const resolvedPlaceholder = placeholder || t('nav.search_placeholder');

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`relative flex items-center w-full ${className}`}
    >
      {/* Search Icon at logical start */}
      <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-gray-400">
        <HiMagnifyingGlass className="w-5 h-5 text-gray-400" aria-hidden="true" />
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={resolvedPlaceholder}
        autoFocus={autoFocus}
        className="w-full bg-[#F9FAFB] text-gray-900 placeholder:text-gray-400 text-sm rounded-xl border border-gray-200 ps-10 pe-10 py-2.5 outline-none transition-all duration-200 focus:bg-white focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20"
      />

      {/* Clear Button at logical end */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label={t('common.clear')}
          title={t('common.clear')}
          className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <span className="p-1 rounded-full hover:bg-gray-100">
            <HiXMark className="w-4 h-4" />
          </span>
        </button>
      )}
    </form>
  );
});

export default SearchBar;
