import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiHome, FiShoppingBag, FiArrowRight, FiArrowLeft } from 'react-icons/fi';

export default function NotFound() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Container Card */}
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-2xl shadow-gray-200/60 relative overflow-hidden">
        {/* Top Accent Gradient Line */}
        <div className="absolute top-0 inset-x-0 h-2 bg-linear-to-r from-[#16A34A] via-[#22C55E] to-[#EAB308]" />

        {/* FoodX Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center font-black text-xl shadow-md shadow-green-700/20 group-hover:scale-105 transition-transform">
              FX
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              Food<span className="text-[#16A34A]">X</span>
            </span>
          </Link>
        </div>

        {/* Large 404 Number in Green */}
        <div className="text-7xl sm:text-8xl font-black text-[#16A34A] tracking-tighter my-2 drop-shadow-xs">
          404
        </div>

        {/* Bilingual Heading */}
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-2 mb-1">
          {isRtl ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium mb-8 leading-relaxed">
          {isRtl
            ? 'عذراً، الرابط الذي تحاول الوصول إليه غير متوفر أو تم نقله في منصة FoodX.'
            : 'Sorry, the page you are looking for does not exist or has been relocated.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-green-700/20 transition cursor-pointer"
          >
            <FiHome className="w-4 h-4" />
            <span>{isRtl ? 'الرئيسية' : 'Go Home'}</span>
          </Link>

          <Link
            to="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs sm:text-sm rounded-xl border border-gray-200 transition cursor-pointer"
          >
            <FiShoppingBag className="w-4 h-4 text-gray-500" />
            <span>{t('nav.shop', 'Shop Marketplace')}</span>
          </Link>
        </div>
      </div>

      {/* Subtext Footer */}
      <p className="mt-8 text-xs text-gray-400">
        FoodX B2B Grocery Marketplace • Sudan
      </p>
    </div>
  );
}
