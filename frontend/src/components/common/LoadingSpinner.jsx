import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * LoadingSpinner component
 * Centered spinner with FoodX green branding (#16A34A).
 * Props:
 *  - size: 'sm' | 'md' | 'lg' (default: 'md')
 *  - text: string (optional status label, defaults to translated "Loading...")
 *  - showText: boolean (default: false, or true if text provided)
 *  - fullScreen: boolean (renders centered in full viewport overlay)
 *  - className: string (extra wrapper classes)
 */
const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  text,
  showText = false,
  fullScreen = false,
  className = '',
}) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinnerSize = sizeClasses[size] || sizeClasses.md;
  const labelText = text !== undefined ? text : t('common.loading');

  const content = (
    <div
      className={`inline-flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`${spinnerSize} rounded-full border-gray-200 border-t-[#16A34A] animate-spin`}
        aria-hidden="true"
      />
      {(showText || text) && (
        <p className="text-xs sm:text-sm font-medium text-gray-600 animate-pulse">
          {labelText}
        </p>
      )}
      <span className="sr-only">{labelText}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-6 w-full">
      {content}
    </div>
  );
});

export default LoadingSpinner;
