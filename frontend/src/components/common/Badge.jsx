import React, { memo } from 'react';

/**
 * Badge component
 * Displays status labels and categorization tags.
 * Props:
 *  - variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' (default: 'neutral')
 *  - size: 'sm' | 'md' (default: 'sm')
 *  - dot: boolean (shows a small colored circle dot indicator)
 *  - children: ReactNode (badge text)
 *  - className: string (extra styles)
 */
const Badge = memo(function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  className = '',
}) {
  const variantStyles = {
    success: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-[#16A34A]',
    },
    warning: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-[#EAB308]',
    },
    danger: {
      bg: 'bg-red-50 text-red-700 border-red-200/60',
      dot: 'bg-red-500',
    },
    info: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200/60',
      dot: 'bg-blue-500',
    },
    neutral: {
      bg: 'bg-gray-100 text-gray-700 border-gray-200',
      dot: 'bg-gray-400',
    },
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const style = variantStyles[variant] || variantStyles.neutral;
  const sizeStyle = sizeStyles[size] || sizeStyles.sm;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${style.bg} ${sizeStyle} transition-colors ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
});

export default Badge;
