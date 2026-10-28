import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  FiPackage,
  FiChevronDown,
  FiChevronUp,
  FiExternalLink,
  FiClock,
  FiCheckCircle,
  FiTruck,
  FiXCircle,
  FiAlertCircle,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiShoppingBag,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';

const STATUS_CONFIG = {
  pending: {
    bg: 'bg-yellow-50',
    text: 'text-[#CA8A04]',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  confirmed: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
  },
  preparing: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  shipped: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-600',
  },
  delivered: {
    bg: 'bg-green-50',
    text: 'text-[#16A34A]',
    border: 'border-green-200',
    dot: 'bg-[#16A34A]',
  },
  cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-600',
  },
};

export default function Orders() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language?.startsWith('ar');
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/orders');
      return;
    }

    let active = true;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (activeTab !== 'all') {
          params.append('status', activeTab);
        }
        params.append('page', page.toString());
        params.append('per_page', '10');

        const res = await api.get(`/orders?${params.toString()}`);
        const data = res.data?.data || res.data;

        if (active) {
          const list = Array.isArray(data)
            ? data
            : data?.orders || data?.items || [];
          setOrders(list);
          setTotalPages(data?.totalPages || data?.pages || Math.ceil((data?.total || list.length) / 10) || 1);
        }
      } catch (err) {
        console.error('Failed to load orders:', err);
        if (active) {
          setOrders([]);
          setTotalPages(1);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      active = false;
    };
  }, [isAuthenticated, activeTab, page, navigate]);

  const toggleExpand = (orderId) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    const config = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
    const label = t(`orders.${s}`) || s;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}
      >
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span>{label}</span>
      </span>
    );
  };

  const statusTabs = [
    { key: 'all', label: isRtl ? 'جميع الطلبات' : 'All Orders' },
    { key: 'pending', label: t('orders.pending') },
    { key: 'confirmed', label: t('orders.confirmed') },
    { key: 'preparing', label: t('orders.preparing') },
    { key: 'shipped', label: t('orders.shipped') },
    { key: 'delivered', label: t('orders.delivered') },
    { key: 'cancelled', label: t('orders.cancelled') },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {t('orders.title')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {isRtl ? 'متابعة وتتبع طلبيات الجملة الصادرة من متجرك' : 'Manage and track your wholesale order shipments'}
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold transition shadow-xs self-start sm:self-auto"
          >
            <FiShoppingBag className="w-4 h-4" />
            <span>{isRtl ? 'طلب بضاعة جديدة' : 'Place New Order'}</span>
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div className="bg-white rounded-2xl p-1.5 border border-gray-200 shadow-2xs flex overflow-x-auto gap-1 no-scrollbar">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Orders List Container */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 bg-white rounded-3xl animate-pulse border border-gray-100"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 space-y-4">
            <FiPackage className="w-16 h-16 text-gray-300 mx-auto" />
            <h3 className="text-lg font-bold text-gray-800">
              {t('orders.no_orders')}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {isRtl
                ? 'ليس لديك أية طلبيات في هذا التصنيف حالياً. تصفح المتجر وأضف بضائع لسلتك.'
                : 'No orders found matching this filter. Explore our catalog to place your first order.'}
            </p>
            <Link
              to="/shop"
              className="inline-block px-6 py-2.5 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#15803D] transition shadow-xs"
            >
              {t('nav.shop')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderId = order.id || order._id || order.order_number;
              const orderNumber = order.order_number || `#ORD-${String(orderId).slice(-6)}`;
              const isExpanded = expandedOrderId === orderId;
              const items = order.items || [];
              const vendorName =
                order.vendor?.business_name ||
                order.vendor_name ||
                order.items?.[0]?.product?.vendor?.business_name ||
                (isRtl ? 'مورد معتمد' : 'Wholesale Vendor');
              const totalAmount = Number(order.total || order.total_amount || 0);
              const createdAt = order.created_at || order.createdAt || new Date().toISOString();

              return (
                <div
                  key={orderId}
                  className="bg-white rounded-3xl border border-gray-200/80 shadow-xs hover:border-gray-300 transition overflow-hidden"
                >
                  {/* Order Summary Row */}
                  <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-50 text-[#16A34A] flex items-center justify-center font-bold shrink-0">
                        <FiPackage className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 text-sm sm:text-base">
                            {orderNumber}
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <FiCalendar className="w-3.5 h-3.5" />
                            <span>{new Date(createdAt).toLocaleDateString()}</span>
                          </span>
                          <span>•</span>
                          <span className="font-medium text-gray-600">{vendorName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                      <div className="text-start md:text-end">
                        <span className="text-xs text-gray-400 font-semibold block">
                          {t('orders.total')}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg sm:text-xl font-black text-gray-900">
                            {totalAmount.toLocaleString()}
                          </span>
                          <span className="text-xs font-bold text-gray-500">
                            {t('products.sdg')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Inline Expand Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(orderId)}
                          className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <span>{isExpanded ? (isRtl ? 'إخفاء' : 'Hide') : (isRtl ? 'تفاصيل' : 'Items')}</span>
                          {isExpanded ? (
                            <FiChevronUp className="w-4 h-4" />
                          ) : (
                            <FiChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {/* Full View Page Link */}
                        <Link
                          to={`/orders/${orderId}`}
                          className="p-2 text-gray-400 hover:text-[#16A34A] rounded-xl hover:bg-green-50 transition"
                          title={t('orders.details')}
                        >
                          <FiExternalLink className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Inline Expanded Details */}
                  {isExpanded && (
                    <div className="bg-gray-50/70 p-5 sm:p-6 border-t border-gray-100 space-y-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {isRtl ? 'أصناف الطلبية:' : 'Ordered Items:'}
                      </h4>

                      <div className="divide-y divide-gray-200/60 bg-white rounded-2xl border border-gray-200/60 overflow-hidden">
                        {items.length === 0 ? (
                          <div className="p-4 text-xs text-gray-500 text-center">
                            {isRtl ? 'تفاصيل الأصناف غير متوفرة' : 'No item details'}
                          </div>
                        ) : (
                          items.map((item, idx) => {
                            const prod = item.product || item;
                            const prodName = isRtl
                              ? prod.name_ar || prod.name
                              : prod.name || prod.name_en || 'Product';
                            const itemPrice = Number(item.price || prod.price || 0);
                            const itemQty = Number(item.quantity) || 1;

                            return (
                              <div
                                key={idx}
                                className="p-3.5 sm:p-4 flex items-center justify-between text-xs sm:text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs">
                                    {idx + 1}
                                  </span>
                                  <span className="font-bold text-gray-900">{prodName}</span>
                                </div>

                                <div className="flex items-center gap-6">
                                  <span className="text-gray-500">
                                    {itemQty} × {itemPrice.toLocaleString()} {t('products.sdg')}
                                  </span>
                                  <span className="font-extrabold text-gray-900 min-w-[80px] text-end">
                                    {(itemQty * itemPrice).toLocaleString()} {t('products.sdg')}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-gray-500">
                          {isRtl ? 'طريقة الدفع:' : 'Payment:'}{' '}
                          <span className="font-bold text-gray-800">
                            {order.payment_method === 'bankak'
                              ? t('payment.bankak')
                              : order.payment_method === 'wallet'
                              ? t('payment.wallet')
                              : t('payment.cod')}
                          </span>
                        </span>

                        <Link
                          to={`/orders/${orderId}`}
                          className="text-xs font-bold text-[#16A34A] hover:underline flex items-center gap-1"
                        >
                          <span>{t('orders.track')}</span>
                          <FiExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-3xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between mt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              {isRtl ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
              <span>{t('common.previous')}</span>
            </button>

            <span className="text-xs font-bold text-gray-600">
              {t('common.page')} {page} {t('common.of')} {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              <span>{t('common.next')}</span>
              {isRtl ? <FiChevronLeft className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
