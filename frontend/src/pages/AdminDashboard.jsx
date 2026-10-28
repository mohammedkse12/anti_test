import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  FiUsers,
  FiBriefcase,
  FiClipboard,
  FiDollarSign,
  FiCheckCircle,
  FiXCircle,
  FiArrowRight,
  FiArrowLeft,
  FiShield,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

import api from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');
  const { user } = useSelector((state) => state.auth);

  const [stats, setStats] = useState(null);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch stats
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data?.data || statsRes.data);

      // Fetch pending vendors
      try {
        const vendorsRes = await api.get('/admin/vendors?is_verified=false&per_page=5');
        const vData = vendorsRes.data?.data || vendorsRes.data;
        const vList = Array.isArray(vData) ? vData : vData?.vendors || [];
        setPendingVendors(vList);
      } catch (vErr) {
        console.warn('Pending vendors fetch warning:', vErr);
      }

      // Fetch recent orders
      try {
        const ordersRes = await api.get('/admin/orders?per_page=5');
        const oData = ordersRes.data?.data || ordersRes.data;
        const oList = Array.isArray(oData) ? oData : oData?.orders || [];
        setRecentOrders(oList);
      } catch (oErr) {
        console.warn('Recent orders fetch warning:', oErr);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerifyVendor = async (vendorId) => {
    try {
      setVerifyingId(vendorId);
      const res = await api.put(`/admin/vendors/${vendorId}/verify`, { is_verified: true });
      toast.success(
        res.data?.message || (isRtl ? 'تم توثيق حساب المورد بنجاح' : 'Vendor verified successfully')
      );
      // Refresh pending vendors and stats
      fetchData();
    } catch (err) {
      console.error('Failed to verify vendor:', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || t('common.error'));
    } finally {
      setVerifyingId(null);
    }
  };

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

  const renderStatusBadge = (status) => {
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

  const usersCount = stats?.users?.total ?? 0;
  const vendorsCount = stats?.users?.vendors ?? stats?.users?.total_vendors ?? 0;
  const ordersCount = stats?.orders?.total ?? 0;
  const totalRevenue = stats?.revenue?.total_revenue ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl shadow-gray-200/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#14532D] bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200/60 flex items-center gap-1">
              <FiShield className="w-3.5 h-3.5 text-[#EAB308]" />
              {t('admin.badge', 'System Admin')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {t('admin.dashboard', 'Admin Control Panel')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {isRtl
              ? 'مؤشرات أداء منصة FoodX لتجارة الجملة بالسودان وإدارة العمليات'
              : 'Marketplace operational metrics, merchant verifications, and transaction KPIs'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-[#16A34A] text-gray-700 hover:text-[#16A34A] rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#16A34A]' : ''}`} />
            <span>{isRtl ? 'تحديث الإحصائيات' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Users */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between transition hover:shadow-2xl hover:-translate-y-0.5">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              {t('admin.total_users', 'Total Users')}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">
              {usersCount}
            </div>
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-[#16A34A] hover:underline inline-flex items-center gap-1 mt-2"
            >
              <span>{isRtl ? 'عرض المستخدمين' : 'Manage Users'}</span>
              {isRtl ? <FiArrowLeft className="w-3 h-3" /> : <FiArrowRight className="w-3 h-3" />}
            </Link>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center text-2xl shadow-xs">
            <FiUsers className="w-7 h-7" />
          </div>
        </div>

        {/* Total Vendors */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between transition hover:shadow-2xl hover:-translate-y-0.5">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              {t('admin.total_vendors', 'Total Vendors')}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#CA8A04]">
              {vendorsCount}
            </div>
            <Link
              to="/admin/vendors"
              className="text-xs font-semibold text-[#CA8A04] hover:underline inline-flex items-center gap-1 mt-2"
            >
              <span>{isRtl ? 'عرض الموردين' : 'Manage Vendors'}</span>
              {isRtl ? <FiArrowLeft className="w-3 h-3" /> : <FiArrowRight className="w-3 h-3" />}
            </Link>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#CA8A04] flex items-center justify-center text-2xl shadow-xs">
            <FiBriefcase className="w-7 h-7" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between transition hover:shadow-2xl hover:-translate-y-0.5">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              {t('vendor.total_orders', 'Total Orders')}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">
              {ordersCount}
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-[#16A34A] hover:underline inline-flex items-center gap-1 mt-2"
            >
              <span>{isRtl ? 'سجل الطلبات' : 'Order History'}</span>
              {isRtl ? <FiArrowLeft className="w-3 h-3" /> : <FiArrowRight className="w-3 h-3" />}
            </Link>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-xs">
            <FiClipboard className="w-7 h-7" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/30 flex items-center justify-between transition hover:shadow-2xl hover:-translate-y-0.5">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
              {t('admin.total_revenue', 'Total Revenue')}
            </span>
            <div className="text-xl sm:text-2xl font-black text-[#16A34A] truncate max-w-[170px]">
              {formatSdg(totalRevenue)}
            </div>
            <span className="text-[11px] font-bold text-gray-400 block mt-1">
              {t('products.sdg', 'SDG')} • {isRtl ? 'إجمالي المعاملات' : 'GMV'}
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#16A34A] flex items-center justify-center text-2xl shadow-xs">
            <FiDollarSign className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Pending Vendor Verifications & Recent Orders Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Pending Vendor Verifications */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiShield className="w-5 h-5 text-[#EAB308]" />
                  {isRtl ? 'طلبات توثيق الموردين المعلقة' : 'Pending Vendor Verifications'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isRtl ? 'موردون بانتظار الاعتماد الرسمي' : 'New wholesale vendors awaiting approval'}
                </p>
              </div>

              <Link
                to="/admin/vendors?is_verified=false"
                className="text-xs font-bold text-[#16A34A] hover:underline"
              >
                {isRtl ? 'عرض الكل' : 'View All'}
              </Link>
            </div>

            {pendingVendors.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                <FiCheckCircle className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
                <p>{isRtl ? 'لا توجد طلبات توثيق معلقة حالياً' : 'All vendors are verified!'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingVendors.map((v) => (
                  <div key={v.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">
                        {v.business_name}
                        {v.business_name_ar && (
                          <span className="text-xs text-gray-400 font-normal ms-1">
                            ({v.business_name_ar})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span dir="ltr">{v.phone}</span>
                        {v.user?.full_name && <span>• {v.user.full_name}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={verifyingId === v.id}
                      onClick={() => handleVerifyVendor(v.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] active:bg-[#14532D] text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {verifyingId === v.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiCheckCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{t('admin.verify', 'Verify')}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Summary */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiClipboard className="w-5 h-5 text-[#16A34A]" />
                  {isRtl ? 'ملخص أحدث الطلبات' : 'Recent Marketplace Orders'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isRtl ? 'أحدث المعاملات عبر المنصة' : 'Latest B2B grocery orders platform-wide'}
                </p>
              </div>

              <Link
                to="/admin/orders"
                className="text-xs font-bold text-[#16A34A] hover:underline"
              >
                {isRtl ? 'عرض الكل' : 'View All'}
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                <FiClipboard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>{t('orders.no_orders', 'No orders recorded yet')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentOrders.map((order) => (
                  <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono font-bold text-xs text-gray-900">
                        {order.order_number || `#${order.id.slice(0, 8)}`}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {formatDate(order.created_at)} •{' '}
                        <span className="text-gray-600 font-semibold">
                          {order.retailer?.full_name || order.retailer?.name || 'Retailer'}
                        </span>
                      </div>
                    </div>

                    <div className="text-end">
                      <div className="font-black text-xs sm:text-sm text-gray-900">
                        {formatSdg(order.total)} {t('products.sdg', 'SDG')}
                      </div>
                      <div className="mt-0.5">{renderStatusBadge(order.order_status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
