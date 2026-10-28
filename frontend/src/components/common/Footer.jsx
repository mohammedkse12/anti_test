import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiMapPin } from 'react-icons/hi2';

/**
 * Footer component
 * FoodX footer with green background, bilingual tagline, quick links,
 * covered cities in Sudan, and copyright notice.
 */
const Footer = memo(function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto bg-[#16A34A] text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Tagline */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-white text-[#16A34A] flex items-center justify-center font-black text-xl shadow-xs">
                FX
              </span>
              <div className="leading-tight">
                <span className="text-2xl font-black text-white tracking-tight block">
                  Food<span className="text-[#EAB308]">X</span>
                </span>
                <span className="text-xs text-white/80 font-medium">
                  B2B Grocery Marketplace
                </span>
              </div>
            </Link>

            <p className="text-sm text-white/90 max-w-sm leading-relaxed">
              {t('footer.tagline')}
            </p>

            {/* Covered Cities */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-white/70 block mb-2">
                {t('footer.cities_title')}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-xs text-white backdrop-blur-xs">
                  <HiMapPin className="w-3.5 h-3.5 text-[#EAB308]" />
                  {t('common.khartoum')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-xs text-white backdrop-blur-xs">
                  <HiMapPin className="w-3.5 h-3.5 text-[#EAB308]" />
                  {t('common.omdurman')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-xs text-white backdrop-blur-xs">
                  <HiMapPin className="w-3.5 h-3.5 text-[#EAB308]" />
                  {t('common.bahri')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wider uppercase">
              {t('nav.shop')}
            </h4>
            <ul className="space-y-2 text-sm text-white/85">
              <li>
                <Link
                  to="/"
                  className="hover:text-[#EAB308] hover:underline underline-offset-4 transition"
                >
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link
                  to="/shop"
                  className="hover:text-[#EAB308] hover:underline underline-offset-4 transition"
                >
                  {t('nav.shop')}
                </Link>
              </li>
              <li>
                <Link
                  to="/orders"
                  className="hover:text-[#EAB308] hover:underline underline-offset-4 transition"
                >
                  {t('nav.orders')}
                </Link>
              </li>
              <li>
                <Link
                  to="/wallet"
                  className="hover:text-[#EAB308] hover:underline underline-offset-4 transition"
                >
                  {t('nav.wallet')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Info Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white tracking-wider uppercase">
              {t('footer.about')}
            </h4>
            <ul className="space-y-2 text-sm text-white/85">
              <li>
                <Link
                  to="/about"
                  className="hover:text-[#EAB308] hover:underline underline-offset-4 transition"
                >
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-[#EAB308] hover:underline underline-offset-4 transition"
                >
                  {t('footer.contact')}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-[#EAB308] hover:underline underline-offset-4 transition"
                >
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-[#EAB308] hover:underline underline-offset-4 transition"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-footer */}
      <div className="border-t border-white/20 bg-[#15803D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/80">
          <p>{t('footer.rights')}</p>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-white/90">
              Khartoum • Omdurman • Bahri
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
