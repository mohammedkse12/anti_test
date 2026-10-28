import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  FiPackage,
  FiClock,
  FiDollarSign,
  FiStar,
  FiPlus,
  FiClipboard,
  FiShoppingBag,
  FiArrowRight,
  FiArrowLeft,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
  FiRefreshCw,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

export default function VendorDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language?.startsWith('ar');
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vendors/dashboard');
      const data = res.data?.data || res.data;
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load vendor dashboard:', err);
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatSdg = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isRtl ? 'ar-SD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pending':
        return <Badge variant="warning" dot>{t('orders.pending', 'Pending')}</Badge>;
      case 'confirmed':
        return <Badge variant="info" dot>{t('orders.confirmed', 'Confirmed')}</Badge>;
      case 'preparing':
        return <Badge variant="warning" dot>{t('orders.preparing', 'Preparing')}</Badge>;
      case 'shipped':
        return <Badge variant="info" dot>{t('orders.shipped', 'Shipped')}</Badge>;
      case 'delivered':
        return <Badge variant="success" dot>{t('orders.delivered', 'Delivered')}</Badge>;
      case 'cancelled':
        return <Badge variant="danger" dot>{t('orders.cancelled', 'Cancelled')}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const vendor = dashboardData?.vendor || {};
  const recentOrders = dashboardData?.recent_orders || [];
  const ratingValue = vendor.rating || 4.8;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-gray-200/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#16A34A] bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200/60">
              {t('vendor.badge', 'Wholesale Vendor')}
            </span>
            {vendor.is_verified && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                <FiCheckCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                {isRtl ? 'مورد معتمد' : 'Verified Vendor'}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {t('vendor.welcome', 'Welcome back')},{' '}
            <span className="text-[#16A34A]">
              {vendor.business_name || user?.full_name || user?.name || 'Partner'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isRtl
              ? 'تابع مخزون المنتجات، أوامر الشراء الجديدة، ومبيعات الجملة في السودان.'
              : 'Monitor wholesale product inventory, recent orders, and gross revenue.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <Link
            to="/vendor/products?action=add"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-green-700/20 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>{t('vendor.add_product', 'Add Product')}</span>
          </Link>

          <Link
            to="/vendor/orders"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold rounded-xl border border-gray-200 transition cursor-pointer"
          >
            <FiClipboard className="w-4 h-4 text-gray-500" />
            <span>{t('vendor.orders', 'View All Orders')}</span>
          </Link>

          <Link
            to="/vendor/products"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-bold rounded-xl border border-gray-200 transition cursor-pointer"
          >
            <FiShoppingBag className="w-4 h-4 text-gray-500" />
            <span>{t('vendor.products', 'View Products')}</span>
          </Link>
        </div>
      </div>

      {/* 4 Stats Cards in a Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Products */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between transition hover:shadow-2xl hover:-translate-y-0.5">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              {t('vendor.total_products', 'Total Products')}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">
              {stats.total_products ?? 0}
            </div>
            <Link
              to="/vendor/products"
              className="text-xs font-semibold text-[#16A34A] hover:underline inline-flex items-center gap-1 mt-2"
            >
              <span>{isRtl ? 'إدارة القائمة' : 'Manage Listings'}</span>
              {isRtl ? <FiArrowLeft className="w-3 h-3" /> : <FiArrowRight className="w-3 h-3" />}
            </Link>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center text-2xl shadow-xs">
            <FiPackage className="w-7 h-7" />
          </div>
        </div>

        {/* Card 2: Pending Orders */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between transition hover:shadow-2xl hover:-translate-y-0.5">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              {t('vendor.pending_orders', 'Pending Orders')}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#CA8A04]">
              {stats.pending_orders ?? 0}
            </div>
            <Link
              to="/vendor/orders"
              className="text-xs font-semibold text-[#CA8A04] hover:underline inline-flex items-center gap-1 mt-2"
            >
              <span>{isRtl ? 'مراجعة الطلبات' : 'Review Queue'}</span>
              {isRtl ? <FiArrowLeft className="w-3 h-3" /> : <FiArrowRight className="w-3 h-3" />}
            </Link>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#CA8A04] flex items-center justify-center text-2xl shadow-xs">
            <FiClock className="w-7 h-7" />
          </div>
        </div>

        {/* Card 3: Total Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between transition hover:shadow-2xl hover:-translate-y-0.5">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              {t('vendor.revenue', 'Total Revenue')}
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#16A34A] truncate max-w-[170px]">
              {formatSdg(stats.total_revenue)}
            </div>
            <span className="text-[11px] font-bold text-gray-400 block mt-1">
              {t('products.sdg', 'SDG')} • {isRtl ? 'المبيعات المنفذة' : 'Gross Sales'}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center text-2xl shadow-xs">
            <FiDollarSign className="w-7 h-7" />
          </div>
        </div>

        {/* Card 4: Rating */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between transition hover:shadow-2xl hover:-translate-y-0.5">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              {isRtl ? 'التقييم العام' : 'Vendor Rating'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">
                {ratingValue}
              </span>
              <div className="flex text-[#EAB308]">
                <FiStar className="w-5 h-5 fill-current" />
              </div>
            </div>
            <span className="text-[11px] text-gray-400 font-semibold block mt-1">
              {isRtl ? 'بناءً على طلبات المتاجر' : 'Based on retailer feedback'}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-yellow-50 text-[#EAB308] flex items-center justify-center text-2xl shadow-xs">
            <FiStar className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiClipboard className="w-5 h-5 text-[#16A34A]" />
              {isRtl ? 'أحدث الطلبات الواردة' : 'Recent Wholesale Orders'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isRtl
                ? 'آخر 5 طلبات تم تسجيلها من أصحاب البقالات والمتاجر'
                : 'Last 5 orders placed by registered retailers'}
            </p>
          </div>

          <Link
            to="/vendor/orders"
            className="text-xs sm:text-sm font-bold text-[#16A34A] hover:underline flex items-center gap-1"
          >
            <span>{isRtl ? 'عرض الكل' : 'View All'}</span>
            {isRtl ? <FiArrowLeft className="w-4 h-4" /> : <FiArrowRight className="w-4 h-4" />}
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<FiClipboard className="w-8 h-8" />}
              title={t('orders.no_orders', 'No orders placed yet')}
              description={
                isRtl
                  ? 'ستظهر هنا طلبات البقالات وتجار التجزئة فور استلامها.'
                  : 'Orders placed by retailers will show up here.'
              }
              actionText={t('vendor.add_product', 'Add Product')}
              actionLink="/vendor/products?action=add"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-6 text-start">{t('orders.order_number', 'Order #')}</th>
                  <th className="py-3.5 px-6 text-start">{t('orders.date', 'Date')}</th>
                  <th className="py-3.5 px-6 text-start">{isRtl ? 'التاجر / المتجر' : 'Retailer'}</th>
                  <th className="py-3.5 px-6 text-end">{t('orders.total', 'Total Amount')}</th>
                  <th className="py-3.5 px-6 text-center">{t('orders.status', 'Status')}</th>
                  <th className="py-3.5 px-6 text-end">{isRtl ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-gray-900 whitespace-nowrap">
                      {order.order_number || `#${order.id.slice(0, 8)}`}
                    </td>
                    <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="py-4 px-6 text-gray-700 whitespace-nowrap">
                      {order.retailer?.full_name || order.retailer?.name || (isRtl ? 'تاجر تجزئة' : 'Retailer')}
                    </td>
                    <td className="py-4 px-6 text-end whitespace-nowrap font-black text-gray-900">
                      {formatSdg(order.total)}{' '}
                      <span className="text-xs font-bold text-gray-400">
                        {t('products.sdg', 'SDG')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      {getStatusBadge(order.order_status)}
                    </td>
                    <td className="py-4 px-6 text-end whitespace-nowrap">
                      <Link
                        to="/vendor/orders"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-[#16A34A] hover:bg-green-100 text-xs font-bold transition"
                      >
                        <FiEye className="w-3.5 h-3.5" />
                        <span>{t('common.view', 'View')}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
