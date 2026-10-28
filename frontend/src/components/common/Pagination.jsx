import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

/**
 * Generates pagination page numbers with ellipsis
 */
function usePaginationRange(currentPage, totalPages, siblingCount = 1) {
  return useMemo(() => {
    const totalPageNumbers = siblingCount * 2 + 5; // siblingCount + first + last + current + 2 dots

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [currentPage, totalPages, siblingCount]);
}

/**
 * Pagination component
 * Reusable pagination bar with RTL-aware chevron icons and page number pills.
 * Props:
 *  - currentPage: number (1-based)
 *  - totalPages: number
 *  - onPageChange: (page: number) => void
 *  - siblingCount: number (default 1)
 *  - className: string (extra styles)
 */
const Pagination = memo(function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1,
  className = '',
}) {
  const { t } = useTranslation();
  const pages = usePaginationRange(currentPage, totalPages, siblingCount);

  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange?.(currentPage + 1);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1 sm:gap-1.5 py-4 select-none ${className}`}
    >
      {/* Previous Button: HiChevronLeft with rtl:rotate-180 points backwards in both LTR and RTL */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={currentPage <= 1}
        aria-label={t('common.previous')}
        title={t('common.previous')}
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-[#16A34A] hover:border-[#16A34A]/40 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
      >
        <HiChevronLeft className="w-4 h-4 rtl:rotate-180" />
      </button>

      {/* Page Numbers */}
      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`dots-${index}`}
              className="inline-flex items-center justify-center w-9 h-9 text-gray-400 text-sm font-semibold tracking-wider"
            >
              …
            </span>
          );
        }

        const isCurrent = page === currentPage;

        return (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange?.(Number(page))}
            aria-current={isCurrent ? 'page' : undefined}
            className={`inline-flex items-center justify-center w-9 h-9 text-xs sm:text-sm font-semibold rounded-xl transition duration-150 cursor-pointer ${
              isCurrent
                ? 'bg-[#16A34A] text-white shadow-xs font-bold'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-green-50/60 hover:text-[#16A34A] hover:border-[#16A34A]/40'
            }`}
          >
            {page}
          </button>
        );
      })}

      {/* Next Button: HiChevronRight with rtl:rotate-180 points forward in both LTR and RTL */}
      <button
        type="button"
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        aria-label={t('common.next')}
        title={t('common.next')}
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-[#16A34A] hover:border-[#16A34A]/40 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
      >
        <HiChevronRight className="w-4 h-4 rtl:rotate-180" />
      </button>
    </nav>
  );
});

export default Pagination;
