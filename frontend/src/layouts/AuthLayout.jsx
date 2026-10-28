import React, { memo } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/common/LanguageToggle';

/**
 * AuthLayout component
 * Centered layout for authentication screens (login, register, OTP verification).
 * Features brand logo, language toggle in top corner, green gradient top accent,
 * centered elevated card, and footer copyright text.
 */
const AuthLayout = memo(function AuthLayout({ children, title, subtitle }) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-between relative selection:bg-[#16A34A]/20">
      {/* Top Bar with Language Switcher */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-[#16A34A] text-white flex items-center justify-center font-black text-lg shadow-xs group-hover:scale-105 transition-transform">
            FX
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">
            Food<span className="text-[#16A34A]">X</span>
          </span>
        </Link>

        <div>
          <LanguageToggle />
        </div>
      </header>

      {/* Center Container */}
      <main className="w-full flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Card with subtle green gradient top line */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
            {/* Top Accent Gradient Line */}
            <div className="h-2 w-full bg-linear-to-r from-[#16A34A] via-[#22C55E] to-[#EAB308]" />

            <div className="p-6 sm:p-8">
              {/* Brand Header Inside Card */}
              <div className="flex flex-col items-center text-center mb-6">
                <Link to="/" className="inline-flex items-center justify-center mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center shadow-xs">
                    <svg
                      className="w-7 h-7 text-[#16A34A]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17 3.5c-4.5 0-9 2.5-11 7C4.5 14 5 18 8 20.5c1 .8 2.2 1.3 3.5 1.5l.5-2c-.9-.1-1.8-.5-2.5-1.1C7.2 17 6.8 13.8 8 11c1.6-3.7 5.2-5.7 9-5.5v-2z" />
                      <path d="M20.5 4.5c-.5-.5-1.2-.5-1.7 0-3.5 3.5-5 8.5-4 13.5l2-.5c-.8-4.2.5-8.4 3.5-11.4.5-.4.5-1.1.2-1.6z" />
                    </svg>
                  </div>
                </Link>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {title || (
                    <>
                      Food<span className="text-[#16A34A]">X</span>
                    </>
                  )}
                </h1>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  {subtitle || t('products.title')}
                </p>
              </div>

              {/* Form Content */}
              {children || <Outlet />}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sub-footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        <p>{t('footer.rights')}</p>
      </footer>
    </div>
  );
});

export default AuthLayout;
