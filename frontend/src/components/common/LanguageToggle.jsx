import React, { memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { toggleLanguage, selectLanguage } from '../../store/slices/uiSlice';

/**
 * LanguageToggle component
 * Switches between Arabic and English languages.
 * Shows flag emoji (🇸🇩/🇬🇧) and target language name.
 * Dispatches toggleLanguage to Redux store and updates i18n / document direction.
 */
const LanguageToggle = memo(function LanguageToggle({ className = '', showLabel = true }) {
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  const currentLang = useSelector(selectLanguage) || i18n.language || 'ar';
  const isArabic = currentLang.startsWith('ar');

  const handleToggle = () => {
    dispatch(toggleLanguage());
  };

  // If currently in Arabic, show English option with UK flag; if in English, show Arabic with Sudan flag
  const targetFlag = isArabic ? '🇬🇧' : '🇸🇩';
  const targetLabel = isArabic ? 'English' : 'العربية';
  const titleText = isArabic ? 'Switch to English' : 'التحويل إلى اللغة العربية';

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={titleText}
      aria-label={titleText}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-[#16A34A] hover:border-[#16A34A]/40 hover:bg-green-50/50 shadow-2xs transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 ${className}`}
    >
      <span className="text-base leading-none select-none" role="img" aria-hidden="true">
        {targetFlag}
      </span>
      {showLabel && (
        <span className="font-medium tracking-wide">
          {targetLabel}
        </span>
      )}
    </button>
  );
});

export default LanguageToggle;
