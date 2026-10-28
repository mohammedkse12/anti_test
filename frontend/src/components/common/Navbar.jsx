import React, { useState, useRef, useEffect, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import {
  HiBars3,
  HiXMark,
  HiShoppingCart,
  HiUser,
  HiArrowRightOnRectangle,
  HiClipboardDocumentList,
  HiWallet,
  HiBuildingStorefront,
  HiSquares2X2,
  HiChevronDown,
} from 'react-icons/hi2';

import LanguageToggle from './LanguageToggle';
import SearchBar from './SearchBar';
import { selectTotalItems } from '../../store/slices/cartSlice';
import { logout } from '../../store/slices/authSlice';

/**
 * Navbar component
 * Responsive top navigation with FoodX branding, search bar, language switcher,
 * shopping cart with badge count, authenticated user dropdown, and mobile drawer.
 */
const Navbar = memo(function Navbar() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const totalItems = useSelector(selectTotalItems);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleSearchSubmit = (query) => {
    if (query) {
      navigate(`/shop?search=${encodeURIComponent(query)}`);
    } else {
      navigate('/shop');
    }
  };

  const isLinkActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.shop'), path: '/shop' },
    ...(isAuthenticated
      ? [
          { label: t('nav.orders'), path: '/orders' },
          { label: t('nav.wallet'), path: '/wallet' },
        ]
      : []),
  ];

  const userRole = user?.role || 'retailer';
  const dashboardPath =
    userRole === 'admin'
      ? '/admin/dashboard'
      : userRole === 'vendor'
      ? '/vendor/dashboard'
      : '/orders';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
            {/* Start Section: Mobile menu button & Brand Logo */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Navigation Menu"
                className="md:hidden p-2 -ms-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <HiBars3 className="w-6 h-6" />
              </button>

              {/* Logo with Green Leaf Icon */}
              <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                <div className="relative w-10 h-10 rounded-xl bg-[#16A34A] text-white flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
                  <svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Stylized organic leaf icon */}
                    <path d="M17 3.5c-4.5 0-9 2.5-11 7C4.5 14 5 18 8 20.5c1 .8 2.2 1.3 3.5 1.5l.5-2c-.9-.1-1.8-.5-2.5-1.1C7.2 17 6.8 13.8 8 11c1.6-3.7 5.2-5.7 9-5.5v-2z" />
                    <path d="M20.5 4.5c-.5-.5-1.2-.5-1.7 0-3.5 3.5-5 8.5-4 13.5l2-.5c-.8-4.2.5-8.4 3.5-11.4.5-.4.5-1.1.2-1.6z" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    Food<span className="text-[#16A34A]">X</span>
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold hidden lg:block uppercase tracking-wider">
                    B2B Marketplace
                  </span>
                </div>
              </Link>
            </div>

            {/* Middle Section: Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {navLinks.map((item) => {
                const active = isLinkActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      active
                        ? 'text-[#16A34A] bg-green-50/70 font-bold'
                        : 'text-gray-700 hover:text-[#16A34A] hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Center-Right Section: Search Bar (Desktop only) */}
            <div className="hidden lg:block flex-1 max-w-xs xl:max-w-md">
              <SearchBar onSearch={handleSearchSubmit} />
            </div>

            {/* End Section: Language Toggle, Cart Button, Auth Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Language Switcher */}
              <LanguageToggle />

              {/* Shopping Cart Button */}
              <Link
                to="/cart"
                aria-label={t('nav.cart')}
                className="relative p-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:text-[#16A34A] hover:border-[#16A34A]/40 hover:bg-green-50/40 shadow-2xs transition-all duration-150 cursor-pointer"
              >
                <HiShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 bg-[#EAB308] text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-xs animate-scaleIn">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>

              {/* User Menu / Auth Buttons */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 ps-2 pe-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#16A34A]/40 bg-white hover:bg-gray-50 transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-green-100 text-[#16A34A] flex items-center justify-center font-bold text-xs">
                      {user?.name ? user.name.charAt(0).toUpperCase() : <HiUser className="w-4 h-4" />}
                    </div>
                    <span className="hidden sm:inline text-xs font-semibold text-gray-800 max-w-[100px] truncate">
                      {user?.name || user?.phone}
                    </span>
                    <HiChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute end-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {user?.name || t('nav.profile')}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.phone || user?.email}
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#16A34A] bg-green-50 px-2 py-0.5 rounded-md">
                          {user?.role || 'Retailer'}
                        </span>
                      </div>

                      <div className="py-1">
                        <Link
                          to={dashboardPath}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#16A34A] transition"
                        >
                          <HiSquares2X2 className="w-4 h-4 text-gray-400" />
                          <span>{t('nav.dashboard')}</span>
                        </Link>
                        <Link
                          to="/orders"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#16A34A] transition"
                        >
                          <HiClipboardDocumentList className="w-4 h-4 text-gray-400" />
                          <span>{t('nav.orders')}</span>
                        </Link>
                        <Link
                          to="/wallet"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#16A34A] transition"
                        >
                          <HiWallet className="w-4 h-4 text-gray-400" />
                          <span>{t('nav.wallet')}</span>
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          <HiArrowRightOnRectangle className="w-4 h-4 text-red-500 rtl:rotate-180" />
                          <span>{t('nav.logout')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-[#16A34A] transition"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition"
                  >
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Search bar row on small screens */}
          <div className="py-2.5 lg:hidden border-t border-gray-100">
            <SearchBar onSearch={handleSearchSubmit} />
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Slide-out navigation drawer) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content (slides from logical start) */}
          <div className="relative w-72 max-w-[85%] bg-white h-full shadow-2xl flex flex-col z-10 transition-transform duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-[#16A34A] text-white flex items-center justify-center font-bold text-base shadow-xs">
                  FX
                </div>
                <span className="text-xl font-black text-gray-900">
                  Food<span className="text-[#16A34A]">X</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={t('common.close')}
                className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <HiXMark className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Body Links */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {navLinks.map((item) => {
                const active = isLinkActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-sm font-semibold transition ${
                      active
                        ? 'bg-green-50 text-[#16A34A] font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {isAuthenticated && (
                <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
                  <Link
                    to={dashboardPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {t('nav.dashboard')}
                  </Link>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-gray-100 space-y-3 bg-gray-50">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition"
                >
                  <HiArrowRightOnRectangle className="w-4 h-4 rtl:rotate-180" />
                  <span>{t('nav.logout')}</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2 px-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-semibold text-xs text-center"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center py-2 px-3 rounded-xl bg-[#16A34A] text-white font-bold text-xs text-center"
                  >
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default Navbar;
