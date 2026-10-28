import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { HiInboxStack } from 'react-icons/hi2';

/**
 * EmptyState component
 * Displays a friendly empty state illustration/icon, title, description, and optional CTA button.
 * Props:
 *  - icon: ReactNode (optional, defaults to HiInboxStack)
 *  - title: string | ReactNode (required)
 *  - description: string | ReactNode (optional)
 *  - action: ReactNode (optional custom action element)
 *  - actionText: string (optional button label)
 *  - onAction: function (optional button click handler)
 *  - actionLink: string (optional router link target)
 *  - className: string (extra wrapper classes)
 */
const EmptyState = memo(function EmptyState({
  icon,
  title,
  description,
  action,
  actionText,
  onAction,
  actionLink,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-gray-100 shadow-xs max-w-md mx-auto ${className}`}
    >
      {/* Icon Container */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center mb-4 shadow-2xs">
        {icon ? (
          icon
        ) : (
          <HiInboxStack className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5]" />
        )}
      </div>

      {/* Title */}
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs sm:text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
          {description}
        </p>
      )}

      {/* Action Element */}
      {action ? (
        action
      ) : actionLink && actionText ? (
        <Link
          to={actionLink}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
        >
          {actionText}
        </Link>
      ) : onAction && actionText ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#16A34A]/40"
        >
          {actionText}
        </button>
      ) : null}
    </div>
  );
});

export default EmptyState;
