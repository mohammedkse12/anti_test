import React, { useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HiXMark } from 'react-icons/hi2';

/**
 * Modal component
 * Reusable accessible modal dialog with backdrop, header, body, and footer.
 * Supports click outside to close and Escape key to close.
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - title: ReactNode | string
 *  - children: ReactNode (modal body)
 *  - footer: ReactNode (optional footer buttons)
 *  - size: 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 *  - closeOnOverlayClick: boolean (default true)
 */
const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
}) {
  const { t } = useTranslation();

  // Escape key handler
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const maxWidthClass = sizeClasses[size] || sizeClasses.md;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn"
    >
      <div
        className={`w-full ${maxWidthClass} bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-200 flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2
            id="modal-title"
            className="text-base sm:text-lg font-bold text-gray-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 text-sm text-gray-600 leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
});

export default Modal;
