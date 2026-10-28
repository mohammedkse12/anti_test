import React, { useState, useEffect, memo } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import {
  HiSquares2X2,
  HiUsers,
  HiBuildingStorefront,
  HiClipboardDocumentList,
  HiChartBar,
  HiBars3,
  HiXMark,
  HiBell,
  HiArrowRightOnRectangle,
  HiArrowTopRightOnSquare,
  HiShieldCheck,
} from 'react-icons/hi2';

import LanguageToggle from '../components/common/LanguageToggle';
import Badge from '../components/common/Badge';
import { logout } from '../store/slices/authSlice';

/**
 * AdminLayout component
 * Management dashboard layout for system administrators.
 * Features a dark green sidebar with administration tools,
 * an admin top bar with system status and notification counters, and a responsive container.
 */
const AdminLayout = memo(function AdminLayout({ children }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const adminMenuItems = [
    {
      label: t('admin.dashboard'),
      path: '/admin/dashboard',
      icon: <HiSquares2X2 className="w-5 h-5 shrink-0" />,
    },
    {
      label: t('admin.users'),
      path: '/admin/users',
      icon: <HiUsers className="w-5 h-5 shrink-0" />,
    },
    {
      label: t('admin.vendors'),
      path: '/admin/vendors',
      icon: <HiBuildingStorefront className="w-5 h-5 shrink-0" />,
    },
    {
      label: t('admin.all_orders'),
      path: '/admin/orders',
      icon: <HiClipboardDocumentList className="w-5 h-5 shrink-0" />,
    },
    {
      label: t('admin.analytics'),
      path: '/admin/analytics',
      icon: <HiChartBar className="w-5 h-5 shrink-0" />,
    },
  ];

  const isItemActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#14532D] text-white">
      {/* Brand & Admin Badge */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <Link to="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white text-[#14532D] flex items-center justify-center font-black text-lg shadow-xs">
            FX
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-white leading-tight">
              Food<span className="text-[#EAB308]">X</span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-green-300 flex items-center gap-1">
              <HiShieldCheck className="w-3.5 h-3.5 text-[#EAB308]" />
              {t('admin.badge')}
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          aria-label={t('common.close')}
        >
          <HiXMark className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {adminMenuItems.map((item) => {
          const active = isItemActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-[#16A34A] text-white shadow-xs font-bold border-s-4 border-[#EAB308]'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={active ? 'text-white' : 'text-white/70'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick link to Storefront and Logout */}
      <div className="p-4 border-t border-white/10 space-y-2 bg-[#0F391F]">
        <Link
          to="/"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white/90 hover:bg-white/10 hover:text-white transition"
        >
          <span className="flex items-center gap-2">
            <HiArrowTopRightOnSquare className="w-4 h-4 text-[#EAB308]" />
            <span>{t('nav.shop')}</span>
          </span>
          <span className="text-[10px] text-green-300">Live</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-200 hover:bg-red-500/20 hover:text-white transition cursor-pointer"
        >
          <HiArrowRightOnRectangle className="w-4 h-4 rtl:rotate-180" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F9FAFB] text-gray-900">
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 shadow-xl">
        <div className="sticky top-0 h-screen">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-[85%] h-full shadow-2xl z-10 animate-slideIn">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200/80 shadow-2xs h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ms-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              aria-label="Open sidebar menu"
            >
              <HiBars3 className="w-6 h-6" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                {t('admin.dashboard')}
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                FoodX Marketplace Administration • {user?.name || 'Administrator'}
              </p>
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <LanguageToggle />

            {/* Notifications */}
            <button
              type="button"
              aria-label={t('admin.notifications')}
              title={t('admin.notifications')}
              className="relative p-2 rounded-xl border border-gray-200 text-gray-600 hover:text-[#16A34A] hover:bg-green-50/50 transition cursor-pointer"
            >
              <HiBell className="w-5 h-5" />
              <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* Admin Badge */}
            <Badge variant="warning" dot size="md">
              {t('admin.badge')}
            </Badge>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
});

export default AdminLayout;
